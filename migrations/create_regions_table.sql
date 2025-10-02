-- Create regions table with hierarchical structure
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level SMALLINT NOT NULL, -- 1=Province, 2=City/Regency, 3=District, 4=Village
    parent_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_parent_code ON regions(parent_code);
CREATE INDEX idx_regions_level ON regions(level);
CREATE INDEX idx_regions_name ON regions USING gin(to_tsvector('indonesian', name));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE
    ON regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint
ALTER TABLE regions ADD CONSTRAINT fk_regions_parent 
    FOREIGN KEY (parent_code) REFERENCES regions(code) ON DELETE CASCADE;
