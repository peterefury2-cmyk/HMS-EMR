# Database Design

## Overview

HMS+EMR uses **PostgreSQL** as the primary relational database, managed through **Prisma ORM**. The schema is multi-tenant with row-level tenant isolation.

## Core Models

### Tenant
Central entity for multi-tenancy. All clinical data is scoped by `tenantId`.

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| name | String | Hospital/clinic name |
| slug | String (unique) | URL-safe identifier |
| domain | String? | Custom domain |
| isActive | Boolean | Tenant status |
| createdAt | DateTime | Creation timestamp |

### User
Platform users across all roles.

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| email | String (unique) | Login email |
| passwordHash | String | bcrypt hash |
| firstName, lastName | String | Display name |
| role | Role enum | RBAC role |
| tenantId | String? | Tenant association |
| isActive | Boolean | Account status |
| mfaEnabled | Boolean | MFA flag |

### Patient
Clinical entity for patient demographics and medical history.

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| patientNo | String | Auto-generated (P000001) |
| tenantId | String | Tenant FK |
| firstName, lastName | String | Name |
| dateOfBirth | DateTime | DOB |
| gender | String | M/F/Other |
| bloodGroup | String? | ABO+Rh |
| phone, email | String? | Contact |
| address | JSON? | Address object |

### Visit
An encounter/consultation. Links patient, doctor, clinical data.

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| tenantId | String | Tenant FK |
| patientId | String | Patient FK |
| doctorId | String | User (doctor) FK |
| status | VisitStatus | Lifecycle state |
| chiefComplaint | String? | Presenting complaint |
| admittedAt | DateTime? | Inpatient admission |
| dischargedAt | DateTime? | Discharge time |

### Appointment
Scheduled time slots between doctor and patient.

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| tenantId | String | Tenant FK |
| patientId | String | Patient FK |
| doctorId | String | User FK |
| scheduledAt | DateTime | Start time |
| duration | Int | Minutes (default 30) |
| status | AppointmentStatus | Lifecycle |
| type | String | IN_PERSON/TELEMEDICINE |

### Invoice & Payment
Billing records with itemized charges.

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| invoiceNo | String | INV-YYYY-NNNNN |
| tenantId | String | Tenant FK |
| patientId | String | Patient FK |
| amount | Decimal | Total due |
| status | InvoiceStatus | DRAFT/SENT/PAID/OVERDUE |
| paidAt | DateTime? | Payment timestamp |

## Relationships

```
Tenant ─── 1:N ──► User
Tenant ─── 1:N ──► Patient
Tenant ─── 1:N ──► Visit
Patient ─── 1:N ──► Visit
Patient ─── 1:N ──► Appointment
Visit ─── 1:N ──► ClinicalNote
Visit ─── 1:N ──► VitalSigns
Visit ─── 1:N ──► Diagnosis
Visit ─── 1:N ──► Prescription
Visit ─── 1:N ──► LabOrder
Visit ─── 1:N ──► RadiologyOrder
Patient ─── 1:N ──► InsurancePolicy
Invoice ─── 1:N ──► Payment
Invoice ─── 1:N ──► InsuranceClaim
```

## Multi-Tenancy Strategy

Every clinical table includes a `tenantId` field and all service-layer queries filter by `tenantId`. This provides logical data isolation at the application layer. For stronger isolation, consider PostgreSQL Row Level Security (RLS) in production.

## Indexing Strategy

- All `tenantId` fields are indexed
- `User.email` has a unique index
- `Patient.patientNo` is unique per tenant (enforced at application level)
- `Appointment.scheduledAt` and `doctorId` are composite-indexed for conflict detection
