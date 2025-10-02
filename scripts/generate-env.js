#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generatePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

const envTemplate = `# =================================
# Auto-generated Environment File
# Generated on: ${new Date().toISOString()}
# =================================

# IMPORTANT: Update these values for production!
COMPOSE_PROJECT_NAME=indonesia-regions-api

# Application Configuration
NODE_ENV=development
APP_PORT=3000
DEBUG_PORT=9229
LOG_LEVEL=debug

# Database Configuration
POSTGRES_VERSION=15-alpine
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=indonesia_regions_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${generatePassword(20)}

# Redis Configuration
REDIS_VERSION=7-alpine
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${generatePassword(16)}

# pgAdmin Configuration
PGLADMIN_VERSION=8.1
PGLADMIN_PORT=8080
PGLADMIN_DEFAULT_EMAIL=admin@indonesiaregions.dev
PGLADMIN_DEFAULT_PASSWORD=${generatePassword(16)}

# Security Configuration
API_KEY=${generateSecureString(32)}
JWT_SECRET=${generateSecureString(64)}

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000

# Docker Development Settings
CHOKIDAR_USEPOLLING=true
CHOKIDAR_INTERVAL=1000
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Network Configuration
NETWORK_SUBNET=172.20.0.0/16
`;

const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Creating .env.example instead.');
  fs.writeFileSync(path.join(process.cwd(), '.env.example'), envTemplate);
  console.log('✅ Generated .env.example file');
} else {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Generated .env file with secure defaults');
  console.log('🔒 Please review and update the generated passwords before using in production');
}
