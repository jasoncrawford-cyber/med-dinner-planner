"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek } from "date-fns";
import {
  PlannerRequest,
  PlannerResponse,
  generateWeeklyPlan,
  loadRecentHistory,
  persistHistory,
} from "@/lib/planner";
import { recipes } from "@/lib/recipes";

type FormState = PlannerRequest & { showDetails: boolean };

const defaultWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

const defaultState: FormState = {
  breakfasts: 2,
  lunches: 3,
  dinners: 5,
  weekOf: defaultWeekStart,
  showDetails: true,
};

const mealOptions = Array.from({ length: 7 }, (_, i) => i + 1);

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultState);
  const [history, setHistory] = useState<Record<string, number>>({});
  const [plan, setPlan] = useState<PlannerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHistory(loadRecentHistory());
  }, []);

  const totalRecipes = useMemo(() => recipes.length, []);

  const handleChange = (key: keyof FormState, value: number | string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { showDetails, ...request } = form;
      const result = generateWeeklyPlan(request, history);
      setPlan(result);
      setHistory(result.updatedHistory);
      persistHistory(result.updatedHistory);
    } catch (err) {
      setPlan(null);
      setError(err instanceof Error ? err.message : "Unable to build plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 p-6 sm:p-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">Mediterranean Meal Planner</h1>
        <p className="max-w-3xl text-slate-600">
          Plan breakfasts, lunches, and dinners for the week with authentic Mediterranean-leaning recipes.
          The planner caps beef to once per week, avoids canned fish, requires a Spanish or Mexican pick, and
          keeps a 30-day history to prevent repeats.
        </p>
      </header>

      <section className="section-card">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Tell us what you need</h2>
            <p className="text-sm text-slate-500">{totalRecipes} curated recipes available</p>
          </div>
          <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Week of</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 shadow-sm"
                value={form.weekOf}
                onChange={(e) => handleChange("weekOf", e.target.value)}
              />
              <p className="text-xs text-slate-500">Used to label days in the plan.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">How many meals this week?</label>
              <div className="grid grid-cols-3 gap-3">
                {["breakfasts", "lunches", "dinners"].map((key) => (
                  <div key={key} className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-800"
                      value={form[key as keyof FormState] as number}
                      onChange={(e) => handleChange(key as keyof FormState, Number(e.target.value))}
                    >
                      {mealOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.showDetails}
                  onChange={(e) => handleChange("showDetails", e.target.checked)}
                />
                Show recipe summaries
              </label>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-amber-600 px-5 py-3 text-white shadow-lg shadow-amber-200 transition hover:bg-amber-700"
                disabled={loading}
              >
                {loading ? "Building your plan..." : "Generate weekly plan"}
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        </div>
      </section>

      {plan && (
        <section className="section-card">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-title">Your Mediterranean week</h2>
              <div className="flex flex-wrap gap-2">
                <span className="tag">Beef limited to once</span>
                <span className="tag">Fresh fish only</span>
                <span className="tag">Spanish / Mexican included</span>
                <span className="tag">No repeats for 30 days</span>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {plan.meals.map((meal) => (
                <article key={`${meal.mealType}-${meal.recipe.id}-${meal.dayIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{meal.dateLabel}</p>
                      <h3 className="text-lg font-semibold capitalize text-slate-900">
                        {meal.mealType}: {meal.recipe.name}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <span className="tag capitalize">{meal.recipe.cuisine}</span>
                      <span className="tag capitalize">{meal.recipe.protein}</span>
                    </div>
                  </div>
                  {form.showDetails && <p className="mt-2 text-sm text-slate-700">{meal.recipe.summary}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <a href={meal.recipe.url} target="_blank" rel="noreferrer" className="font-medium">
                      View full recipe ↗
                    </a>
                    <span className="text-xs text-slate-500">Serves {meal.recipe.servings}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {plan && (
        <section className="section-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Shopping list (combined)</h2>
              <p className="text-sm text-slate-500">Quantities are summed when provided.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {plan.shoppingList.map((item) => (
                <div key={item.item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-800">{item.item}</p>
                  <p className="text-sm text-slate-600">
                    {item.quantity ? item.quantity : "As needed"} {item.unit ?? ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
