import {
  Controller, Post, Get, Body, UseGuards, Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-symptoms')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'AI-powered symptom analysis' })
  analyzeSymptoms(
    @Body() body: { symptoms: string[]; patientAge?: number; patientGender?: string },
  ): Promise<unknown> {
    return this.aiService.analyzeSymptoms(body.symptoms, body.patientAge, body.patientGender);
  }

  @Post('drug-interactions')
  @Roles(Role.DOCTOR, Role.PHARMACIST, Role.NURSE)
  @ApiOperation({ summary: 'Check drug interactions' })
  checkDrugInteractions(@Body() body: { drugs: string[] }): Promise<unknown> {
    return this.aiService.checkDrugInteractions(body.drugs);
  }

  @Post('clinical-decision-support')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Clinical decision support' })
  clinicalDecisionSupport(
    @Body()
    body: {
      symptoms: string[];
      vitalSigns?: Record<string, number>;
      existingDiagnoses?: string[];
    },
  ): Promise<unknown> {
    return this.aiService.clinicalDecisionSupport(body.symptoms, body.vitalSigns, body.existingDiagnoses);
  }

  @Post('risk-score')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Compute patient risk score' })
  computeRiskScore(
    @Body() body: { visitId: string; patientAge: number; conditions: string[] },
  ): Promise<unknown> {
    return this.aiService.computeRiskScore(body.visitId, body.patientAge, body.conditions);
  }

  @Post('icd-suggest')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Suggest ICD codes from symptoms' })
  suggestIcdCodes(
    @Body() body: { visitId: string; symptoms: string[] },
  ): Promise<unknown> {
    return this.aiService.suggestIcdCodes(body.visitId, body.symptoms);
  }

  @Post('suggestions/:id/review')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Review an AI suggestion' })
  reviewSuggestion(
    @Param('id') id: string,
    @Body() body: { reviewedBy: string; status: 'ACCEPTED' | 'REJECTED' | 'MODIFIED' },
  ): Promise<unknown> {
    return this.aiService.reviewSuggestion(id, body.reviewedBy, body.status as Parameters<typeof this.aiService.reviewSuggestion>[2]);
  }
}
