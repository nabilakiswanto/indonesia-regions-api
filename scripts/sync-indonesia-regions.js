#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Multiple API sources for comprehensive data coverage
const API_SOURCES = {
  wilayah_id: {
    name: 'Wilayah.id',
    provinces: 'https://wilayah.id/api/provinces.json',
    regencies: (provinceId) => `https://wilayah.id/api/regencies/${provinceId}.json`,
    districts: (regencyId) => `https://wilayah.id/api/districts/${regencyId}.json`,
    villages: (districtId) => `https://wilayah.id/api/villages/${districtId}.json`
  },
  emsifa: {
    name: 'Emsifa GitHub',
    provinces: 'https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json',
    regencies: (provinceId) => `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provinceId}.json`,
    districts: (regencyId) => `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${regencyId}.json`,
    villages: (districtId) => `https://emsifa.github.io/api-wilayah-indonesia/api/villages/${districtId}.json`
  }
};

// Official 2025 provinces data with complete metadata
const PROVINCES_2025_DATA = {
  '11': { name: 'ACEH', area_km2: 56835.019, population: 5623479, islands: 365 },
  '12': { name: 'SUMATERA UTARA', area_km2: 72437.755, population: 15640905, islands: 228 },
  '13': { name: 'SUMATERA BARAT', area_km2: 42107.674, population: 5820359, islands: 219 },
  '14': { name: 'RIAU', area_km2: 89900.780, population: 7099297, islands: 144 },
  '15': { name: 'JAMBI', area_km2: 49023.037, population: 3834439, islands: 14 },
  '16': { name: 'SUMATERA SELATAN', area_km2: 86771.918, population: 9064690, islands: 24 },
  '17': { name: 'BENGKULU', area_km2: 20122.210, population: 2127957, islands: 9 },
  '18': { name: 'LAMPUNG', area_km2: 33570.758, population: 9144263, islands: 172 },
  '19': { name: 'KEPULAUAN BANGKA BELITUNG', area_km2: 16670.225, population: 1549562, islands: 501 },
  '21': { name: 'KEPULAUAN RIAU', area_km2: 8170.375, population: 2271890, islands: 2028 },
  '31': { name: 'DKI JAKARTA', area_km2: 661.530, population: 11038216, islands: 113 },
  '32': { name: 'JAWA BARAT', area_km2: 37053.331, population: 51316378, islands: 30 },
  '33': { name: 'JAWA TENGAH', area_km2: 34347.428, population: 38430645, islands: 71 },
  '34': { name: 'DI YOGYAKARTA', area_km2: 3170.363, population: 3743365, islands: 37 },
  '35': { name: 'JAWA TIMUR', area_km2: 48055.876, population: 41919906, islands: 538 },
  '36': { name: 'BANTEN', area_km2: 9355.763, population: 12881374, islands: 80 },
  '51': { name: 'BALI', area_km2: 5582.827, population: 4375263, islands: 41 },
  '52': { name: 'NUSA TENGGARA BARAT', area_km2: 19631.991, population: 5751295, islands: 430 },
  '53': { name: 'NUSA TENGGARA TIMUR', area_km2: 46378.105, population: 5700772, islands: 653 },
  '61': { name: 'KALIMANTAN BARAT', area_km2: 147018.063, population: 5646268, islands: 260 },
  '62': { name: 'KALIMANTAN TENGAH', area_km2: 153430.363, population: 2825290, islands: 71 },
  '63': { name: 'KALIMANTAN SELATAN', area_km2: 37125.426, population: 4305281, islands: 165 },
  '64': { name: 'KALIMANTAN TIMUR', area_km2: 126951.758, population: 4123303, islands: 244 },
  '65': { name: 'KALIMANTAN UTARA', area_km2: 69900.886, population: 770627, islands: 196 },
  '71': { name: 'SULAWESI UTARA', area_km2: 14488.429, population: 2645291, islands: 382 },
  '72': { name: 'SULAWESI TENGAH', area_km2: 61496.983, population: 3219494, islands: 1600 },
  '73': { name: 'SULAWESI SELATAN', area_km2: 45323.975, population: 9528276, islands: 394 },
  '74': { name: 'SULAWESI TENGGARA', area_km2: 36139.303, population: 2824589, islands: 591 },
  '75': { name: 'GORONTALO', area_km2: 12024.982, population: 1250960, islands: 127 },
  '76': { name: 'SULAWESI BARAT', area_km2: 16590.667, population: 1466741, islands: 69 },
  '81': { name: 'MALUKU', area_km2: 46133.832, population: 1935586, islands: 1422 },
  '82': { name: 'MALUKU UTARA', area_km2: 31465.977, population: 1394231, islands: 975 },
  '91': { name: 'PAPUA', area_km2: 81383.315, population: 1102360, islands: 544 },
  '92': { name: 'PAPUA BARAT', area_km2: 60308.590, population: 576255, islands: 1498 },
  '93': { name: 'PAPUA SELATAN', area_km2: 117858.969, population: 562220, islands: 7 },
  '94': { name: 'PAPUA TENGAH', area_km2: 61079.587, population: 1369112, islands: 50 },
  '95': { name: 'PAPUA PEGUNUNGAN', area_km2: 52508.656, population: 1470518, islands: 0 },
  '96': { name: 'PAPUA BARAT DAYA', area_km2: 39103.058, population: 623186, islands: 3082 }
};

class IncrementalRegionsMigrator {
  constructor() {
    this.client = null;
    this.stats = {
      provinces: { existing: 0, new: 0, updated: 0, failed: 0 },
      regencies: { existing: 0, new: 0, updated: 0, failed: 0 },
      districts: { existing: 0, new: 0, updated: 0, failed: 0 },
      villages: { existing: 0, new: 0, updated: 0, failed: 0 }
    };
    this.existingData = {
      provinces: new Map(),
      regencies: new Map(),
      districts: new Map(),
      villages: new Map()
    };
    this.logFile = path.join(__dirname, '..', 'logs', `incremental-migration-${Date.now()}.log`);
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      const logsDir = path.dirname(this.logFile);
      await fs.mkdir(logsDir, { recursive: true });
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  async initDatabase() {
    try {
      this.client = await pool.connect();
      await this.log('Database connected successfully');
      
      // Load existing data into memory for fast lookup
      await this.loadExistingData();
      
    } catch (error) {
      await this.log(`Database initialization failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async loadExistingData() {
    try {
      await this.log('Loading existing data from database...');
      
      const query = `
        SELECT code, name, level, parent_code, type, 
               area_km2, population, islands_count,
               created_at, updated_at, source_updated_at
        FROM regions 
        ORDER BY level, code
      `;
      
      const result = await this.client.query(query);
      
      // Organize data by level for fast lookup
      result.rows.forEach(row => {
        const key = row.level === 1 ? 'provinces' :
                   row.level === 2 ? 'regencies' :
                   row.level === 3 ? 'districts' : 'villages';
        
        this.existingData[key].set(row.code, row);
      });
      
      await this.log(`Loaded existing data: ${result.rows.length} total records`);
      await this.log(`  - Provinces: ${this.existingData.provinces.size}`);
      await this.log(`  - Regencies: ${this.existingData.regencies.size}`);
      await this.log(`  - Districts: ${this.existingData.districts.size}`);
      await this.log(`  - Villages: ${this.existingData.villages.size}`);
      
    } catch (error) {
      await this.log(`Failed to load existing data: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async fetchFromMultipleSources(endpoints) {
    let data = null;
    let successfulSource = null;
    
    for (const [sourceName, source] of Object.entries(API_SOURCES)) {
      try {
        const url = typeof endpoints === 'function' ? endpoints(source) : source[endpoints];
        if (!url) continue;
        
        await this.log(`Trying ${source.name}: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        
        // Handle different response formats
        data = response.data?.data || response.data;
        
        if (data && Array.isArray(data) && data.length > 0) {
          successfulSource = source.name;
          await this.log(`✓ Success with ${source.name}: ${data.length} records`);
          break;
        }
        
      } catch (error) {
        await this.log(`✗ ${source.name} failed: ${error.message}`, 'WARN');
      }
    }
    
    return { data, source: successfulSource };
  }

  async upsertRegion(regionData, level) {
    const existing = this.existingData[level === 1 ? 'provinces' : 
                                     level === 2 ? 'regencies' :
                                     level === 3 ? 'districts' : 'villages'].get(regionData.code);
    
    const isNew = !existing;
    const isUpdated = existing && this.hasChanges(existing, regionData);
    
    if (!isNew && !isUpdated) {
      // Record exists and no changes
      const levelName = level === 1 ? 'provinces' : 
                       level === 2 ? 'regencies' :
                       level === 3 ? 'districts' : 'villages';
      this.stats[levelName].existing++;
      return { id: existing.id, code: existing.code, name: existing.name, action: 'skipped' };
    }

    const query = `
      INSERT INTO regions (
        code, name, level, parent_code, type, 
        area_km2, population, islands_count, 
        source_updated_at, kepmendagri_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        parent_code = EXCLUDED.parent_code,
        type = EXCLUDED.type,
        area_km2 = EXCLUDED.area_km2,
        population = EXCLUDED.population,
        islands_count = EXCLUDED.islands_count,
        source_updated_at = EXCLUDED.source_updated_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, code, name, 
        CASE WHEN created_at = updated_at THEN 'inserted' ELSE 'updated' END as action
    `;

    try {
      const result = await this.client.query(query, [
        regionData.code,
        regionData.name,
        regionData.level,
        regionData.parent_code || null,
        regionData.type,
        regionData.area_km2 || null,
        regionData.population || null,
        regionData.islands_count || null,
        new Date().toISOString().split('T')[0],
        'No 300.2.2-2138 Tahun 2025'
      ]);

      return result.rows[0];
    } catch (error) {
      await this.log(`Failed to upsert region ${regionData.code}: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  hasChanges(existing, newData) {
    // Check if there are significant changes
    return existing.name !== newData.name ||
           existing.parent_code !== newData.parent_code ||
           existing.type !== newData.type ||
           (newData.area_km2 && Math.abs((existing.area_km2 || 0) - newData.area_km2) > 0.001) ||
           (newData.population && existing.population !== newData.population) ||
           (newData.islands_count && existing.islands_count !== newData.islands_count);
  }

  async syncProvinces() {
    await this.log('=== Starting Provinces Sync ===');
    
    // Use official 2025 data as the authoritative source
    const provinces = Object.entries(PROVINCES_2025_DATA).map(([code, data]) => ({
      code,
      name: data.name,
      level: 1,
      parent_code: null,
      type: 'province',
      area_km2: data.area_km2,
      population: data.population,
      islands_count: data.islands
    }));

    for (const province of provinces) {
      try {
        const result = await this.upsertRegion(province, 1);
        
        if (result.action === 'inserted') {
          this.stats.provinces.new++;
          await this.log(`✓ NEW Province: ${result.code} - ${result.name}`);
        } else if (result.action === 'updated') {
          this.stats.provinces.updated++;
          await this.log(`↻ UPDATED Province: ${result.code} - ${result.name}`);
        } else {
          await this.log(`- EXISTS Province: ${result.code} - ${result.name}`, 'DEBUG');
        }
        
      } catch (error) {
        this.stats.provinces.failed++;
        await this.log(`✗ Province failed: ${province.code} - ${error.message}`, 'ERROR');
      }
    }

    await this.log(`Provinces sync completed: ${this.stats.provinces.new} new, ${this.stats.provinces.updated} updated, ${this.stats.provinces.existing} existing`);
    return provinces;
  }

  async syncRegencies() {
    await this.log('=== Starting Regencies Sync ===');
    
    const provinces = await this.client.query('SELECT code, name FROM regions WHERE level = 1 ORDER BY code');
    
    for (const province of provinces.rows) {
      try {
        await this.log(`Syncing regencies for ${province.name} (${province.code})...`);
        
        // Try both API sources
        const { data: regenciesData, source } = await this.fetchFromMultipleSources(
          (apiSource) => apiSource.regencies(province.code)
        );

        if (!regenciesData || regenciesData.length === 0) {
          await this.log(`No regencies data found for province ${province.code}`, 'WARN');
          continue;
        }

        await this.log(`Found ${regenciesData.length} regencies from ${source}`);

        for (const regency of regenciesData) {
          try {
            const regencyData = {
              code: regency.code || regency.id,
              name: regency.name,
              level: 2,
              parent_code: province.code,
              type: regency.name.includes('KOTA') ? 'city' : 'regency'
            };

            const result = await this.upsertRegion(regencyData, 2);

            if (result.action === 'inserted') {
              this.stats.regencies.new++;
              await this.log(`✓ NEW Regency: ${result.code} - ${result.name}`);
            } else if (result.action === 'updated') {
              this.stats.regencies.updated++;
              await this.log(`↻ UPDATED Regency: ${result.code} - ${result.name}`);
            }

          } catch (error) {
            this.stats.regencies.failed++;
            await this.log(`✗ Regency failed: ${regency.code || regency.id} - ${error.message}`, 'ERROR');
          }
        }

        // Rate limiting between provinces
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        await this.log(`Province ${province.code} regencies sync failed: ${error.message}`, 'ERROR');
      }
    }

    await this.log(`Regencies sync completed: ${this.stats.regencies.new} new, ${this.stats.regencies.updated} updated, ${this.stats.regencies.existing} existing`);
  }

  async syncDistricts() {
    if (process.env.INCLUDE_DISTRICTS === 'false') return;
    
    await this.log('=== Starting Districts Sync ===');
    
    const regencies = await this.client.query('SELECT code, name FROM regions WHERE level = 2 ORDER BY code');
    const limit = parseInt(process.env.DISTRICT_LIMIT || '0');
    const processRegencies = limit > 0 ? regencies.rows.slice(0, limit) : regencies.rows;
    
    for (const regency of processRegencies) {
      try {
        await this.log(`Syncing districts for ${regency.name}...`);
        
        const { data: districtsData, source } = await this.fetchFromMultipleSources(
          (apiSource) => apiSource.districts(regency.code)
        );

        if (!districtsData || districtsData.length === 0) {
          await this.log(`No districts data found for regency ${regency.code}`, 'WARN');
          continue;
        }

        for (const district of districtsData) {
          try {
            const districtData = {
              code: district.code || district.id,
              name: district.name,
              level: 3,
              parent_code: regency.code,
              type: 'district'
            };

            const result = await this.upsertRegion(districtData, 3);

            if (result.action === 'inserted') {
              this.stats.districts.new++;
              if (this.stats.districts.new % 50 === 0) {
                await this.log(`✓ Districts progress: ${this.stats.districts.new} new`);
              }
            } else if (result.action === 'updated') {
              this.stats.districts.updated++;
            }

          } catch (error) {
            this.stats.districts.failed++;
            await this.log(`✗ District failed: ${district.code || district.id} - ${error.message}`, 'ERROR');
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        await this.log(`Regency ${regency.code} districts sync failed: ${error.message}`, 'ERROR');
      }
    }

    await this.log(`Districts sync completed: ${this.stats.districts.new} new, ${this.stats.districts.updated} updated, ${this.stats.districts.existing} existing`);
  }

  async syncVillages() {
    if (process.env.INCLUDE_VILLAGES === 'false') return;
    
    await this.log('=== Starting Villages Sync ===');
    
    const districts = await this.client.query(`
      SELECT code, name FROM regions 
      WHERE level = 3 
      ORDER BY code 
      ${process.env.VILLAGE_LIMIT ? `LIMIT ${process.env.VILLAGE_LIMIT}` : ''}
    `);

    for (const district of districts.rows) {
      try {
        const { data: villagesData, source } = await this.fetchFromMultipleSources(
          (apiSource) => apiSource.villages(district.code)
        );

        if (!villagesData || villagesData.length === 0) {
          continue;
        }

        for (const village of villagesData) {
          try {
            const villageData = {
              code: village.code || village.id,
              name: village.name,
              level: 4,
              parent_code: district.code,
              type: village.name.includes('KELURAHAN') ? 'urban_village' : 'village'
            };

            const result = await this.upsertRegion(villageData, 4);

            if (result.action === 'inserted') {
              this.stats.villages.new++;
              
              if (this.stats.villages.new % 100 === 0) {
                await this.log(`✓ Villages progress: ${this.stats.villages.new} new`);
              }
            } else if (result.action === 'updated') {
              this.stats.villages.updated++;
            }

          } catch (error) {
            this.stats.villages.failed++;
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        await this.log(`District ${district.code} villages sync failed: ${error.message}`, 'ERROR');
      }
    }

    await this.log(`Villages sync completed: ${this.stats.villages.new} new, ${this.stats.villages.updated} updated, ${this.stats.villages.existing} existing`);
  }

  async saveSyncStats() {
    try {
      for (const [levelName, stats] of Object.entries(this.stats)) {
        const levelNumber = { provinces: 1, regencies: 2, districts: 3, villages: 4 }[levelName];
        
        await this.client.query(`
          INSERT INTO migration_stats (
            level, total_records, successful_inserts, failed_inserts, 
            source_api, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          levelNumber,
          stats.new + stats.updated + stats.existing,
          stats.new + stats.updated,
          stats.failed,
          'wilayah.id + emsifa.github.io (incremental)',
          `Incremental sync: ${stats.new} new, ${stats.updated} updated, ${stats.existing} existing`
        ]);
      }

      await this.log('Sync statistics saved to database');
    } catch (error) {
      await this.log(`Failed to save sync stats: ${error.message}`, 'ERROR');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      await this.log('🔄 Starting Incremental Indonesia Regions Sync');
      await this.log(`Log file: ${this.logFile}`);
      
      await this.initDatabase();
      
      // Sync all levels
      await this.syncProvinces();
      await this.syncRegencies();
      
      if (process.env.INCLUDE_DISTRICTS !== 'false') {
        await this.syncDistricts();
      }
      
      if (process.env.INCLUDE_VILLAGES !== 'false') {
        await this.syncVillages();
      }
      
      await this.saveSyncStats();
      
      const duration = (Date.now() - startTime) / 1000;
      
      await this.log('🎉 Incremental sync completed successfully!');
      await this.log(`⏱️  Total duration: ${duration} seconds`);
      await this.log('📊 Final Statistics:');
      
      let totalNew = 0, totalUpdated = 0, totalExisting = 0;
      
      for (const [level, stats] of Object.entries(this.stats)) {
        if (stats.new > 0 || stats.updated > 0 || stats.existing > 0) {
          await this.log(`   ${level}: ${stats.new} new, ${stats.updated} updated, ${stats.existing} existing, ${stats.failed} failed`);
          totalNew += stats.new;
          totalUpdated += stats.updated;
          totalExisting += stats.existing;
        }
      }
      
      await this.log(`📈 SUMMARY: ${totalNew} new records, ${totalUpdated} updated, ${totalExisting} unchanged`);

    } catch (error) {
      await this.log(`💥 Incremental sync failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      if (this.client) {
        this.client.release();
      }
      await pool.end();
    }
  }
}

// Run incremental migration
if (require.main === module) {
  const migrator = new IncrementalRegionsMigrator();
  
  migrator.run()
    .then(() => {
      console.log('✅ Incremental sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Incremental sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = IncrementalRegionsMigrator;
