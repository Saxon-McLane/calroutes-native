import type { Difficulty } from "@/src/store/AppStore";

export function calculateCalories(
  weightKg: number,
  elapsedSeconds: number,
  difficulty: Difficulty
): number {
  const hours = elapsedSeconds / 3600;

  const met =
    difficulty === "easy" ? 3.3 : difficulty === "moderate" ? 4.3 : 5.0;

  const calories = met * weightKg * hours;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[calories]", {
      MET: met,
      weightKg,
      elapsedSeconds,
      calories,
    });
  }

  return calories;
}

