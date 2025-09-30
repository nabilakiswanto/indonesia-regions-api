# 🇮🇩 Indonesia Regions API

A robust RESTful API providing comprehensive Indonesian administrative regions data based on the latest Kepmendagri (Ministry of Home Affairs) official data structure.

## 🌟 Features

- **Complete Regional Data**: Province → City/Regency → District → Village/Kelurahan
- **Official Kepmendagri Codes**: Based on latest Permendagri regulation
- **High Performance**: Optimized PostgreSQL queries with proper indexing
- **Production Ready**: Docker support, comprehensive logging, security measures
- **Developer Friendly**: Clean API design, comprehensive documentation
- **Scalable Architecture**: Modular design for easy maintenance and scaling

## 🏗️ System Architecture
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Client Apps │────│ Load Balancer │────│ API Gateway │
└─────────────────┘ └─────────────────┘ └─────────────────┘
│
┌─────────────────────────────────┼─────────────────────────────────┐
│ │ │
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Node.js │ │ Node.js │ │ Node.js │
│ App Server │ │ App Server │ │ App Server │
│ (Port │ │ (Port │ │ (Port │
│ 3000) │ │ 3001) │ │ 3002) │
└─────────────┘ └─────────────┘ └─────────────┘
│ │ │
└─────────────────────────────────┼─────────────────────────────────┘
│
┌─────────────────┐
│ PostgreSQL │
│ Database │
│ (Port 5432) │
└─────────────────┘

## 📊 Database Schema
regions (
id: SERIAL PRIMARY KEY,
code: VARCHAR(20) UNIQUE NOT NULL,
name: VARCHAR(255) NOT NULL,
level: SMALLINT NOT NULL, -- 1=Province, 2=City, 3=District, 4=Village
parent_code: VARCHAR(20),
created_at: TIMESTAMP,
updated_at: TIMESTAMP
)

### Data Hierarchy Example:
11 (Aceh Province)
├── 1101 (Kabupaten Aceh Selatan)
│ ├── 110101 (Kecamatan Trumon)
│ │ ├── 1101011001 (Desa Krueng Kluet)
│ │ └── 1101011002 (Desa Paya Dapur)
│ └── 110102 (Kecamatan Trumon Timur)
└── 1102 (Kabupaten Aceh Tenggara)


## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Option 1: Local Development

1. **Clone and Setup**
git clone https://github.com/yourusername/indonesia-regions-api.git
cd indonesia-regions-api
npm install

2. **Environment Configuration**
cp .env.example .env
Edit .env with your database credentials

3. **Database Setup**
Create database

createdb indonesia_regions
Run migrations

psql -d indonesia_regions -f migrations/001_create_regions_table.sql
Seed data

npm run seed

4. **Start Development Server**

### Option 2: Docker Deployment

1. **Quick Docker Setup**
git clone https://github.com/yourusername/indonesia-regions-api.git
cd indonesia-regions-api
npm run docker:run

2. **Manual Docker Build**
Build image

docker build -f docker/Dockerfile -t indonesia-regions-api .
Run with docker-compose

docker-compose -f docker/docker-compose.yml up -d

## 📚 API Documentation

### Base URL
http://localhost:3000/api

### Authentication
Currently uses API key authentication. Include in headers:
X-API-Key: your-api-key-here

### Endpoints Overview

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/regions/provinces` | Get all provinces | `limit`, `offset` |
| GET | `/regions/province/{code}` | Get province by code | - |
| GET | `/regions/cities/{provinceCode}` | Get cities in province | `limit`, `offset` |
| GET | `/regions/districts/{cityCode}` | Get districts in city | `limit`, `offset` |
| GET | `/regions/villages/{districtCode}` | Get villages in district | `limit`, `offset` |
| GET | `/regions/search` | Search regions | `q`, `level`, `limit` |
| GET | `/health` | Health check | - |

### Sample Responses

**GET /api/regions/provinces**
{
    "success": true,
    "data": [
        {
            "code": "11",
            "name": "ACEH",
            "level": 1,
            "parent_code": null,
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 38,
        "pages": 1
    }
}

**GET /api/regions/cities/11**
{
"success": true,
"data": [
        {
        "code": "1101",
        "name": "KABUPATEN ACEH SELATAN",
        "level": 2,
        "parent_code": "11",
        "created_at": "2024-01-01T00:00:00.000Z"
        }
    ],
    "pagination": {
    "page": 1,
    "limit": 50,
    "total": 23,
    "pages": 1
    }
}

## 🛠️ Development

### Code Structure
src/
├── config/ # Database, logging configuration
├── controllers/ # Request handlers
├── middleware/ # Custom middleware
├── models/ # Data models
├── routes/ # API routes
├── services/ # Business logic
└── utils/ # Helper functions

### Running Tests
Run all tests

npm test
Run tests in watch mode

npm run test:watch
Run specific test file

npm test tests/unit/regionsController.test.js

### Code Quality
Lint code

npm run lint
Format code

npm run format

Pre-commit hooks will run automatically

## 🐳 Docker Configuration

### Dockerfile
- Multi-stage build for optimized image size
- Non-root user for security
- Health checks included
- Production optimizations

### Docker Compose
version: '3.8'
services:
api:
build:
context: .
dockerfile: docker/Dockerfile
ports:
- "3000:3000"
environment:
- NODE_ENV=production
- DB_HOST=postgres
depends_on:
- postgres

postgres:
image: postgres:15-alpine
environment:
POSTGRES_DB: indonesia_regions
POSTGRES_USER: postgres
POSTGRES_PASSWORD: password
volumes:
- postgres_data:/var/lib/postgresql/data
- ./migrations:/docker-entrypoint-initdb.d
ports:
- "5432:5432"

volumes:
postgres_data:

## 🚀 Deployment

### Production Deployment Options

#### 1. Traditional VPS/Server
Clone repository

git clone https://github.com/yourusername/indonesia-regions-api.git
cd indonesia-regions-api
Install dependencies

npm ci --production
Set environment variables

export NODE_ENV=production
export DB_HOST=your-db-host
export DB_PASSWORD=your-db-password
Start with PM2

npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

#### 2. Docker in Production
Using docker-compose

docker-compose -f docker/docker-compose.prod.yml up -d
Using Docker Swarm

docker stack deploy -c docker/docker-stack.yml indonesia-api

#### 3. Cloud Platforms

**Google Cloud Run:**
Build and push

gcloud builds submit --tag gcr.io/PROJECT-ID/indonesia-regions-api
Deploy

gcloud run deploy --image gcr.io/PROJECT-ID/indonesia-regions-api --platform managed

**AWS ECS:**
Push to ECR

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker build -t indonesia-regions-api .
docker tag indonesia-regions-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/indonesia-regions-api:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/indonesia-regions-api:latest

### Environment Variables
Server Configuration

NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
Database Configuration

DB_HOST=localhost
DB_PORT=5432
DB_NAME=indonesia_regions
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true
Security

API_KEY=your-very-secure-api-key
JWT_SECRET=your-jwt-secret
Monitoring

LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn

## 🧪 Testing

### Test Structure
tests/
├── integration/
│ ├── regions.test.js
│ └── health.test.js
├── unit/
│ ├── controllers/
│ ├── services/
│ └── utils/
└── fixtures/
└── sample-data.json


### Running Tests
All tests

npm test
Integration tests only

npm run test:integration
Unit tests only

npm run test:unit
Coverage report

npm run test:coverage

### Load Testing
Install artillery

npm install -g artillery
Run load tests

artillery run tests/load/basic-load.yml

## 📈 Performance & Monitoring

### Performance Optimizations
- **Database Indexing**: Optimized indexes for hierarchical queries
- **Connection Pooling**: PostgreSQL connection pool with optimal settings  
- **Caching**: Redis caching for frequently accessed data
- **Compression**: Gzip compression for API responses
- **Rate Limiting**: Protection against abuse

### Monitoring Setup
Prometheus metrics endpoint

GET /metrics
Health check with detailed status

GET /health
Application logs

tail -f logs/app.log

## 🔒 Security Features

- **Helmet.js**: Security headers protection
- **Rate Limiting**: Request throttling
- **Input Validation**: Joi schema validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Proper cross-origin setup
- **Environment Variables**: Sensitive data protection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/nabilakiswanto/indonesia-regions-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nabilakiswanto/indonesia-regions-api/discussions)

## 🙏 Acknowledgments

- **Kementerian Dalam Negeri RI** for the official regional data
- **Node.js Community** for excellent ecosystem
- **PostgreSQL Team** for robust database system
- **All Contributors** who help improve this project

---

**⭐ Star this repo if it helps you!**

