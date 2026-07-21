export const featureFlags = {
  adultNutrition: process.env.EXPO_PUBLIC_ADULT_NUTRITION_ENABLED !== 'false',
  youthNutrition: process.env.EXPO_PUBLIC_YOUTH_NUTRITION_ENABLED === 'true',
  infantClinical: process.env.EXPO_PUBLIC_INFANT_CLINICAL_ENABLED === 'true',
  clinicalCloud: process.env.EXPO_PUBLIC_CLINICAL_CLOUD_ENABLED === 'true',
} as const;
