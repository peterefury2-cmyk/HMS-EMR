# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Local Development

```bash
# 1. Clone and install dependencies
git clone <repo>
cd HMS-EMR
npm install
cd apps/api && npm install
cd ../web && npm install

# 2. Configure environment
cp .env.example apps/api/.env
# Edit .env with your values

# 3. Start infrastructure
docker-compose up -d db redis

# 4. Run database migrations
cd apps/api && npx prisma migrate dev

# 5. Start API
npm run start:dev

# 6. Start Web (separate terminal)
cd apps/web && npm run dev
```

## Docker Compose (Full Stack)

```bash
docker-compose up -d
```

Services:
- `api` — NestJS API on port 3001
- `web` — Next.js on port 3000
- `db` — PostgreSQL on port 5432
- `redis` — Redis on port 6379

## Production Deployment

### Environment Variables
Set all values from `.env.example` with production secrets.

### Database Migration
```bash
npx prisma migrate deploy
```

### Build and Start
```bash
# API
cd apps/api
npm run build
npm run start:prod

# Web
cd apps/web
npm run build
npm run start
```

## Kubernetes (Helm)

Helm charts are available in `infra/helm/`. Deploy with:

```bash
helm upgrade --install hms-emr ./infra/helm \
  --namespace hms-emr \
  --values ./infra/helm/values-prod.yaml
```

## Health Checks

- API: `GET /health` → `{ "status": "ok" }`
- Database: Prisma connection check on startup
- Redis: BullMQ connection (graceful fallback if unavailable)

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — Lint, type-check, test on every PR
- `deploy.yml` — Deploy to staging/production on merge to main
