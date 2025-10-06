const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Helper function for database queries
const queryDatabase = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// GET /api/regions/provinces - Get all provinces
router.get('/provinces', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, sort = 'code' } = req.query;
    
    const query = `
      SELECT id, code, name, level, type, area_km2, population, islands_count,
             created_at, updated_at, source_updated_at
      FROM regions 
      WHERE level = 1 
      ORDER BY ${sort === 'name' ? 'name' : 'code'} 
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = 'SELECT COUNT(*) FROM regions WHERE level = 1';
    
    const [provinces, countResult] = await Promise.all([
      queryDatabase(query, [parseInt(limit), parseInt(offset)]),
      queryDatabase(countQuery)
    ]);
    
    const total = parseInt(countResult[0].count);

    res.json({
      success: true,
      data: provinces,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      meta: {
        source: 'Kepmendagri No 300.2.2-2138 Tahun 2025',
        last_updated: provinces[0]?.source_updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/regencies/:provinceCode - Get regencies by province
router.get('/regencies/:provinceCode', async (req, res, next) => {
  try {
    const { provinceCode } = req.params;
    const { limit = 50, offset = 0, type } = req.query;
    
    let query = `
      SELECT id, code, name, level, type, parent_code,
             created_at, updated_at
      FROM regions 
      WHERE level = 2 AND parent_code = $1
    `;
    const params = [provinceCode];
    
    if (type && ['regency', 'city'].includes(type)) {
      query += ' AND type = $2';
      params.push(type);
    }
    
    query += ` ORDER BY code LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const regencies = await queryDatabase(query, params);

    res.json({
      success: true,
      data: regencies,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: regencies.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/districts/:regencyCode - Get districts by regency
router.get('/districts/:regencyCode', async (req, res, next) => {
  try {
    const { regencyCode } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT id, code, name, level, type, parent_code,
             created_at, updated_at
      FROM regions 
      WHERE level = 3 AND parent_code = $1
      ORDER BY code 
      LIMIT $2 OFFSET $3
    `;
    
    const districts = await queryDatabase(query, [regencyCode, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: districts,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: districts.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/villages/:districtCode - Get villages by district
router.get('/villages/:districtCode', async (req, res, next) => {
  try {
    const { districtCode } = req.params;
    const { limit = 50, offset = 0, type } = req.query;
    
    let query = `
      SELECT id, code, name, level, type, parent_code,
             created_at, updated_at
      FROM regions 
      WHERE level = 4 AND parent_code = $1
    `;
    const params = [districtCode];
    
    if (type && ['village', 'urban_village'].includes(type)) {
      query += ' AND type = $2';
      params.push(type);
    }
    
    query += ` ORDER BY code LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const villages = await queryDatabase(query, params);

    res.json({
      success: true,
      data: villages,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: villages.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/search - Search regions
router.get('/search', async (req, res, next) => {
  try {
    const { q, level, type, limit = 50, offset = 0 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) parameter is required'
      });
    }

    let query = `
      SELECT id, code, name, level, type, parent_code,
             created_at, updated_at
      FROM regions 
      WHERE to_tsvector('indonesian', name) @@ plainto_tsquery('indonesian', $1)
    `;
    const params = [q];
    
    if (level) {
      query += ` AND level = $${params.length + 1}`;
      params.push(parseInt(level));
    }
    
    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }
    
    query += ` ORDER BY 
      ts_rank(to_tsvector('indonesian', name), plainto_tsquery('indonesian', $1)) DESC,
      level ASC, code ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit), parseInt(offset));
    
    const results = await queryDatabase(query, params);

    res.json({
      success: true,
      data: results,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total: results.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/hierarchy/:code - Get region with full hierarchy
router.get('/hierarchy/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    
    const query = `
      WITH RECURSIVE region_hierarchy AS (
        -- Base case: the requested region
        SELECT id, code, name, level, type, parent_code, 0 as depth
        FROM regions 
        WHERE code = $1
        
        UNION ALL
        
        -- Recursive case: find parent regions
        SELECT r.id, r.code, r.name, r.level, r.type, r.parent_code, rh.depth + 1
        FROM regions r
        INNER JOIN region_hierarchy rh ON r.code = rh.parent_code
      )
      SELECT * FROM region_hierarchy
      ORDER BY level ASC
    `;
    
    const hierarchy = await queryDatabase(query, [code]);
    
    if (hierarchy.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Region not found'
      });
    }

    res.json({
      success: true,
      data: {
        region: hierarchy[0],
        hierarchy: hierarchy.reverse()
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/stats - Get migration statistics
router.get('/stats', async (req, res, next) => {
  try {
    const statsQuery = `
      SELECT 
        level,
        COUNT(*) as count,
        MIN(created_at) as first_created,
        MAX(updated_at) as last_updated
      FROM regions 
      GROUP BY level 
      ORDER BY level
    `;
    
    const migrationStatsQuery = `
      SELECT * FROM migration_stats 
      ORDER BY migration_date DESC 
      LIMIT 5
    `;
    
    const [regionStats, migrationStats] = await Promise.all([
      queryDatabase(statsQuery),
      queryDatabase(migrationStatsQuery)
    ]);
    
    const levelNames = { 1: 'provinces', 2: 'regencies', 3: 'districts', 4: 'villages' };
    const formattedStats = regionStats.reduce((acc, stat) => {
      acc[levelNames[stat.level]] = {
        count: parseInt(stat.count),
        first_created: stat.first_created,
        last_updated: stat.last_updated
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        region_counts: formattedStats,
        migration_history: migrationStats,
        total_regions: regionStats.reduce((sum, stat) => sum + parseInt(stat.count), 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
