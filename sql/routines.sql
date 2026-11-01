-- Run after schema.sql. View, stored procedure, triggers.
CREATE VIEW session_billing_details AS
SELECT s.session_id, c.name AS customer_name, p.pc_number, cat.category_name, s.duration_minutes,
       s.final_amount, i.invoice_no, i.total_amount, i.status AS invoice_status, s.status AS session_status
FROM gaming_sessions s
JOIN customers c ON s.customer_id = c.customer_id
JOIN gaming_pcs p ON s.pc_id = p.pc_id
JOIN pc_categories cat ON p.category_id = cat.category_id
LEFT JOIN invoices i ON i.session_id = s.session_id;

DELIMITER //
CREATE PROCEDURE GetCustomerSessions(IN cid INT)
BEGIN
  SELECT s.session_id, p.pc_number, s.start_time, s.duration_minutes, s.final_amount, s.status
  FROM gaming_sessions s JOIN gaming_pcs p ON p.pc_id = s.pc_id
  WHERE s.customer_id = cid ORDER BY s.start_time;
END //

CREATE TRIGGER trg_reservation_no_overlap BEFORE INSERT ON reservations FOR EACH ROW
BEGIN
  IF NEW.status IN ('Pending','Confirmed') AND EXISTS (
    SELECT 1 FROM reservations WHERE pc_id = NEW.pc_id AND status IN ('Pending','Confirmed')
      AND NEW.start_time < end_time AND NEW.end_time > start_time) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PC already reserved for that time slot';
  END IF;
END //

CREATE TRIGGER check_payment_not_exceeding_invoice BEFORE INSERT ON payments FOR EACH ROW
BEGIN
  DECLARE paid_so_far DECIMAL(10,2); DECLARE invoice_total DECIMAL(10,2);
  IF NEW.status = 'Success' THEN
    SELECT total_amount INTO invoice_total FROM invoices WHERE invoice_id = NEW.invoice_id;
    SELECT COALESCE(SUM(amount_paid),0) INTO paid_so_far FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'Success';
    IF paid_so_far + NEW.amount_paid > invoice_total THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment exceeds invoice balance';
    END IF;
  END IF;
END //

CREATE TRIGGER trg_payment_update_invoice AFTER INSERT ON payments FOR EACH ROW
BEGIN
  DECLARE paid DECIMAL(10,2); DECLARE total DECIMAL(10,2);
  IF NEW.status = 'Success' THEN
    SELECT COALESCE(SUM(amount_paid),0) INTO paid FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'Success';
    SELECT total_amount INTO total FROM invoices WHERE invoice_id = NEW.invoice_id;
    UPDATE invoices SET status = IF(paid >= total, 'Paid', 'Partially Paid') WHERE invoice_id = NEW.invoice_id;
  END IF;
END //
DELIMITER ;
