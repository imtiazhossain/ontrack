import { Redirect } from 'expo-router';

/** Legacy `/nutrition-profile` → profile stack (keeps bottom nav). */
export default function NutritionProfileLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/nutrition-profile" />;
}
