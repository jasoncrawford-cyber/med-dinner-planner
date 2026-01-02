import { addDays, format, startOfWeek } from "date-fns";
import { MealType, Recipe, recipes } from "./recipes";

type HistoryRecord = Record<string, number>;

export type PlannerRequest = {
  breakfasts: number;
  lunches: number;
  dinners: number;
  weekOf?: string; // ISO date
};

export type PlannedMeal = {
  dayIndex: number;
  mealType: MealType;
  recipe: Recipe;
  dateLabel: string;
};

export type ShoppingLineItem = {
  item: string;
  quantity?: number;
  unit?: string;
};

export type PlannerResponse = {
  meals: PlannedMeal[];
  shoppingList: ShoppingLineItem[];
  updatedHistory: HistoryRecord;
};

const HISTORY_KEY = "med-planner-history";
const DAYS_TO_AVOID = 30;

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const loadRecentHistory = (): HistoryRecord => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) return {};

  const parsed = JSON.parse(stored) as HistoryRecord;
  const cutoff = Date.now() - DAYS_TO_AVOID * 24 * 60 * 60 * 1000;
  const filtered: HistoryRecord = {};
  Object.entries(parsed).forEach(([id, ts]) => {
    if (ts >= cutoff) filtered[id] = ts;
  });
  if (Object.keys(filtered).length !== Object.keys(parsed).length) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  }
  return filtered;
};

export const persistHistory = (history: HistoryRecord) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const pickRecipes = (
  mealType: MealType,
  count: number,
  recentHistory: Set<string>,
  chosen: Set<string>,
  beefAlreadyUsed: boolean,
): { selections: Recipe[]; beefUsed: boolean } => {
  const candidates = shuffle(
    recipes.filter((recipe) => recipe.mealType === mealType && !recentHistory.has(recipe.id)),
  );

  const selections: Recipe[] = [];
  let beefUsed = beefAlreadyUsed;

  candidates.forEach((recipe) => {
    if (selections.length >= count) return;
    if (chosen.has(recipe.id)) return;
    if (recipe.protein === "beef" && beefUsed) return;

    selections.push(recipe);
    chosen.add(recipe.id);
    if (recipe.protein === "beef") {
      beefUsed = true;
    }
  });

  if (selections.length < count) {
    throw new Error(`Not enough ${mealType} recipes available without repeats or beef overage.`);
  }

  return { selections, beefUsed };
};

const ensureSpanishOrMexican = (
  plan: Recipe[],
  recentHistory: Set<string>,
  chosen: Set<string>,
  beefUsed: boolean,
): { plan: Recipe[]; beefUsed: boolean } => {
  const hasIberian = plan.some((recipe) => ["spanish", "mexican"].includes(recipe.cuisine));
  if (hasIberian) return { plan, beefUsed };

  for (const toReplace of plan) {
    const candidate = shuffle(recipes).find((recipe) => {
      if (recipe.mealType !== toReplace.mealType) return false;
      if (!(["spanish", "mexican"].includes(recipe.cuisine))) return false;
      if (recentHistory.has(recipe.id) || chosen.has(recipe.id)) return false;
      if (recipe.protein === "beef" && beefUsed) return false;
      return true;
    });

    if (candidate) {
      const updatedPlan = plan.map((recipe) => (recipe.id === toReplace.id ? candidate : recipe));
      if (candidate.protein === "beef") beefUsed = true;
      chosen.delete(toReplace.id);
      chosen.add(candidate.id);
      return { plan: updatedPlan, beefUsed };
    }
  }

  throw new Error("No Spanish or Mexican recipes available that satisfy the rules.");
};

const buildDateLabels = (weekOf?: string, totalDays = 7): string[] => {
  const startDate = weekOf ? new Date(weekOf) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const labels: string[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    labels.push(format(addDays(startDate, i), "EEE, MMM d"));
  }
  return labels;
};

const aggregateShopping = (meals: Recipe[]): ShoppingLineItem[] => {
  const map = new Map<string, ShoppingLineItem>();
  meals.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = ingredient.item.toLowerCase();
      const existing = map.get(key);
      if (existing && existing.quantity && ingredient.quantity) {
        map.set(key, {
          ...existing,
          quantity: Math.round((existing.quantity + ingredient.quantity) * 100) / 100,
        });
      } else if (existing) {
        map.set(key, { ...existing, quantity: existing.quantity ?? ingredient.quantity, unit: existing.unit ?? ingredient.unit });
      } else {
        map.set(key, { ...ingredient });
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.item.localeCompare(b.item));
};

export const generateWeeklyPlan = (
  request: PlannerRequest,
  recentHistory: HistoryRecord,
): PlannerResponse => {
  const recentSet = new Set(Object.keys(recentHistory));
  const chosen = new Set<string>();

  let beefUsed = false;

  const breakfastResult = pickRecipes("breakfast", request.breakfasts, recentSet, chosen, beefUsed);
  beefUsed = breakfastResult.beefUsed;

  const lunchResult = pickRecipes("lunch", request.lunches, recentSet, chosen, beefUsed);
  beefUsed = lunchResult.beefUsed;

  const dinnerResult = pickRecipes("dinner", request.dinners, recentSet, chosen, beefUsed);
  beefUsed = dinnerResult.beefUsed;

  const allRecipes = [...breakfastResult.selections, ...lunchResult.selections, ...dinnerResult.selections];
  const ensured = ensureSpanishOrMexican(allRecipes, recentSet, chosen, beefUsed);

  const totalDays = Math.max(request.breakfasts, request.lunches, request.dinners, 5);
  const dateLabels = buildDateLabels(request.weekOf, totalDays);

  const meals: PlannedMeal[] = [];
  const addMeals = (mealType: MealType, selections: Recipe[]) => {
    selections.forEach((recipe, index) => {
      meals.push({
        dayIndex: index,
        mealType,
        recipe,
        dateLabel: dateLabels[index] ?? dateLabels[dateLabels.length - 1],
      });
    });
  };

  addMeals(
    "breakfast",
    ensured.plan.filter((recipe) => recipe.mealType === "breakfast"),
  );
  addMeals(
    "lunch",
    ensured.plan.filter((recipe) => recipe.mealType === "lunch"),
  );
  addMeals("dinner", ensured.plan.filter((recipe) => recipe.mealType === "dinner"));

  const shoppingList = aggregateShopping(ensured.plan);

  const updatedHistory: HistoryRecord = { ...recentHistory };
  const timestamp = Date.now();
  ensured.plan.forEach((recipe) => {
    updatedHistory[recipe.id] = timestamp;
  });

  return {
    meals,
    shoppingList,
    updatedHistory,
  };
};
