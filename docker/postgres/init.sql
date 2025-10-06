-- Create development database if not exists
SELECT 'CREATE DATABASE indonesia_regions_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'indonesia_regions_dev')\gexec

-- Connect to the database
\c indonesia_regions_dev;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enhanced regions table for Indonesian administrative data
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level SMALLINT NOT NULL, -- 1=Province, 2=Regency/City, 3=District, 4=Village
    parent_code VARCHAR(20),
    type VARCHAR(20), -- 'province', 'regency', 'city', 'district', 'village', 'urban_village'
    
    -- Additional metadata from 2025 Kepmendagri data
    area_km2 DECIMAL(12,3),
    population INTEGER,
    islands_count INTEGER,
    postal_codes TEXT[], -- Array of postal codes
    
    -- Geographic coordinates (your existing fields)
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    
    -- Additional metadata (your existing field)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Source tracking
    source_updated_at DATE,
    kepmendagri_reference VARCHAR(100) DEFAULT 'No 300.2.2-2138 Tahun 2025'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_parent_code ON regions(parent_code);
CREATE INDEX IF NOT EXISTS idx_regions_level ON regions(level);
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_name_gin ON regions USING gin(to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_regions_level_parent ON regions(level, parent_code);
CREATE INDEX IF NOT EXISTS idx_regions_metadata ON regions USING gin(metadata);

-- Create partial indexes for each level (for faster queries)
CREATE INDEX IF NOT EXISTS idx_regions_provinces ON regions(code) WHERE level = 1;
CREATE INDEX IF NOT EXISTS idx_regions_regencies ON regions(code, parent_code) WHERE level = 2;
CREATE INDEX IF NOT EXISTS idx_regions_districts ON regions(code, parent_code) WHERE level = 3;
CREATE INDEX IF NOT EXISTS idx_regions_villages ON regions(code, parent_code) WHERE level = 4;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_regions_updated_at 
    BEFORE UPDATE ON regions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint (commented out initially to allow migration)
-- Uncomment after migration is complete
-- ALTER TABLE regions 
-- ADD CONSTRAINT fk_regions_parent 
-- FOREIGN KEY (parent_code) REFERENCES regions(code) ON DELETE CASCADE;

-- Check constraints
ALTER TABLE regions ADD CONSTRAINT check_level 
    CHECK (level >= 1 AND level <= 4);

ALTER TABLE regions ADD CONSTRAINT check_type 
    CHECK (type IN ('province', 'regency', 'city', 'district', 'village', 'urban_village'));

-- Statistics table for performance tracking
CREATE TABLE IF NOT EXISTS migration_stats (
    id SERIAL PRIMARY KEY,
    level INTEGER,
    total_records INTEGER,
    successful_inserts INTEGER,
    failed_inserts INTEGER,
    migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_api VARCHAR(100),
    notes TEXT
);

-- Create indexes for migration_stats
CREATE INDEX IF NOT EXISTS idx_migration_stats_level ON migration_stats(level);
CREATE INDEX IF NOT EXISTS idx_migration_stats_date ON migration_stats(migration_date);

-- Create a view for easy region hierarchy queries
CREATE OR REPLACE VIEW region_hierarchy AS
WITH RECURSIVE hierarchy AS (
    -- Base case: provinces (level 1)
    SELECT 
        id, code, name, level, parent_code, type,
        name as province_name,
        NULL::varchar as regency_name,
        NULL::varchar as district_name,
        NULL::varchar as village_name,
        ARRAY[name] as hierarchy_path,
        1 as depth
    FROM regions 
    WHERE level = 1
    
    UNION ALL
    
    -- Recursive case: build hierarchy
    SELECT 
        r.id, r.code, r.name, r.level, r.parent_code, r.type,
        h.province_name,
        CASE WHEN r.level = 2 THEN r.name ELSE h.regency_name END,
        CASE WHEN r.level = 3 THEN r.name ELSE h.district_name END,
        CASE WHEN r.level = 4 THEN r.name ELSE h.village_name END,
        h.hierarchy_path || r.name,
        h.depth + 1
    FROM regions r
    INNER JOIN hierarchy h ON r.parent_code = h.code
)
SELECT * FROM hierarchy;

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Create function to get region statistics
CREATE OR REPLACE FUNCTION get_region_stats()
RETURNS TABLE(
    level_name text,
    count bigint,
    first_created timestamp,
    last_updated timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE r.level 
            WHEN 1 THEN 'Provinces'
            WHEN 2 THEN 'Regencies/Cities'
            WHEN 3 THEN 'Districts'
            WHEN 4 THEN 'Villages'
            ELSE 'Unknown'
        END as level_name,
        COUNT(*) as count,
        MIN(r.created_at) as first_created,
        MAX(r.updated_at) as last_updated
    FROM regions r
    GROUP BY r.level
    ORDER BY r.level;
END;
$$ LANGUAGE plpgsql;

-- Insert initial system info
INSERT INTO migration_stats (level, total_records, successful_inserts, failed_inserts, source_api, notes)
VALUES (0, 0, 0, 0, 'system', 'Database schema initialized')
ON CONFLICT DO NOTHING;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Indonesia Regions database schema created successfully!';
    RAISE NOTICE '📊 Tables created: regions, migration_stats';
    RAISE NOTICE '🔍 Views created: region_hierarchy';
    RAISE NOTICE '⚡ Functions created: get_region_stats()';
    RAISE NOTICE '🚀 Ready for migration!';
END $$;
