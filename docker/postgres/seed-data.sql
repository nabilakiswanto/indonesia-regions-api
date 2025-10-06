INSERT INTO regions (
    code, name, level, parent_code, type,
    area_km2, population, islands_count,
    source_updated_at, kepmendagri_reference
) VALUES
-- Aceh Province
('11', 'ACEH', 1, NULL, 'province', 
 56835.019, 5623479, 365, 
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),

-- Sumatera Utara Province  
('12', 'SUMATERA UTARA', 1, NULL, 'province',
 72437.755, 15640905, 228,
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),

-- Sulawesi Utara Province (for testing)
('71', 'SULAWESI UTARA', 1, NULL, 'province',
 14488.429, 2645291, 382,
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    area_km2 = EXCLUDED.area_km2,
    population = EXCLUDED.population,
    islands_count = EXCLUDED.islands_count,
    source_updated_at = EXCLUDED.source_updated_at,
    updated_at = CURRENT_TIMESTAMP;

-- Insert sample regencies/cities
INSERT INTO regions (
    code, name, level, parent_code, type,
    source_updated_at, kepmendagri_reference
) VALUES
-- Aceh regencies
('1101', 'KABUPATEN ACEH SELATAN', 2, '11', 'regency',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('1102', 'KABUPATEN ACEH TENGGARA', 2, '11', 'regency',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('1171', 'KOTA BANDA ACEH', 2, '11', 'city',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),

-- Sumatera Utara regencies
('1201', 'KABUPATEN NIAS', 2, '12', 'regency',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('1271', 'KOTA MEDAN', 2, '12', 'city',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),

-- Sulawesi Utara regencies  
('7101', 'KABUPATEN BOLAANG MONGONDOW', 2, '71', 'regency',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('7171', 'KOTA MANADO', 2, '71', 'city',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent_code = EXCLUDED.parent_code,
    source_updated_at = EXCLUDED.source_updated_at,
    updated_at = CURRENT_TIMESTAMP;

-- Insert sample districts
INSERT INTO regions (
    code, name, level, parent_code, type,
    source_updated_at, kepmendagri_reference
) VALUES
-- Aceh Selatan districts
('110101', 'KECAMATAN TRUMON', 3, '1101', 'district',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('110102', 'KECAMATAN TRUMON TIMUR', 3, '1101', 'district',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),

-- Manado districts
('717101', 'KECAMATAN MALALAYANG', 3, '7171', 'district',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('717102', 'KECAMATAN SARIO', 3, '7171', 'district',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent_code = EXCLUDED.parent_code,
    source_updated_at = EXCLUDED.source_updated_at,
    updated_at = CURRENT_TIMESTAMP;

-- Insert sample villages
INSERT INTO regions (
    code, name, level, parent_code, type,
    source_updated_at, kepmendagri_reference
) VALUES
-- Trumon villages
('1101011001', 'DESA KRUENG KLUET', 4, '110101', 'village',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('1101011002', 'DESA PAYA DAPUR', 4, '110101', 'village',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),

-- Malalayang villages
('7171011001', 'KELURAHAN MALALAYANG SATU', 4, '717101', 'urban_village',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025'),
('7171011002', 'KELURAHAN MALALAYANG DUA', 4, '717101', 'urban_village',
 '2025-01-01', 'No 300.2.2-2138 Tahun 2025')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent_code = EXCLUDED.parent_code,
    source_updated_at = EXCLUDED.source_updated_at,
    updated_at = CURRENT_TIMESTAMP;

-- Update migration stats
INSERT INTO migration_stats (level, total_records, successful_inserts, failed_inserts, source_api, notes)
VALUES 
(1, 3, 3, 0, 'seed-data', 'Sample provinces seeded'),
(2, 7, 7, 0, 'seed-data', 'Sample regencies/cities seeded'),
(3, 4, 4, 0, 'seed-data', 'Sample districts seeded'),
(4, 4, 4, 0, 'seed-data', 'Sample villages seeded')
ON CONFLICT DO NOTHING;

-- Display seeding summary
DO $$
DECLARE
    province_count INTEGER;
    regency_count INTEGER;
    district_count INTEGER;
    village_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO province_count FROM regions WHERE level = 1;
    SELECT COUNT(*) INTO regency_count FROM regions WHERE level = 2;
    SELECT COUNT(*) INTO district_count FROM regions WHERE level = 3;
    SELECT COUNT(*) INTO village_count FROM regions WHERE level = 4;
    
    RAISE NOTICE '🌱 Sample data seeded successfully!';
    RAISE NOTICE '📊 Seeded data summary:';
    RAISE NOTICE '   - Provinces: % records', province_count;
    RAISE NOTICE '   - Regencies/Cities: % records', regency_count;
    RAISE NOTICE '   - Districts: % records', district_count;
    RAISE NOTICE '   - Villages: % records', village_count;
    RAISE NOTICE '🚀 Ready to test API endpoints!';
END $$;
