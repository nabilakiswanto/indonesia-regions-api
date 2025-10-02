-- Sample Indonesian regions data
INSERT INTO regions (code, name, level, parent_code) VALUES
('11', 'ACEH', 1, NULL),
('12', 'SUMATERA UTARA', 1, NULL),
('13', 'SUMATERA BARAT', 1, NULL)
ON CONFLICT (code) DO NOTHING;
