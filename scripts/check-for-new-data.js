require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || '5432'),
});

class NewDataChecker {
  constructor() {
    this.client = null;
  }

  async checkForNewRegencies() {
    const provinces = await this.client.query('SELECT code FROM regions WHERE level = 1');
    let newFound = 0;
    
    for (const province of provinces.rows) {
      try {
        // Get existing regencies count
        const existing = await this.client.query(
          'SELECT COUNT(*) FROM regions WHERE level = 2 AND parent_code = $1',
          [province.code]
        );
        
        // Get API count
        const response = await axios.get(
          `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${province.code}.json`,
          { timeout: 10000 }
        );
        
        const apiCount = response.data.length;
        const dbCount = parseInt(existing.rows[0].count);
        
        if (apiCount > dbCount) {
          console.log(`📍 Province ${province.code}: API has ${apiCount}, DB has ${dbCount} (${apiCount - dbCount} new)`);
          newFound += (apiCount - dbCount);
        }
        
      } catch (error) {
        console.log(`⚠️  Could not check province ${province.code}: ${error.message}`);
      }
    }
    
    return newFound;
  }

  async run() {
    try {
      this.client = await pool.connect();
      
      console.log('🔍 Checking for new data...\n');
      
      const newRegencies = await this.checkForNewRegencies();
      
      console.log(`\n📊 Summary:`);
      console.log(`   New regencies found: ${newRegencies}`);
      
      if (newRegencies > 0) {
        console.log(`\n💡 Run sync to get new data:`);
        console.log(`   npm run sync:regions`);
        console.log(`   # or`);
        console.log(`   npm run docker:sync`);
      } else {
        console.log(`\n✅ Database is up to date!`);
      }
      
    } catch (error) {
      console.error('❌ Check failed:', error.message);
    } finally {
      if (this.client) {
        this.client.release();
      }
      await pool.end();
    }
  }
}

new NewDataChecker().run();
