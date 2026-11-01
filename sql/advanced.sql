-- Run after routines.sql
CREATE INDEX idx_sessions_time ON gaming_sessions (start_time, end_time);
CREATE INDEX idx_sessions_customer ON gaming_sessions (customer_id);
CREATE INDEX idx_pricing_lookup ON pricing_rules (category_id, day_type, active);
CREATE INDEX idx_res_pc_time ON reservations (pc_id, start_time, end_time);
ALTER TABLE games ADD FULLTEXT INDEX ft_games (game_name, genre, publisher);
