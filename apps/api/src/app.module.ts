import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { PatientsModule } from './patients/patients.module';
import { EmrModule } from './emr/emr.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { BillingModule } from './billing/billing.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { RadiologyModule } from './radiology/radiology.module';
import { InsuranceModule } from './insurance/insurance.module';
import { TelemedicineModule } from './telemedicine/telemedicine.module';
import { AiModule } from './ai/ai.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FhirModule } from './fhir/fhir.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    PatientsModule,
    EmrModule,
    AppointmentsModule,
    BillingModule,
    PharmacyModule,
    LaboratoryModule,
    RadiologyModule,
    InsuranceModule,
    TelemedicineModule,
    AiModule,
    SubscriptionsModule,
    NotificationsModule,
    AnalyticsModule,
    FhirModule,
    JobsModule,
  ],
})
export class AppModule {}
