const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'indonesia_regions_dev',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// API endpoints based on multiple sources
const API_SOURCES = {
  wilayah_id: {
    provinces: 'https://wilayah.id/api/provinces.json',
    regencies: (provinceId) => `https://wilayah.id/api/regencies/${provinceId}.json`,
    districts: (regencyId) => `https://wilayah.id/api/districts/${regencyId}.json`,
    villages: (districtId) => `https://wilayah.id/api/villages/${districtId}.json`
  },
  emsifa: {
    provinces: 'https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json',
    regencies: (provinceId) => `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provinceId}.json`,
    districts: (regencyId) => `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${regencyId}.json`,
    villages: (districtId) => `https://emsifa.github.io/api-wilayah-indonesia/api/villages/${districtId}.json`
  }
};

// 2025 official data from Kepmendagri
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

class IndonesiaRegionsMigrator {
  constructor() {
    this.client = null;
    this.stats = {
      provinces: { total: 0, success: 0, failed: 0 },
      regencies: { total: 0, success: 0, failed: 0 },
      districts: { total: 0, success: 0, failed: 0 },
      villages: { total: 0, success: 0, failed: 0 }
    };
    this.logFile = path.join(__dirname, '..', 'logs', `migration-${Date.now()}.log`);
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  async initDatabase() {
    try {
      this.client = await pool.connect();
      await this.log('Database connected successfully');
      
      // Clear existing data
      await this.client.query('TRUNCATE TABLE regions RESTART IDENTITY CASCADE');
      await this.log('Existing regions data cleared');
      
    } catch (error) {
      await this.log(`Database initialization failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async fetchWithRetry(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.log(`Fetching: ${url} (attempt ${i + 1})`);
        const response = await axios.get(url, { timeout: 30000 });
        return response.data;
      } catch (error) {
        await this.log(`Fetch attempt ${i + 1} failed: ${error.message}`, 'WARN');
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }

  async insertRegion(regionData) {
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
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, code, name
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
      await this.log(`Failed to insert region ${regionData.code}: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async migrateProvinces() {
    await this.log('=== Starting Provinces Migration ===');
    
    try {
      // Use our official 2025 data
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

      this.stats.provinces.total = provinces.length;

      for (const province of provinces) {
        try {
          const result = await this.insertRegion(province);
          this.stats.provinces.success++;
          await this.log(`✓ Province inserted: ${result.code} - ${result.name}`);
        } catch (error) {
          this.stats.provinces.failed++;
          await this.log(`✗ Province failed: ${province.code} - ${error.message}`, 'ERROR');
        }
      }

      await this.log(`Provinces migration completed: ${this.stats.provinces.success}/${this.stats.provinces.total} successful`);
      return provinces;

    } catch (error) {
      await this.log(`Provinces migration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async migrateRegencies(provinces) {
    await this.log('=== Starting Regencies Migration ===');
    
    for (const province of provinces) {
      try {
        // Try multiple API sources
        let regenciesData = null;
        
        for (const [sourceName, source] of Object.entries(API_SOURCES)) {
          try {
            const url = source.regencies(province.code);
            const response = await this.fetchWithRetry(url);
            
            // Handle different response formats
            regenciesData = response.data || response;
            
            if (regenciesData && regenciesData.length > 0) {
              await this.log(`Using ${sourceName} for province ${province.code} regencies`);
              break;
            }
          } catch (error) {
            await this.log(`${sourceName} failed for province ${province.code}: ${error.message}`, 'WARN');
          }
        }

        if (!regenciesData || regenciesData.length === 0) {
          await this.log(`No regencies data found for province ${province.code}`, 'WARN');
          continue;
        }

        this.stats.regencies.total += regenciesData.length;

        for (const regency of regenciesData) {
          try {
            const regencyData = {
              code: regency.code || regency.id,
              name: regency.name,
              level: 2,
              parent_code: province.code,
              type: regency.name.includes('KOTA') ? 'city' : 'regency'
            };

            const result = await this.insertRegion(regencyData);
            this.stats.regencies.success++;
            await this.log(`✓ Regency inserted: ${result.code} - ${result.name}`);

          } catch (error) {
            this.stats.regencies.failed++;
            await this.log(`✗ Regency failed: ${regency.code || regency.id} - ${error.message}`, 'ERROR');
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        await this.log(`Province ${province.code} regencies migration failed: ${error.message}`, 'ERROR');
      }
    }

    await this.log(`Regencies migration completed: ${this.stats.regencies.success}/${this.stats.regencies.total} successful`);
  }

  async migrateDistricts() {
    await this.log('=== Starting Districts Migration ===');
    
    try {
      const regenciesResult = await this.client.query('SELECT code, name FROM regions WHERE level = 2 ORDER BY code');
      const regencies = regenciesResult.rows;

      for (const regency of regencies) {
        try {
          let districtsData = null;
          
          for (const [sourceName, source] of Object.entries(API_SOURCES)) {
            try {
              const url = source.districts(regency.code);
              const response = await this.fetchWithRetry(url);
              
              districtsData = response.data || response;
              
              if (districtsData && districtsData.length > 0) {
                await this.log(`Using ${sourceName} for regency ${regency.code} districts`);
                break;
              }
            } catch (error) {
              await this.log(`${sourceName} failed for regency ${regency.code}: ${error.message}`, 'WARN');
            }
          }

          if (!districtsData || districtsData.length === 0) {
            await this.log(`No districts data found for regency ${regency.code}`, 'WARN');
            continue;
          }

          this.stats.districts.total += districtsData.length;

          for (const district of districtsData) {
            try {
              const districtData = {
                code: district.code || district.id,
                name: district.name,
                level: 3,
                parent_code: regency.code,
                type: 'district'
              };

              const result = await this.insertRegion(districtData);
              this.stats.districts.success++;
              await this.log(`✓ District inserted: ${result.code} - ${result.name}`);

            } catch (error) {
              this.stats.districts.failed++;
              await this.log(`✗ District failed: ${district.code || district.id} - ${error.message}`, 'ERROR');
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          await this.log(`Regency ${regency.code} districts migration failed: ${error.message}`, 'ERROR');
        }
      }

      await this.log(`Districts migration completed: ${this.stats.districts.success}/${this.stats.districts.total} successful`);

    } catch (error) {
      await this.log(`Districts migration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async migrateVillages() {
    await this.log('=== Starting Villages Migration ===');
    
    try {
      const districtsResult = await this.client.query(`
        SELECT code, name FROM regions 
        WHERE level = 3 
        ORDER BY code 
        LIMIT ${process.env.VILLAGE_LIMIT || 1000}
      `);
      const districts = districtsResult.rows;

      for (const district of districts) {
        try {
          let villagesData = null;
          
          for (const [sourceName, source] of Object.entries(API_SOURCES)) {
            try {
              const url = source.villages(district.code);
              const response = await this.fetchWithRetry(url);
              
              villagesData = response.data || response;
              
              if (villagesData && villagesData.length > 0) {
                await this.log(`Using ${sourceName} for district ${district.code} villages`);
                break;
              }
            } catch (error) {
              await this.log(`${sourceName} failed for district ${district.code}: ${error.message}`, 'WARN');
            }
          }

          if (!villagesData || villagesData.length === 0) {
            await this.log(`No villages data found for district ${district.code}`, 'WARN');
            continue;
          }

          this.stats.villages.total += villagesData.length;

          for (const village of villagesData) {
            try {
              const villageData = {
                code: village.code || village.id,
                name: village.name,
                level: 4,
                parent_code: district.code,
                type: village.name.includes('KELURAHAN') ? 'urban_village' : 'village'
              };

              const result = await this.insertRegion(villageData);
              this.stats.villages.success++;
              
              if (this.stats.villages.success % 100 === 0) {
                await this.log(`✓ Villages progress: ${this.stats.villages.success}/${this.stats.villages.total}`);
              }

            } catch (error) {
              this.stats.villages.failed++;
              await this.log(`✗ Village failed: ${village.code || village.id} - ${error.message}`, 'ERROR');
            }
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          await this.log(`District ${district.code} villages migration failed: ${error.message}`, 'ERROR');
        }
      }

      await this.log(`Villages migration completed: ${this.stats.villages.success}/${this.stats.villages.total} successful`);

    } catch (error) {
      await this.log(`Villages migration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async saveMigrationStats() {
    try {
      for (const [level, stats] of Object.entries(this.stats)) {
        const levelNumber = { provinces: 1, regencies: 2, districts: 3, villages: 4 }[level];
        
        await this.client.query(`
          INSERT INTO migration_stats (
            level, total_records, successful_inserts, failed_inserts, 
            source_api, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          levelNumber,
          stats.total,
          stats.success,
          stats.failed,
          'wilayah.id + emsifa.github.io',
          `Migration completed at ${new Date().toISOString()}`
        ]);
      }

      await this.log('Migration statistics saved to database');
    } catch (error) {
      await this.log(`Failed to save migration stats: ${error.message}`, 'ERROR');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      await this.log('🚀 Starting Indonesia Regions Migration');
      await this.log(`Log file: ${this.logFile}`);
      
      await this.initDatabase();
      
      // Step 1: Migrate Provinces
      const provinces = await this.migrateProvinces();
      
      // Step 2: Migrate Regencies/Cities
      await this.migrateRegencies(provinces);
      
      // Step 3: Migrate Districts
      await this.migrateDistricts();
      
      // Step 4: Migrate Villages (limited for performance)
      if (process.env.INCLUDE_VILLAGES !== 'false') {
        await this.migrateVillages();
      }
      
      // Save statistics
      await this.saveMigrationStats();
      
      const duration = (Date.now() - startTime) / 1000;
      
      await this.log('Migration completed successfully!');
      await this.log(`Total duration: ${duration} seconds`);
      await this.log('Final Statistics:');
      
      for (const [level, stats] of Object.entries(this.stats)) {
        await this.log(`   ${level}: ${stats.success}/${stats.total} (${stats.failed} failed)`);
      }

    } catch (error) {
      await this.log(`Migration failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      if (this.client) {
        this.client.release();
      }
      await pool.end();
    }
  }
}

// Run migration
if (require.main === module) {
  const migrator = new IndonesiaRegionsMigrator();
  
  migrator.run()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = IndonesiaRegionsMigrator;
