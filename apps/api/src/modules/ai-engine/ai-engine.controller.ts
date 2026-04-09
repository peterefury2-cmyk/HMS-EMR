import {
  Controller, Post, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiEngineService } from './ai-engine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('AI Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-engine')
export class AiEngineController {
  constructor(private readonly aiEngineService: AiEngineService) {}

  @Post('analyze-symptoms')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'AI-powered symptom analysis' })
  analyzeSymptoms(@Body() body: { symptoms: string[]; patientAge?: number; patientGender?: string }) {
    return this.aiEngineService.analyzeSymptoms(body.symptoms, body.patientAge, body.patientGender);
  }

  @Post('drug-interactions')
  @Roles(Role.DOCTOR, Role.PHARMACIST, Role.NURSE)
  @ApiOperation({ summary: 'Check drug interactions' })
  checkDrugInteractions(@Body() body: { drugs: string[] }) {
    return this.aiEngineService.checkDrugInteractions(body.drugs);
  }

  @Post('clinical-decision-support')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Clinical decision support' })
  clinicalDecisionSupport(
    @Body() body: {
      symptoms: string[];
      vitalSigns?: Record<string, number>;
      existingDiagnoses?: string[];
    },
  ) {
    return this.aiEngineService.clinicalDecisionSupport(body.symptoms, body.vitalSigns, body.existingDiagnoses);
  }
}
