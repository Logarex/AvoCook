import type {
  NutriScoreGrade,
  Nutrition,
  NutritionValue,
  Recipe
} from "./types";

export type HealthRecommendation =
  | "balanced"
  | "missingNutrition"
  | "highCalories"
  | "highSugar"
  | "highFat"
  | "highSalt"
  | "addFiber"
  | "goodProtein";

export type HealthFact = {
  labelKey: string;
  value: string;
};

export type HealthProfile = {
  grade: NutriScoreGrade;
  color: string;
  backgroundColor: string;
  facts: HealthFact[];
  hasNutrition: boolean;
  recommendations: HealthRecommendation[];
};

const scoreColors: Record<
  NutriScoreGrade,
  { backgroundColor: string; color: string }
> = {
  A: { backgroundColor: "#1B8F4B", color: "#FFFFFF" },
  B: { backgroundColor: "#70B744", color: "#12220E" },
  C: { backgroundColor: "#F2C84B", color: "#261D06" },
  D: { backgroundColor: "#EE8E2F", color: "#281203" },
  E: { backgroundColor: "#D64545", color: "#FFFFFF" },
  "?": { backgroundColor: "#8A8177", color: "#FFFFFF" }
};

export function getRecipeHealthProfile(recipe: Recipe): HealthProfile {
  const nutrition = normalizeNutritionNode(recipe.nutrition);
  const override = recipe.localMeta?.nutriScoreOverride;
  const calories = parseNutrient(nutrition?.calories);
  const sugar = parseNutrient(nutrition?.sugarContent);
  const fat = parseNutrient(nutrition?.fatContent);
  const saturatedFat = parseNutrient(nutrition?.saturatedFatContent);
  const sodium = parseNutrient(nutrition?.sodiumContent, "mg");
  const fiber = parseNutrient(nutrition?.fiberContent);
  const protein = parseNutrient(nutrition?.proteinContent);
  const hasNutrition = [calories, sugar, fat, saturatedFat, sodium, fiber, protein]
    .some((value) => value !== null);

  if (!hasNutrition) {
    return buildProfile(override ?? "?", false, [], ["missingNutrition"]);
  }

  let points = 0;
  const recommendations = new Set<HealthRecommendation>();

  if (calories !== null) {
    if (calories > 800) {
      points += 2;
      recommendations.add("highCalories");
    } else if (calories > 500) {
      points += 1;
      recommendations.add("highCalories");
    }
  }

  if (sugar !== null) {
    if (sugar > 30) {
      points += 2;
      recommendations.add("highSugar");
    } else if (sugar > 15) {
      points += 1;
      recommendations.add("highSugar");
    }
  }

  if (saturatedFat !== null && saturatedFat > 10) {
    points += 2;
    recommendations.add("highFat");
  } else if ((saturatedFat !== null && saturatedFat > 5) || (fat ?? 0) > 30) {
    points += 1;
    recommendations.add("highFat");
  }

  if (sodium !== null) {
    if (sodium > 1000) {
      points += 2;
      recommendations.add("highSalt");
    } else if (sodium > 600) {
      points += 1;
      recommendations.add("highSalt");
    }
  }

  if (fiber !== null && fiber >= 6) {
    points -= 1;
  } else {
    recommendations.add("addFiber");
  }

  if (protein !== null && protein >= 20) {
    points -= 1;
    recommendations.add("goodProtein");
  }

  if (recommendations.size === 0 || points <= 1) {
    recommendations.add("balanced");
  }

  const grade = override ?? pointsToGrade(points);
  const facts = [
    buildFact("recipes.health.calories", nutrition?.calories),
    buildFact("recipes.health.sugar", nutrition?.sugarContent),
    buildFact("recipes.health.fat", nutrition?.fatContent),
    buildFact("recipes.health.salt", nutrition?.sodiumContent),
    buildFact("recipes.health.fiber", nutrition?.fiberContent),
    buildFact("recipes.health.protein", nutrition?.proteinContent)
  ].filter((fact): fact is HealthFact => Boolean(fact));

  return buildProfile(grade, true, facts, Array.from(recommendations).slice(0, 3));
}

function buildProfile(
  grade: NutriScoreGrade,
  hasNutrition: boolean,
  facts: HealthFact[],
  recommendations: HealthRecommendation[]
): HealthProfile {
  const colors = scoreColors[grade];
  return {
    grade,
    color: colors.color,
    backgroundColor: colors.backgroundColor,
    facts,
    hasNutrition,
    recommendations
  };
}

function pointsToGrade(points: number): NutriScoreGrade {
  if (points <= 0) {
    return "A";
  }
  if (points <= 2) {
    return "B";
  }
  if (points <= 4) {
    return "C";
  }
  if (points <= 6) {
    return "D";
  }
  return "E";
}

function normalizeNutritionNode(
  nutrition?: Nutrition | Nutrition[] | null
): Nutrition | null {
  const node = Array.isArray(nutrition) ? nutrition[0] : nutrition;
  return node && typeof node === "object" ? node : null;
}

function parseNutrient(value?: NutritionValue | null, targetUnit?: "mg") {
  const normalized = normalizeNutrientText(value);
  if (!normalized) {
    return null;
  }

  const decimalValue = normalized.replace(",", ".");
  const match = decimalValue.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  if (
    targetUnit === "mg" &&
    /\bg\b/i.test(normalized) &&
    !/\bmg\b/i.test(normalized)
  ) {
    return amount * 1000;
  }

  return amount;
}

function buildFact(
  labelKey: string,
  value?: NutritionValue | null
): HealthFact | null {
  const normalized = normalizeNutrientText(value);
  if (!normalized) {
    return null;
  }

  return { labelKey, value: normalized };
}

function normalizeNutrientText(value?: NutritionValue | null) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return value.trim();
}
