const express = require('express');
const router = express.Router();

// Test middleware to verify routes are working
const testMiddleware = (req, res, next) => {
  console.log(`Regions route accessed: ${req.method} ${req.originalUrl}`);
  next();
};

// Apply middleware to all routes in this router
router.use(testMiddleware);

// GET /api/regions/provinces - Get all provinces
router.get('/provinces', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // Sample data for now - replace with database query later
    const sampleProvinces = [
      {
        id: 1,
        code: '11',
        name: 'ACEH',
        level: 1,
        parent_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        code: '12',
        name: 'SUMATERA UTARA',
        level: 1,
        parent_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        code: '13',
        name: 'SUMATERA BARAT',
        level: 1,
        parent_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const total = sampleProvinces.length;
    const data = sampleProvinces.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/province/:code - Get province by code
router.get('/province/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Sample data - replace with database query
    const province = {
      id: 1,
      code: code,
      name: 'ACEH',
      level: 1,
      parent_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!province) {
      return res.status(404).json({
        success: false,
        error: 'Province not found'
      });
    }

    res.json({
      success: true,
      data: province
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/cities/:provinceCode - Get cities by province code
router.get('/cities/:provinceCode', async (req, res, next) => {
  try {
    const { provinceCode } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Sample data - replace with database query
    const sampleCities = [
      {
        id: 1,
        code: `${provinceCode}01`,
        name: 'KABUPATEN ACEH SELATAN',
        level: 2,
        parent_code: provinceCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        code: `${provinceCode}02`,
        name: 'KABUPATEN ACEH TENGGARA',
        level: 2,
        parent_code: provinceCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const total = sampleCities.length;
    const data = sampleCities.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/regions/search - Search regions by name
router.get('/search', async (req, res, next) => {
  try {
    const { q, level, limit = 50, offset = 0 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) parameter is required'
      });
    }

    // Sample search results - replace with database query
    const searchResults = [
      {
        id: 1,
        code: '11',
        name: 'ACEH',
        level: 1,
        parent_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ].filter(item => {
      const matchesQuery = item.name.toLowerCase().includes(q.toLowerCase());
      const matchesLevel = !level || item.level === parseInt(level);
      return matchesQuery && matchesLevel;
    });

    const total = searchResults.length;
    const data = searchResults.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
