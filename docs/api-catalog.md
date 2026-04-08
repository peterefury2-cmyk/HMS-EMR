# API Catalog

Base URL: `http://localhost:3001`

## Authentication

| Method | Endpoint         | Description          | Auth Required |
|--------|------------------|----------------------|---------------|
| POST   | /auth/register   | Register new user    | No            |
| POST   | /auth/login      | Login (get JWT)      | No            |
| GET    | /auth/me         | Get current user     | JWT           |

## Users

| Method | Endpoint         | Description          | Roles                    |
|--------|------------------|----------------------|--------------------------|
| GET    | /users           | List all users       | SUPER_ADMIN, HOSPITAL_ADMIN |
| GET    | /users/:id       | Get user by ID       | JWT                      |
| PATCH  | /users/:id       | Update user          | SUPER_ADMIN, HOSPITAL_ADMIN |
| DELETE | /users/:id       | Delete user          | SUPER_ADMIN              |

## Tenants

| Method | Endpoint         | Description          | Roles        |
|--------|------------------|----------------------|--------------|
| GET    | /tenants         | List tenants         | SUPER_ADMIN  |
| POST   | /tenants         | Create tenant        | SUPER_ADMIN  |
| GET    | /tenants/:id     | Get tenant           | SUPER_ADMIN  |
| PATCH  | /tenants/:id     | Update tenant        | SUPER_ADMIN  |
| DELETE | /tenants/:id     | Delete tenant        | SUPER_ADMIN  |

## Patients

| Method | Endpoint            | Description          | Roles                              |
|--------|---------------------|----------------------|------------------------------------|
| GET    | /patients           | List patients        | DOCTOR, NURSE, RECEPTIONIST        |
| POST   | /patients           | Create patient       | DOCTOR, NURSE, RECEPTIONIST        |
| GET    | /patients/:id       | Get patient          | DOCTOR, NURSE                      |
| PATCH  | /patients/:id       | Update patient       | DOCTOR, NURSE                      |
| DELETE | /patients/:id       | Delete patient       | HOSPITAL_ADMIN                     |

## EMR

| Method | Endpoint                          | Description          |
|--------|-----------------------------------|----------------------|
| POST   | /emr/visits                       | Create visit         |
| GET    | /emr/visits/:id                   | Get visit details    |
| POST   | /emr/visits/:id/notes             | Add clinical note    |
| POST   | /emr/visits/:id/vitals            | Record vitals        |
| GET    | /emr/patients/:id/history         | Patient history      |

## Appointments

| Method | Endpoint               | Description             |
|--------|------------------------|-------------------------|
| GET    | /appointments          | List appointments       |
| POST   | /appointments          | Create appointment      |
| GET    | /appointments/:id      | Get appointment         |
| PATCH  | /appointments/:id      | Update appointment      |
| DELETE | /appointments/:id      | Cancel appointment      |

## Billing

| Method | Endpoint                  | Description          |
|--------|---------------------------|----------------------|
| GET    | /billing/invoices         | List invoices        |
| POST   | /billing/invoices         | Create invoice       |
| GET    | /billing/invoices/:id     | Get invoice          |
| PATCH  | /billing/invoices/:id     | Update invoice       |
| POST   | /billing/payments         | Process payment      |

## Pharmacy

| Method | Endpoint                     | Description          |
|--------|------------------------------|----------------------|
| GET    | /pharmacy/drugs              | List drugs           |
| POST   | /pharmacy/drugs              | Add drug             |
| PATCH  | /pharmacy/drugs/:id          | Update drug          |
| DELETE | /pharmacy/drugs/:id          | Delete drug          |
| GET    | /pharmacy/prescriptions      | List prescriptions   |
| POST   | /pharmacy/prescriptions      | Create prescription  |

## Laboratory

| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /laboratory/tests          | List lab tests       |
| POST   | /laboratory/tests          | Create lab test      |
| GET    | /laboratory/orders         | List orders          |
| POST   | /laboratory/orders         | Create order         |
| PATCH  | /laboratory/orders/:id     | Update order         |

## Radiology

| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /radiology/orders          | List orders          |
| POST   | /radiology/orders          | Create order         |
| GET    | /radiology/orders/:id      | Get order            |
| PATCH  | /radiology/orders/:id      | Update/report order  |

## Insurance

| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /insurance/policies        | List policies        |
| POST   | /insurance/policies        | Create policy        |
| GET    | /insurance/claims          | List claims          |
| POST   | /insurance/claims          | Submit claim         |
| PATCH  | /insurance/claims/:id      | Update claim         |

## Telemedicine

| Method | Endpoint                      | Description          |
|--------|-------------------------------|----------------------|
| GET    | /telemedicine/sessions        | List sessions        |
| POST   | /telemedicine/sessions        | Create session       |
| GET    | /telemedicine/sessions/:id    | Get session          |
| PATCH  | /telemedicine/sessions/:id    | Update session       |

## AI

| Method | Endpoint                              | Description                  |
|--------|---------------------------------------|------------------------------|
| POST   | /ai/analyze-symptoms                  | Analyze symptoms              |
| POST   | /ai/drug-interactions                 | Check drug interactions       |
| POST   | /ai/clinical-decision-support         | Clinical decision support     |

## Subscriptions

| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /subscriptions         | List subscriptions       |
| POST   | /subscriptions         | Create subscription      |
| GET    | /subscriptions/:id     | Get subscription         |
| PATCH  | /subscriptions/:id     | Update subscription      |
