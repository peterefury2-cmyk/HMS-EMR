# Deployment Guide

## Prerequisites

- Node.js 20+
- Docker 24+ and Docker Compose
- kubectl (for Kubernetes)
- PostgreSQL 16+
- Redis 7+

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure with Docker
docker-compose up postgres redis -d

# 3. Set up API environment
cd apps/api
cp .env.example .env
# Edit .env with your values

# 4. Run Prisma migrations
npx prisma migrate dev --name init
npx prisma generate

# 5. Seed database (optional)
npx prisma db seed

# 6. Start API
npm run dev

# 7. In another terminal, set up web
cd apps/web
cp .env.example .env
npm run dev
```

## Docker Compose Deployment

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f api
docker-compose logs -f web

# Run migrations
docker-compose exec api npx prisma migrate deploy

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
# Configure cluster access (kubeconfig)
kubectl cluster-info
```

### Apply Manifests

```bash
# Create namespace
kubectl apply -f infra/kubernetes/namespace.yaml

# Create secrets (update values first!)
kubectl create secret generic hms-secrets \
  --from-literal=database-url='postgresql://user:pass@postgres:5432/hms_emr' \
  --from-literal=redis-url='redis://redis:6379' \
  --from-literal=jwt-secret='your-super-secret' \
  --from-literal=postgres-user='hms_user' \
  --from-literal=postgres-password='secure-password' \
  -n hms-emr

# Create configmap
kubectl create configmap hms-config \
  --from-literal=api-url='https://api.hms.example.com' \
  -n hms-emr

# Deploy infrastructure
kubectl apply -f infra/kubernetes/postgres-deployment.yaml
kubectl apply -f infra/kubernetes/redis-deployment.yaml

# Wait for infrastructure
kubectl rollout status statefulset/hms-postgres -n hms-emr

# Deploy applications
kubectl apply -f infra/kubernetes/api-deployment.yaml
kubectl apply -f infra/kubernetes/web-deployment.yaml

# Configure ingress
kubectl apply -f infra/kubernetes/ingress.yaml
```

## Environment Variables

### Required for Production

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/hms_emr

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=minimum-32-character-random-secret
JWT_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=3001
```

### Optional

```env
# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# AI Features
OPENAI_API_KEY=sk-...

# Payment
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
```

## Health Checks

- API Health: `GET /api/docs` (returns 200)
- Database: Prisma connection check on startup
- Redis: Ping on connection

## Scaling

```bash
# Scale API pods
kubectl scale deployment hms-api --replicas=4 -n hms-emr

# Scale Web pods
kubectl scale deployment hms-web --replicas=3 -n hms-emr
```
