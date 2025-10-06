-- Enhanced regions table for Indonesian administrative data
DROP TABLE IF EXISTS regions CASCADE;

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level SMALLINT NOT NULL, -- 1=Province, 2=Regency/City, 3=District, 4=Village
    parent_code VARCHAR(20),
    type VARCHAR(20), -- 'province', 'regency', 'city', 'district', 'village', 'urban_village'
    
    -- Additional metadata from 2025 data
    area_km2 DECIMAL(12,3),
    population INTEGER,
    islands_count INTEGER,
    postal_codes TEXT[], -- Array of postal codes
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Source tracking
    source_updated_at DATE,
    kepmendagri_reference VARCHAR(100) DEFAULT 'No 300.2.2-2138 Tahun 2025'
);

-- Create indexes for performance
CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_parent_code ON regions(parent_code);
CREATE INDEX idx_regions_level ON regions(level);
CREATE INDEX idx_regions_type ON regions(type);
CREATE INDEX idx_regions_name_gin ON regions USING gin(to_tsvector('indonesian', name));
CREATE INDEX idx_regions_level_parent ON regions(level, parent_code);

-- Create partial indexes for each level
CREATE INDEX idx_regions_provinces ON regions(code) WHERE level = 1;
CREATE INDEX idx_regions_regencies ON regions(code, parent_code) WHERE level = 2;
CREATE INDEX idx_regions_districts ON regions(code, parent_code) WHERE level = 3;
CREATE INDEX idx_regions_villages ON regions(code, parent_code) WHERE level = 4;

-- Updated at trigger
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

-- Foreign key constraint
ALTER TABLE regions 
ADD CONSTRAINT fk_regions_parent 
FOREIGN KEY (parent_code) REFERENCES regions(code) ON DELETE CASCADE;

-- Check constraints
ALTER TABLE regions ADD CONSTRAINT check_level 
    CHECK (level >= 1 AND level <= 4);

ALTER TABLE regions ADD CONSTRAINT check_type 
    CHECK (type IN ('province', 'regency', 'city', 'district', 'village', 'urban_village'));

-- Statistics table for performance tracking
CREATE TABLE migration_stats (
    id SERIAL PRIMARY KEY,
    level INTEGER,
    total_records INTEGER,
    successful_inserts INTEGER,
    failed_inserts INTEGER,
    migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_api VARCHAR(100),
    notes TEXT
);
