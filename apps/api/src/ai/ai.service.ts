import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiSuggestionType, AiSuggestionStatus } from '@prisma/client';

interface PossibleCondition {
  condition: string;
  probability: string;
  icdCode: string;
}

interface SymptomAnalysisResult {
  possibleConditions: PossibleCondition[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedActions: string[];
  disclaimer: string;
}

interface DrugInteractionItem {
  drug1: string;
  drug2: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  description: string;
  recommendation: string;
}

interface DrugInteractionResult {
  interactions: DrugInteractionItem[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface ClinicalRecommendation {
  action: string;
  rationale: string;
  priority: number;
}

interface ClinicalDecisionResult {
  recommendations: ClinicalRecommendation[];
  differentialDiagnoses: string[];
  suggestedInvestigations: string[];
  redFlags: string[];
}

interface RiskScoreResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  recommendations: string[];
}

interface IcdSuggestionResult {
  suggestions: Array<{ code: string; description: string; confidence: number }>;
}

@Injectable()
export class AiService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async analyzeSymptoms(
    symptoms: string[],
    patientAge?: number,
    patientGender?: string,
  ): Promise<SymptomAnalysisResult> {
    // TODO: Integrate with external AI/ML service using patientAge and patientGender for personalized analysis
    const isHighUrgency = symptoms.some((s) =>
      ['chest pain', 'shortness of breath', 'severe headache'].includes(s.toLowerCase()),
    );
    return {
      possibleConditions: [
        { condition: 'Common Cold', probability: 'HIGH', icdCode: 'J00' },
        { condition: 'Influenza', probability: 'MEDIUM', icdCode: 'J11' },
      ],
      urgencyLevel: isHighUrgency ? 'HIGH' : 'LOW',
      recommendedActions: [
        'Rest and hydration',
        'Monitor temperature',
        'Consult physician if symptoms worsen',
      ],
      disclaimer:
        'This is an AI-assisted analysis for informational purposes only. Always consult a qualified healthcare professional.',
    };
  }

  async checkDrugInteractions(drugs: string[]): Promise<DrugInteractionResult> {
    if (drugs.length < 2) return { interactions: [], overallRisk: 'LOW' };
    return {
      interactions: [
        {
          drug1: drugs[0],
          drug2: drugs[1],
          severity: 'MINOR',
          description: 'Potential minor interaction detected',
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
    // TODO: Integrate with clinical decision support AI using symptoms, vitalSigns, and existingDiagnoses
    const hasHighVitals = vitalSigns && (vitalSigns['temperature'] > 38.5 || vitalSigns['heartRate'] > 100);
    const redFlags = hasHighVitals ? ['Elevated vitals detected — urgent review recommended'] : [];
    const hasPriorDiagnoses = existingDiagnoses && existingDiagnoses.length > 0;
    return {
      recommendations: [
        ...(hasPriorDiagnoses ? [{ action: 'Review prior diagnoses', rationale: 'Patient has existing conditions', priority: 1 }] : []),
        { action: 'Complete blood count (CBC)', rationale: 'Rule out infection', priority: hasPriorDiagnoses ? 2 : 1 },
        { action: 'Metabolic panel', rationale: 'Assess organ function', priority: hasPriorDiagnoses ? 3 : 2 },
      ],
      differentialDiagnoses: symptoms.length > 0
        ? ['Viral upper respiratory infection', 'Bacterial sinusitis']
        : ['General review recommended'],
      suggestedInvestigations: ['CBC', 'CRP', 'Throat swab culture'],
      redFlags,
    };
  }

  async computeRiskScore(
    visitId: string,
    patientAge: number,
    conditions: string[],
  ): Promise<RiskScoreResult> {
    let score = 0;
    if (patientAge > 65) score += 30;
    else if (patientAge > 50) score += 15;
    score += conditions.length * 10;
    score = Math.min(score, 100);

    const level: RiskScoreResult['level'] =
      score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';

    const result: RiskScoreResult = {
      score,
      level,
      factors: conditions,
      recommendations: level === 'HIGH' || level === 'CRITICAL' ? ['Immediate consultation required'] : [],
    };

    await this.prisma.aiSuggestion.create({
      data: {
        visitId,
        type: AiSuggestionType.RISK_SCORE,
        suggestion: result as unknown as Parameters<typeof this.prisma.aiSuggestion.create>[0]['data']['suggestion'],
        confidence: score / 100,
        reasoning: `Patient age: ${patientAge}, conditions: ${conditions.join(', ')}`,
      },
    });

    return result;
  }

  async suggestIcdCodes(visitId: string, symptoms: string[]): Promise<IcdSuggestionResult> {
    // Stub: map common symptom keywords to ICD codes
    const mapping: Record<string, { code: string; description: string }> = {
      fever: { code: 'R50.9', description: 'Fever, unspecified' },
      cough: { code: 'R05.9', description: 'Cough, unspecified' },
      headache: { code: 'R51.9', description: 'Headache, unspecified' },
      'chest pain': { code: 'R07.9', description: 'Chest pain, unspecified' },
      fatigue: { code: 'R53.83', description: 'Other fatigue' },
    };

    const suggestions = symptoms
      .map((s) => {
        const entry = mapping[s.toLowerCase()];
        return entry ? { ...entry, confidence: 0.8 } : null;
      })
      .filter((s): s is { code: string; description: string; confidence: number } => s !== null);

    const result: IcdSuggestionResult = { suggestions };

    await this.prisma.aiSuggestion.create({
      data: {
        visitId,
        type: AiSuggestionType.ICD_CODING,
        suggestion: result as unknown as Parameters<typeof this.prisma.aiSuggestion.create>[0]['data']['suggestion'],
        confidence: 0.75,
        reasoning: `Symptom-based ICD mapping for: ${symptoms.join(', ')}`,
      },
    });

    return result;
  }

  async reviewSuggestion(
    suggestionId: string,
    reviewedBy: string,
    status: AiSuggestionStatus,
  ): Promise<{ id: string; status: AiSuggestionStatus }> {
    return this.prisma.aiSuggestion.update({
      where: { id: suggestionId },
      data: { status, reviewedBy, reviewedAt: new Date() },
      select: { id: true, status: true },
    });
  }
}
