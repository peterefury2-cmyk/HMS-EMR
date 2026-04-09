import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SymptomAnalysisResult {
  possibleConditions: Array<{ condition: string; probability: string; icdCode: string }>;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedActions: string[];
  disclaimer: string;
}

export interface DrugInteractionResult {
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
    description: string;
    recommendation: string;
  }>;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ClinicalDecisionResult {
  recommendations: Array<{ action: string; rationale: string; priority: number }>;
  differentialDiagnoses: string[];
  suggestedInvestigations: string[];
  redFlags: string[];
}

@Injectable()
export class AiEngineService {
  constructor(private configService: ConfigService) {}

  async analyzeSymptoms(symptoms: string[], patientAge?: number, patientGender?: string): Promise<SymptomAnalysisResult> {
    return {
      possibleConditions: [
        { condition: 'Common Cold', probability: 'HIGH', icdCode: 'J00' },
        { condition: 'Influenza', probability: 'MEDIUM', icdCode: 'J11' },
      ],
      urgencyLevel: 'LOW',
      recommendedActions: [
        'Rest and hydration',
        'Monitor temperature',
        'Consult physician if symptoms worsen',
      ],
      disclaimer: 'This is an AI-assisted analysis for informational purposes only. Always consult a qualified healthcare professional.',
    };
  }

  async checkDrugInteractions(drugs: string[]): Promise<DrugInteractionResult> {
    if (drugs.length < 2) {
      return { interactions: [], overallRisk: 'LOW' };
    }
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
    return {
      recommendations: [
        { action: 'Complete blood count (CBC)', rationale: 'Rule out infection', priority: 1 },
        { action: 'Metabolic panel', rationale: 'Assess organ function', priority: 2 },
      ],
      differentialDiagnoses: [
        'Viral upper respiratory infection',
        'Bacterial sinusitis',
      ],
      suggestedInvestigations: ['CBC', 'CRP', 'Throat swab culture'],
      redFlags: [],
    };
  }
}
