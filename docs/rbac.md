# Role-Based Access Control (RBAC)

## Roles

| Role               | Description                                        |
|--------------------|----------------------------------------------------|
| SUPER_ADMIN        | Platform administrator, full access                |
| SYSTEM_ADMIN       | System configuration, multi-tenant management      |
| HOSPITAL_ADMIN     | Hospital-level admin, manage staff and settings    |
| DOCTOR             | Full clinical access within their tenant           |
| NURSE              | Clinical support, vitals, notes                    |
| PHARMACIST         | Pharmacy module access                             |
| LAB_SCIENTIST      | Laboratory module access                           |
| RADIOLOGIST        | Radiology module access                            |
| RECEPTIONIST       | Patient registration, appointments                 |
| BILLING_OFFICER    | Billing, invoices, payments                        |
| PATIENT            | Self-service portal access                         |
| INSURANCE_PROVIDER | Insurance claims and policy review                 |
| ENTERPRISE_CLIENT  | Corporate wellness program access                  |

## Permissions Matrix

### Users Module

| Action          | SUPER_ADMIN | HOSPITAL_ADMIN | DOCTOR | NURSE | Others |
|-----------------|-------------|----------------|--------|-------|--------|
| List users      | ✅          | ✅ (tenant)    | ❌     | ❌    | ❌     |
| Get user        | ✅          | ✅ (tenant)    | Self   | Self  | Self   |
| Update user     | ✅          | ✅ (tenant)    | Self   | Self  | Self   |
| Delete user     | ✅          | ❌             | ❌     | ❌    | ❌     |

### Patients Module

| Action            | HOSPITAL_ADMIN | DOCTOR | NURSE | RECEPTIONIST | PATIENT |
|-------------------|----------------|--------|-------|--------------|---------|
| List patients     | ✅             | ✅     | ✅    | ✅           | Self    |
| Create patient    | ✅             | ✅     | ✅    | ✅           | ❌      |
| Update patient    | ✅             | ✅     | ✅    | Limited      | ❌      |
| Delete patient    | ✅             | ❌     | ❌    | ❌           | ❌      |

### EMR Module

| Action            | DOCTOR | NURSE  | RECEPTIONIST | PATIENT |
|-------------------|--------|--------|--------------|---------|
| Create visit      | ✅     | ✅     | ✅ (limited) | ❌      |
| View visit        | ✅     | ✅     | ❌           | Self    |
| Add notes         | ✅     | ✅     | ❌           | ❌      |
| Record vitals     | ✅     | ✅     | ❌           | ❌      |
| View history      | ✅     | ✅     | ❌           | Self    |

### Billing Module

| Action            | BILLING_OFFICER | HOSPITAL_ADMIN | PATIENT |
|-------------------|-----------------|----------------|---------|
| Create invoice    | ✅              | ✅             | ❌      |
| View invoices     | ✅              | ✅             | Self    |
| Process payment   | ✅              | ✅             | Self    |

### Pharmacy Module

| Action             | PHARMACIST | DOCTOR | HOSPITAL_ADMIN |
|--------------------|------------|--------|----------------|
| Manage drugs       | ✅         | ❌     | ✅             |
| Create prescription| ❌         | ✅     | ❌             |
| Dispense           | ✅         | ❌     | ❌             |

### Laboratory Module

| Action            | LAB_SCIENTIST | DOCTOR | NURSE |
|-------------------|---------------|--------|-------|
| Manage tests      | ✅            | ❌     | ❌    |
| Create order      | ❌            | ✅     | ✅    |
| Update results    | ✅            | ❌     | ❌    |

### Radiology Module

| Action            | RADIOLOGIST | DOCTOR | NURSE |
|-------------------|-------------|--------|-------|
| Create order      | ❌          | ✅     | ❌    |
| Update/report     | ✅          | ❌     | ❌    |
| View orders       | ✅          | ✅     | ❌    |
