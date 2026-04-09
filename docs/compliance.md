# Compliance & Security

## HIPAA Compliance

HMS+EMR is designed with HIPAA compliance in mind:

### Technical Safeguards
- **Encryption in transit**: All API communication over HTTPS/TLS 1.3
- **Encryption at rest**: Database encryption (AWS RDS/Azure with encryption enabled)
- **Authentication**: JWT-based auth with configurable expiry, MFA support
- **Authorization**: RBAC with principle of least privilege
- **Audit logs**: All data access logged with user ID, tenant, and timestamp
- **Session management**: Configurable JWT expiry, refresh tokens

### Administrative Safeguards
- Role-based access ensures staff only see data relevant to their role
- Tenant isolation prevents cross-hospital data access
- All users must authenticate before accessing PHI

### Physical Safeguards
- Deploy on HIPAA-eligible cloud infrastructure (AWS, Azure, GCP)
- Enable cloud provider HIPAA BAA

## Data Privacy

### GDPR
- Patient data can be exported (right to portability)
- Patient data can be deleted (right to erasure) via admin API
- Data processing agreements available for EU deployments

### Data Retention
- Configure retention periods per tenant
- Automated data archival after configurable periods

## Security Controls

### API Security
- Rate limiting: 100 requests/minute per IP (configurable)
- Request validation via class-validator
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via input sanitization

### Secrets Management
- Never commit secrets to source code
- Use environment variables or secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate JWT secrets regularly

### Dependency Security
- Automated vulnerability scanning via GitHub Dependabot
- Regular dependency updates

## Audit Trail

Every API request is logged with:
- Timestamp
- HTTP method and path
- User ID and role
- Tenant ID
- Response time

Audit logs are written to structured JSON logs compatible with ELK Stack, CloudWatch, or Datadog.
