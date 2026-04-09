# RBAC System

## Overview

HMS+EMR implements **Role-Based Access Control (RBAC)** using JWT claims and NestJS guards.

## Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Full platform access; bypasses all role checks |
| `SYSTEM_ADMIN` | Platform administration, tenant management |
| `HOSPITAL_ADMIN` | Tenant-scoped administration |
| `DOCTOR` | Clinical operations, EMR, prescriptions |
| `NURSE` | Clinical support, vitals, triage |
| `PHARMACIST` | Drug inventory, prescription dispensing |
| `LAB_SCIENTIST` | Lab orders, results |
| `RADIOLOGIST` | Radiology orders, reports |
| `RECEPTIONIST` | Patient registration, appointments |
| `BILLING_OFFICER` | Invoices, payments, insurance |
| `PATIENT` | Patient portal access |
| `INSURANCE_PROVIDER` | Claims review |
| `ENTERPRISE_CLIENT` | B2B API access |

## Implementation

### JWT Payload
```json
{
  "sub": "user-cuid",
  "email": "doctor@hospital.com",
  "role": "DOCTOR",
  "tenantId": "tenant-cuid"
}
```

### Guards

**JwtAuthGuard** — Validates Bearer token, attaches `req.user`

**RolesGuard** — Checks `@Roles()` decorator against `req.user.role`

### Usage

```typescript
@Get('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
findAll(@Request() req) {
  return this.patientsService.findAll(req.user.tenantId);
}
```

### Super Admin Override

`SUPER_ADMIN` role bypasses all `@Roles()` checks. Always allowed.

## Module-Level Permissions

| Module | Allowed Roles |
|--------|--------------|
| Auth | Public (register/login) |
| Users | SUPER_ADMIN, HOSPITAL_ADMIN |
| Tenants | SUPER_ADMIN only |
| Patients | DOCTOR, NURSE, RECEPTIONIST, HOSPITAL_ADMIN |
| EMR | DOCTOR, NURSE |
| Appointments | DOCTOR, NURSE, RECEPTIONIST, HOSPITAL_ADMIN |
| Billing | BILLING_OFFICER, HOSPITAL_ADMIN |
| Pharmacy | PHARMACIST, DOCTOR, HOSPITAL_ADMIN |
| Laboratory | LAB_SCIENTIST, DOCTOR, NURSE |
| Radiology | RADIOLOGIST, DOCTOR, HOSPITAL_ADMIN |
| Insurance | BILLING_OFFICER, HOSPITAL_ADMIN, INSURANCE_PROVIDER |
| Telemedicine | DOCTOR, NURSE, HOSPITAL_ADMIN |
| AI Engine | DOCTOR, NURSE, PHARMACIST |
| Analytics | HOSPITAL_ADMIN, SUPER_ADMIN |
| Notifications | SUPER_ADMIN, HOSPITAL_ADMIN, SYSTEM_ADMIN |
