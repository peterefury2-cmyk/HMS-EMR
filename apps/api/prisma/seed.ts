import { PrismaClient, TenantPlan, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const FEATURE_FLAGS: Array<{ plan: TenantPlan; feature: string; enabled: boolean; limit?: number }> = [
  // STARTER plan
  { plan: TenantPlan.STARTER, feature: 'emr', enabled: true },
  { plan: TenantPlan.STARTER, feature: 'appointments', enabled: true, limit: 100 },
  { plan: TenantPlan.STARTER, feature: 'billing', enabled: true },
  { plan: TenantPlan.STARTER, feature: 'pharmacy', enabled: true },
  { plan: TenantPlan.STARTER, feature: 'laboratory', enabled: true },
  { plan: TenantPlan.STARTER, feature: 'telemedicine', enabled: false },
  { plan: TenantPlan.STARTER, feature: 'ai', enabled: false },
  { plan: TenantPlan.STARTER, feature: 'radiology', enabled: false },
  { plan: TenantPlan.STARTER, feature: 'insurance', enabled: false },
  { plan: TenantPlan.STARTER, feature: 'analytics', enabled: false },
  { plan: TenantPlan.STARTER, feature: 'fhir', enabled: false },
  // PROFESSIONAL plan
  { plan: TenantPlan.PROFESSIONAL, feature: 'emr', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'appointments', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'billing', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'pharmacy', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'laboratory', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'telemedicine', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'ai', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'radiology', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'insurance', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'analytics', enabled: true },
  { plan: TenantPlan.PROFESSIONAL, feature: 'fhir', enabled: false },
  // ENTERPRISE plan
  { plan: TenantPlan.ENTERPRISE, feature: 'emr', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'appointments', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'billing', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'pharmacy', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'laboratory', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'telemedicine', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'ai', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'radiology', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'insurance', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'analytics', enabled: true },
  { plan: TenantPlan.ENTERPRISE, feature: 'fhir', enabled: true },
  // GOVERNMENT plan (same as Enterprise)
  { plan: TenantPlan.GOVERNMENT, feature: 'emr', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'appointments', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'billing', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'pharmacy', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'laboratory', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'telemedicine', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'ai', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'radiology', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'insurance', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'analytics', enabled: true },
  { plan: TenantPlan.GOVERNMENT, feature: 'fhir', enabled: true },
];

const ICD_CODES = [
  { code: 'J00', description: 'Acute nasopharyngitis (common cold)', category: 'Respiratory' },
  { code: 'J11.1', description: 'Influenza with other respiratory manifestations, virus not identified', category: 'Respiratory' },
  { code: 'A09', description: 'Other and unspecified gastroenteritis and colitis of infectious and unspecified origin', category: 'Infectious' },
  { code: 'K21.0', description: 'Gastroesophageal reflux disease with esophagitis', category: 'Digestive' },
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
  { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },
  { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Mental Health' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Genitourinary' },
  { code: 'L30.9', description: 'Dermatitis, unspecified', category: 'Dermatology' },
  { code: 'B34.9', description: 'Viral infection, unspecified', category: 'Infectious' },
  { code: 'R51.9', description: 'Headache, unspecified', category: 'Symptoms' },
];

async function seedFeatureFlags() {
  console.log('Seeding feature flags...');
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { plan_feature: { plan: flag.plan, feature: flag.feature } },
      create: flag,
      update: { enabled: flag.enabled, limit: flag.limit },
    });
  }
  console.log(`Seeded ${FEATURE_FLAGS.length} feature flags`);
}

async function seedDemoTenant() {
  console.log('Seeding demo tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-hospital' },
    create: {
      name: 'Demo Hospital',
      slug: 'demo-hospital',
      plan: TenantPlan.PROFESSIONAL,
    },
    update: { plan: TenantPlan.PROFESSIONAL },
  });
  console.log(`Demo tenant: ${tenant.id}`);
  return tenant;
}

async function seedAdminUser(tenantId: string) {
  console.log('Seeding admin user...');
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hms-emr.com' },
    create: {
      email: 'admin@hms-emr.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.HOSPITAL_ADMIN,
      tenantId,
      isActive: true,
    },
    update: { passwordHash },
  });
  console.log(`Admin user: ${admin.id} (${admin.email})`);
  return admin;
}

async function main() {
  console.log('Starting seed...');

  await seedFeatureFlags();
  const tenant = await seedDemoTenant();
  await seedAdminUser(tenant.id);

  // Log ICD codes as reference data (not persisted - stored in diagnoses)
  console.log(`\nSample ICD codes for reference (${ICD_CODES.length} entries):`);
  for (const code of ICD_CODES) {
    console.log(`  ${code.code}: ${code.description} [${code.category}]`);
  }

  console.log('\nSeed completed successfully!');
  console.log('\nDemo credentials:');
  console.log('  Email: admin@hms-emr.com');
  console.log('  Password: Admin@123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
