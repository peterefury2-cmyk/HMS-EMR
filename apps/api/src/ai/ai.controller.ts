import {
  Controller, Post, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AnalyzeSymptomsDto } from './dto/analyze-symptoms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { RequestWithUser } from '../common/types/request-with-user.type';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-symptoms')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'AI-powered symptom analysis' })
  analyzeSymptoms(@Body() dto: AnalyzeSymptomsDto, @Request() req: RequestWithUser) {
    return this.aiService.analyzeSymptoms(dto, req.user.tenantId);
  }

  @Post('drug-interactions')
  @Roles(Role.DOCTOR, Role.PHARMACIST, Role.NURSE)
  @ApiOperation({ summary: 'Check drug interactions' })
  checkDrugInteractions(
    @Body() body: { drugs: string[] },
    @Request() req: RequestWithUser,
  ) {
    return this.aiService.checkDrugInteractions(body.drugs, req.user.tenantId);
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
    return this.aiService.clinicalDecisionSupport(
      body.symptoms,
      body.vitalSigns,
      body.existingDiagnoses,
    );
  }
}
