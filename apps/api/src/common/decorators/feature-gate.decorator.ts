import { SetMetadata } from '@nestjs/common';

export const FEATURE_GATE_KEY = 'featureGate';

export const FeatureGate = (feature: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(FEATURE_GATE_KEY, feature);
