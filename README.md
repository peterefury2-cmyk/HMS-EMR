# HMS+EMR SaaS Platform

A production-grade, multi-tenant Hospital Management System (HMS) and Electronic Medical Records (EMR) platform built with modern technologies.

## Architecture Overview

This monorepo contains:

```
hms-emr/
├── apps/
│   ├── api/          # NestJS REST API (Backend)
│   └── web/          # Next.js 14 Frontend
├── packages/         # Shared packages (future use)
├── infra/
│   └── kubernetes/   # K8s manifests
├── docs/             # Documentation
└── docker-compose.yml
```

### Technology Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Backend     | NestJS 10 + TypeScript  |
| ORM         | Prisma 5 + PostgreSQL   |
| Frontend    | Next.js 14 + Tailwind   |
| Cache       | Redis 7                 |
| Queue       | BullMQ                  |
| Auth        | JWT + OAuth2            |
| Container   | Docker + Kubernetes     |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Local Development

```bash
# 1. Clone the repository
git clone <repo-url>
cd hms-emr

# 2. Install dependencies
npm install

# 3. Start infrastructure services
docker-compose up postgres redis -d

# 4. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 5. Run database migrations
cd apps/api && npx prisma migrate dev

# 6. Start development servers
npm run dev
```

### Using Docker Compose (Full Stack)

```bash
docker-compose up --build
```

- API: http://localhost:3001
- Web: http://localhost:3000
- API Docs: http://localhost:3001/api/docs

## Modules

| Module         | Description                                    |
|----------------|------------------------------------------------|
| Auth           | JWT authentication, OAuth2, MFA                |
| Users          | User management with RBAC                      |
| Tenants        | Multi-tenant management                        |
| Patients       | Patient registration and management            |
| EMR            | Electronic Medical Records (visits, notes)     |
| Appointments   | Scheduling and appointment management          |
| Billing        | Invoices, payments, financial reports          |
| Pharmacy       | Drug inventory, prescriptions                  |
| Laboratory     | Lab tests, orders, results                     |
| Radiology      | Imaging orders and reports                     |
| Insurance      | Policy and claims management                   |
| Telemedicine   | Virtual consultation sessions                  |
| AI             | Clinical decision support, symptom analysis    |
| Subscriptions  | Tenant subscription and plan management        |
| Notifications  | Email/SMS notifications via queue              |

## Environment Variables

### API (apps/api/.env)

| Variable            | Description                        | Default              |
|---------------------|------------------------------------|----------------------|
| `DATABASE_URL`      | PostgreSQL connection string       | Required             |
| `REDIS_URL`         | Redis connection string            | Required             |
| `JWT_SECRET`        | JWT signing secret                 | Required             |
| `JWT_EXPIRES_IN`    | JWT expiration                     | `7d`                 |
| `PORT`              | API server port                    | `3001`               |
| `NODE_ENV`          | Environment                        | `development`        |
| `SMTP_HOST`         | SMTP server host                   | Optional             |
| `SMTP_PORT`         | SMTP server port                   | `587`                |
| `SMTP_USER`         | SMTP username                      | Optional             |
| `SMTP_PASS`         | SMTP password                      | Optional             |
| `OPENAI_API_KEY`    | OpenAI API key for AI features     | Optional             |

### Web (apps/web/.env)

| Variable                  | Description          | Default                    |
|---------------------------|----------------------|----------------------------|
| `NEXT_PUBLIC_API_URL`     | API base URL         | `http://localhost:3001`    |
| `NEXTAUTH_SECRET`         | NextAuth secret      | Required                   |
| `NEXTAUTH_URL`            | NextAuth URL         | `http://localhost:3000`    |

## API Documentation

After starting the API server, visit http://localhost:3001/api/docs for interactive Swagger documentation.

## Deployment

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions including Kubernetes deployment.

## License

Private — All rights reserved.
