import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() body: any) {
    return this.tenantsService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.tenantsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
