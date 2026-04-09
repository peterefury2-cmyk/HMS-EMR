import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AiSuggestion,
  AiSuggestionType,
  AiSuggestionStatus,
  Gender,
  Prisma,
} from '@prisma/client';
import { AnalyzeSymptomsDto } from './dto/analyze-symptoms.dto';

export interface PossibleCondition {
  condition: string;
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  icdCode: string;
}

export interface SymptomAnalysisResult {
  possibleConditions: PossibleCondition[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedActions: string[];
  disclaimer: string;
}

export interface DrugInteractionEntry {
  drug1: string;
  drug2: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  description: string;
  recommendation: string;
}

export interface DrugInteractionResult {
  interactions: DrugInteractionEntry[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ClinicalRecommendation {
  action: string;
  rationale: string;
  priority: number;
}

export interface ClinicalDecisionResult {
  recommendations: ClinicalRecommendation[];
  differentialDiagnoses: string[];
  suggestedInvestigations: string[];
  redFlags: string[];
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async analyzeSymptoms(
    dto: AnalyzeSymptomsDto,
    tenantId: string,
    patientId?: string,
  ): Promise<AiSuggestion> {
    // Stub logic - integrate real AI in production
    const result: SymptomAnalysisResult = {
      possibleConditions: [
        { condition: 'Common Cold', probability: 'HIGH', icdCode: 'J00' },
        { condition: 'Influenza', probability: 'MEDIUM', icdCode: 'J11' },
        { condition: 'COVID-19', probability: 'LOW', icdCode: 'U07.1' },
      ],
      urgencyLevel: this.calculateUrgency(dto.symptoms),
      recommendedActions: [
        'Rest and adequate hydration',
        'Monitor temperature every 4-6 hours',
        'Consult physician if symptoms worsen or persist beyond 7 days',
      ],
      disclaimer:
        'This is an AI-assisted analysis for informational purposes only. Always consult a qualified healthcare professional.',
    };

    return this.prisma.aiSuggestion.create({
      data: {
        tenantId,
        patientId: patientId ?? dto.patientId,
        type: AiSuggestionType.DIAGNOSIS,
        status: AiSuggestionStatus.PENDING,
        input: {
          symptoms: dto.symptoms,
          patientAge: dto.patientAge,
          patientGender: dto.patientGender,
        },
        output: result as unknown as Prisma.InputJsonValue,
        confidence: 0.75,
      },
    });
  }

  async checkDrugInteractions(drugs: string[], tenantId?: string): Promise<DrugInteractionResult> {
    if (drugs.length < 2) {
      return { interactions: [], overallRisk: 'LOW' };
    }

    // If tenantId provided, look up real interactions from DB
    if (tenantId) {
      const dbDrugs = await this.prisma.drug.findMany({
        where: { name: { in: drugs }, tenantId },
        select: { id: true, name: true },
      });

      if (dbDrugs.length >= 2) {
        const drugIds = dbDrugs.map((d) => d.id);
        const interactions = await this.prisma.drugInteraction.findMany({
          where: {
            OR: drugIds.flatMap((idA, i) =>
              drugIds.slice(i + 1).map((idB) => ({
                OR: [
                  { drugAId: idA, drugBId: idB },
                  { drugAId: idB, drugBId: idA },
                ],
              })),
            ),
          },
          include: { drugA: true, drugB: true },
        });

        if (interactions.length > 0) {
          return {
            interactions: interactions.map((i) => ({
              drug1: i.drugA.name,
              drug2: i.drugB.name,
              severity: i.severity as DrugInteractionEntry['severity'],
              description: i.description,
              recommendation: i.recommendation ?? 'Monitor patient closely',
            })),
            overallRisk: this.calcOverallRisk(interactions.map((i) => i.severity as string)),
          };
        }
      }
    }

    // Stub fallback
    return {
      interactions: [
        {
          drug1: drugs[0],
          drug2: drugs[1],
          severity: 'MINOR',
          description: 'Potential minor interaction detected. Stub implementation.',
          recommendation: 'Monitor patient for adverse effects',
        },
      ],
      overallRisk: 'LOW',
    };
  }

  async clinicalDecisionSupport(
    symptoms: string[],
    vitalSigns?: Record<string, number>,
    existingDiagnoses?: string[],
  ): Promise<ClinicalDecisionResult> {
    const redFlags: string[] = [];

    if (vitalSigns) {
      if ((vitalSigns['heartRate'] ?? 0) > 120) redFlags.push('Tachycardia detected');
      if ((vitalSigns['oxygenSaturation'] ?? 100) < 92) redFlags.push('Low oxygen saturation');
      if ((vitalSigns['temperature'] ?? 37) > 39) redFlags.push('High fever');
    }

    return {
      recommendations: [
        { action: 'Complete blood count (CBC)', rationale: 'Rule out infection/anaemia', priority: 1 },
        { action: 'Metabolic panel (BMP)', rationale: 'Assess organ function', priority: 2 },
        ...(redFlags.length > 0
          ? [{ action: 'Immediate physician review', rationale: 'Red flags detected', priority: 0 }]
          : []),
      ],
      differentialDiagnoses: [
        'Viral upper respiratory infection',
        'Bacterial sinusitis',
        ...(existingDiagnoses ?? []),
      ],
      suggestedInvestigations: ['CBC', 'CRP', 'Chest X-ray', 'Throat culture'],
      redFlags,
    };
  }

  private calculateUrgency(symptoms: string[]): SymptomAnalysisResult['urgencyLevel'] {
    const criticalKeywords = ['chest pain', 'shortness of breath', 'loss of consciousness'];
    const highKeywords = ['severe pain', 'high fever', 'bleeding'];
    const lower = symptoms.map((s) => s.toLowerCase());
    if (criticalKeywords.some((k) => lower.some((s) => s.includes(k)))) return 'CRITICAL';
    if (highKeywords.some((k) => lower.some((s) => s.includes(k)))) return 'HIGH';
    if (symptoms.length > 3) return 'MEDIUM';
    return 'LOW';
  }

  private calcOverallRisk(severities: string[]): DrugInteractionResult['overallRisk'] {
    if (severities.some((s) => s === 'CONTRAINDICATED' || s === 'MAJOR')) return 'HIGH';
    if (severities.some((s) => s === 'MODERATE')) return 'MEDIUM';
    return 'LOW';
  }
}

// Re-export Gender so controllers importing from this module don't need a separate import
export { Gender };

