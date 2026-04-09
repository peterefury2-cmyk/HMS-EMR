import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Pharmacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('drugs')
  @Roles(Role.PHARMACIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List drugs' })
  findAllDrugs(@Request() req: any) {
    return this.pharmacyService.findAllDrugs(req.user.tenantId);
  }

  @Post('drugs')
  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Add drug to inventory' })
  createDrug(@Request() req: any, @Body() body: any) {
    return this.pharmacyService.createDrug(body, req.user.tenantId);
  }

  @Patch('drugs/:id')
  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Update drug' })
  updateDrug(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.pharmacyService.updateDrug(id, req.user.tenantId, body);
  }

  @Delete('drugs/:id')
  @Roles(Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'Remove drug' })
  removeDrug(@Request() req: any, @Param('id') id: string) {
    return this.pharmacyService.removeDrug(id, req.user.tenantId);
  }

  @Get('prescriptions')
  @Roles(Role.PHARMACIST, Role.DOCTOR, Role.HOSPITAL_ADMIN)
  @ApiOperation({ summary: 'List prescriptions' })
  findAllPrescriptions(@Request() req: any) {
    return this.pharmacyService.findAllPrescriptions(req.user.tenantId);
  }

  @Post('prescriptions')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create prescription' })
  createPrescription(@Request() req: any, @Body() body: any) {
    return this.pharmacyService.createPrescription(body, req.user.tenantId);
  }

  @Patch('prescriptions/:id/dispense')
  @Roles(Role.PHARMACIST)
  @ApiOperation({ summary: 'Dispense prescription' })
  dispense(@Request() req: any, @Param('id') id: string) {
    return this.pharmacyService.dispensePrescription(id, req.user.tenantId, req.user.userId);
  }
}
