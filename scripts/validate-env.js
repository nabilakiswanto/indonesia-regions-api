#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Required environment variables
const requiredVars = [
  'POSTGRES_PASSWORD',
  'API_KEY',
  'JWT_SECRET',
  'PGLADMIN_DEFAULT_PASSWORD'
];

// Optional but recommended variables
const recommendedVars = [
  'POSTGRES_DB',
  'POSTGRES_USER',
  'ALLOWED_ORIGINS',
  'LOG_LEVEL'
];

function validateEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Environment file not found: ${filePath}`);
    return false;
  }

  const envContent = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  
  // Parse .env file
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  console.log(`\n🔍 Validating environment file: ${filePath}`);
  
  let isValid = true;
  
  // Check required variables
  console.log('\n📋 Required variables:');
  requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (!value || value.length === 0) {
      console.log(`❌ ${varName}: Missing or empty`);
      isValid = false;
    } else if (value.length < 8 && varName.includes('PASSWORD')) {
      console.log(`⚠️  ${varName}: Too short (${value.length} chars), recommend 12+`);
    } else {
      console.log(`✅ ${varName}: OK`);
    }
  });

  // Check recommended variables
  console.log('\n💡 Recommended variables:');
  recommendedVars.forEach(varName => {
    const value = envVars[varName];
    if (!value) {
      console.log(`⚠️  ${varName}: Not set (using defaults)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  });

  return isValid;
}

// Validate main .env file
const mainEnvPath = path.join(process.cwd(), '.env');
const isValid = validateEnvFile(mainEnvPath);

if (isValid) {
  console.log('\n🎉 Environment validation passed!');
  process.exit(0);
} else {
  console.log('\n❌ Environment validation failed. Please fix the issues above.');
  process.exit(1);
}
