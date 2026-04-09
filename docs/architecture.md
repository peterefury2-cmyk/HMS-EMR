# Architecture Overview

## System Design

HMS+EMR is a multi-tenant SaaS platform built on a microservice-ready monolith architecture, designed to serve hospitals, clinics, and healthcare organizations.

## Component Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │              Internet / Clients              │
                    └──────────────────┬──────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │            Nginx Ingress / Load Balancer     │
                    └──────┬────────────────────┬─────────────────┘
                           │                    │
              ┌────────────▼──────┐  ┌──────────▼─────────────┐
              │  Next.js Web App  │  │   NestJS REST API       │
              │  (Port 3000)      │  │   (Port 3001)           │
              └───────────────────┘  └──────┬──────────────────┘
                                            │
               ┌────────────────────────────┼──────────────────┐
               │                            │                  │
  ┌────────────▼──────┐      ┌──────────────▼──────┐  ┌───────▼─────┐
  │  PostgreSQL 16    │      │   Redis 7 Cache      │  │  BullMQ     │
  │  (Primary DB)     │      │   (Sessions/Cache)   │  │  (Queues)   │
  └───────────────────┘      └──────────────────────┘  └─────────────┘
```

## Data Flow

### Request Lifecycle

1. Client makes HTTP request to Next.js frontend
2. Frontend calls NestJS API with JWT token
3. API validates JWT via JwtAuthGuard
4. RolesGuard checks tenant-scoped permissions
5. Controller delegates to Service layer
6. Service queries PostgreSQL via Prisma ORM
7. Heavy operations (emails, notifications) dispatched to BullMQ
8. Response cached in Redis where applicable

### Multi-Tenancy Approach

- **Row-Level Multi-Tenancy**: All tenant data is scoped by `tenantId` on every table
- **Tenant Resolution**: JWT payload includes `tenantId` for all authenticated requests
- **Data Isolation**: All Prisma queries include `WHERE tenantId = $tenantId` via service layer
- **Tenant Onboarding**: New tenant creates Subscription record and receives isolated data space

## Technology Choices

| Technology    | Reason                                                  |
|---------------|---------------------------------------------------------|
| NestJS        | Enterprise-grade Node.js framework, DI, modularity      |
| Prisma        | Type-safe ORM, migrations, excellent PostgreSQL support |
| PostgreSQL    | ACID compliance, JSON support, healthcare-grade DB      |
| Redis         | Session caching, rate limiting, queue broker            |
| BullMQ        | Reliable job queues for notifications, reports          |
| Next.js 14    | App Router, SSR/SSG, React Server Components            |
| Tailwind CSS  | Utility-first CSS, rapid UI development                 |
| JWT           | Stateless auth, multi-tenant payload                    |

## Security Architecture

- JWT tokens with short expiry (7d) + refresh token rotation
- bcrypt password hashing (cost factor 12)
- Rate limiting via ThrottlerModule
- CORS whitelist configuration
- Input validation via class-validator DTOs
- Audit logging for all write operations
- HIPAA-aware data handling practices
