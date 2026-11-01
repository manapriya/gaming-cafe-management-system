-- MySQL 8 schema, built from Review 1 DDL + the MySQL DML script (column names follow the DML).
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,            -- bcrypt hash, never plain text
  phone VARCHAR(15),
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_user_role CHECK (role IN ('Customer','Staff','Admin')),
  CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%._%')
);
CREATE TABLE staff (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  designation VARCHAR(100) NOT NULL, phone VARCHAR(15), hire_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chk_staff_status CHECK (status IN ('Active','Inactive'))
);
CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL, phone VARCHAR(15) UNIQUE, address TEXT, date_of_birth DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chk_cust_phone CHECK (phone IS NULL OR phone REGEXP '^[0-9]{10}$')
);
CREATE TABLE membership_plans (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(50) NOT NULL UNIQUE,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  validity_days INT NOT NULL, price DECIMAL(10,2) NOT NULL, description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_discount CHECK (discount_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_validity CHECK (validity_days > 0),
  CONSTRAINT chk_plan_price CHECK (price >= 0)
);
CREATE TABLE memberships (
  membership_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL, plan_id INT NOT NULL,
  start_date DATE NOT NULL, end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_membership_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_plan FOREIGN KEY (plan_id) REFERENCES membership_plans(plan_id) ON DELETE RESTRICT,
  CONSTRAINT chk_membership_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_membership_status CHECK (status IN ('Active','Expired','Cancelled','Paused'))
);
CREATE TABLE pc_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL UNIQUE,
  base_rate_per_hour DECIMAL(10,2) NOT NULL, description TEXT,
  CONSTRAINT chk_category_rate CHECK (base_rate_per_hour >= 0)
);
CREATE TABLE gaming_pcs (
  pc_id INT AUTO_INCREMENT PRIMARY KEY,
  pc_number VARCHAR(20) NOT NULL UNIQUE, category_id INT NOT NULL,
  processor VARCHAR(100) NOT NULL, gpu VARCHAR(100) NOT NULL,
  ram_gb INT NOT NULL, storage_gb INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Available',
  purchase_date DATE, notes TEXT, last_maintenance_date DATE,
  CONSTRAINT fk_pc_category FOREIGN KEY (category_id) REFERENCES pc_categories(category_id) ON DELETE RESTRICT,
  CONSTRAINT chk_pc_specs CHECK (ram_gb > 0 AND storage_gb > 0),
  CONSTRAINT chk_pc_status CHECK (status IN ('Available','In Use','Reserved','Maintenance','Offline'))
);
CREATE TABLE games (
  game_id INT AUTO_INCREMENT PRIMARY KEY,
  game_name VARCHAR(120) NOT NULL UNIQUE, genre VARCHAR(50), publisher VARCHAR(100),
  min_cpu VARCHAR(100), min_gpu VARCHAR(100), min_ram_gb INT, storage_required_gb INT, description TEXT,
  CONSTRAINT chk_game_ram CHECK (min_ram_gb IS NULL OR min_ram_gb > 0),
  CONSTRAINT chk_game_storage CHECK (storage_required_gb IS NULL OR storage_required_gb > 0)
);
CREATE TABLE pc_games (
  pc_id INT NOT NULL, game_id INT NOT NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, version VARCHAR(50),
  PRIMARY KEY (pc_id, game_id),
  CONSTRAINT fk_pc_games_pc FOREIGN KEY (pc_id) REFERENCES gaming_pcs(pc_id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_games_game FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);
CREATE TABLE demand_pricing (
  demand_rule_id INT AUTO_INCREMENT PRIMARY KEY,
  min_utilization_percent DECIMAL(5,2) NOT NULL, max_utilization_percent DECIMAL(5,2) NOT NULL,
  demand_multiplier DECIMAL(5,2) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_min_util CHECK (min_utilization_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_max_util CHECK (max_utilization_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_util_range CHECK (max_utilization_percent > min_utilization_percent),
  CONSTRAINT chk_demand_mult CHECK (demand_multiplier > 0)
);
CREATE TABLE pricing_rules (
  pricing_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL, demand_rule_id INT NULL,
  day_type VARCHAR(20) NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL, time_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  active BOOLEAN NOT NULL DEFAULT TRUE, priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pricing_category FOREIGN KEY (category_id) REFERENCES pc_categories(category_id) ON DELETE CASCADE,
  CONSTRAINT fk_pricing_demand FOREIGN KEY (demand_rule_id) REFERENCES demand_pricing(demand_rule_id) ON DELETE SET NULL,
  CONSTRAINT chk_day_type CHECK (day_type IN ('Weekday','Weekend','Holiday')),
  CONSTRAINT chk_pricing_time CHECK (end_time > start_time),
  CONSTRAINT chk_base_rate CHECK (base_rate >= 0),
  CONSTRAINT chk_time_mult CHECK (time_multiplier > 0),
  CONSTRAINT chk_priority CHECK (priority > 0)
);
CREATE TABLE reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL, pc_id INT NOT NULL,
  start_time DATETIME NOT NULL, end_time DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_res_pc FOREIGN KEY (pc_id) REFERENCES gaming_pcs(pc_id) ON DELETE RESTRICT,
  CONSTRAINT chk_res_time CHECK (end_time > start_time),
  CONSTRAINT chk_res_status CHECK (status IN ('Pending','Confirmed','Cancelled','No-Show','Completed'))
);
CREATE TABLE gaming_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT UNIQUE, customer_id INT NOT NULL, pc_id INT NOT NULL, pricing_rule_id INT,
  start_time DATETIME NOT NULL, end_time DATETIME, duration_minutes INT,
  base_amount DECIMAL(10,2) NOT NULL DEFAULT 0, discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sess_res FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE SET NULL,
  CONSTRAINT fk_sess_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT,
  CONSTRAINT fk_sess_pc FOREIGN KEY (pc_id) REFERENCES gaming_pcs(pc_id) ON DELETE RESTRICT,
  CONSTRAINT fk_sess_pricing FOREIGN KEY (pricing_rule_id) REFERENCES pricing_rules(pricing_id) ON DELETE SET NULL,
  CONSTRAINT chk_sess_time CHECK (end_time IS NULL OR end_time > start_time),
  CONSTRAINT chk_sess_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  CONSTRAINT chk_sess_amounts CHECK (discount_amount <= base_amount AND final_amount = base_amount - discount_amount),
  CONSTRAINT chk_sess_status CHECK (status IN ('Active','Completed','Cancelled'))
);
CREATE TABLE invoices (
  invoice_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE, invoice_no VARCHAR(30) NOT NULL UNIQUE,
  invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(10,2) NOT NULL, tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0, total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
  CONSTRAINT fk_invoice_session FOREIGN KEY (session_id) REFERENCES gaming_sessions(session_id) ON DELETE RESTRICT,
  CONSTRAINT chk_inv_amounts CHECK (total_amount = amount + tax_amount),
  CONSTRAINT chk_invoice_status CHECK (status IN ('Unpaid','Paid','Partially Paid'))
);
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL, payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount_paid DECIMAL(10,2) NOT NULL, payment_mode VARCHAR(20) NOT NULL,
  transaction_ref VARCHAR(100), status VARCHAR(20) NOT NULL DEFAULT 'Success',
  CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  CONSTRAINT chk_payment_amount CHECK (amount_paid > 0),
  CONSTRAINT chk_payment_mode CHECK (payment_mode IN ('Cash','Card','UPI','Wallet')),
  CONSTRAINT chk_payment_status CHECK (status IN ('Success','Failed','Refunded'))
);
CREATE TABLE maintenance_records (
  maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
  pc_id INT NOT NULL, staff_id INT, issue_description TEXT NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL, end_date DATE, cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Ongoing', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_maint_pc FOREIGN KEY (pc_id) REFERENCES gaming_pcs(pc_id) ON DELETE CASCADE,
  CONSTRAINT fk_maint_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL,
  CONSTRAINT chk_maint_type CHECK (maintenance_type IN ('Repair','Upgrade','Routine','Other','Software','Hardware','Cleaning')),
  CONSTRAINT chk_maint_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_maint_cost CHECK (cost >= 0),
  CONSTRAINT chk_maint_status CHECK (status IN ('Ongoing','Completed','Cancelled'))
);
