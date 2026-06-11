"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "../../components/BottomNav";
import { db } from "../../lib/firebase";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

type Recipe = {
  id: string;
  title: string;
  category?: string;
  cuisine?: string;
  difficulty?: string;
  cookingTime?: number | string;
  cookingTimeText?: string;
  description?: string;
  ingredients?: string[];
  ingredientNames?: string[];
  ingredientIds?: string[];
  steps?: string[];
  tags?: string[];
};

type Ingredient = {
  id: string;
  name: string;
  icon?: string;
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredientsMap, setIngredientsMap] = useState<
    Record<string, Ingredient>
  >({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const q = query(collection(db, "recipes"), orderBy("title"), limit(1000));

    const unsub = onSnapshot(q, (snap) => {
      const data: Recipe[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Recipe, "id">),
      }));

      setRecipes(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ingredients"), (snap) => {
      const map: Record<string, Ingredient> = {};

      snap.docs.forEach((doc) => {
        const data = doc.data() as Ingredient;

        map[doc.id] = {
          id: doc.id,
          name: data.name,
          icon: data.icon,
        };
      });

      setIngredientsMap(map);
    });

    return () => unsub();
  }, []);

  const categories = useMemo(() => {
    const list = recipes.map((r) => r.category).filter(Boolean) as string[];
    return ["Все", ...Array.from(new Set(list))];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const text = search.toLowerCase().trim();
      const title = recipe.title?.toLowerCase() || "";

      const ingredientText = (recipe.ingredientIds || [])
        .map((id) => ingredientsMap[id]?.name || id)
        .join(" ")
        .toLowerCase();

      const matchSearch =
        !text ||
        title.includes(text) ||
        ingredientText.includes(text) ||
        recipe.description?.toLowerCase().includes(text);

      const matchCategory =
        category === "Все" || recipe.category === category;

      return matchSearch && matchCategory;
    });
  }, [recipes, search, category, ingredientsMap]);

  const getCookingTime = (recipe: Recipe) => {
    if (recipe.cookingTimeText) return recipe.cookingTimeText;
    if (recipe.cookingTime) return `${recipe.cookingTime} мин`;
    return "";
  };

  const getIngredientLabel = (id: string) => {
    const ingredient = ingredientsMap[id];

    if (!ingredient) return id;

    return `${ingredient.icon || ""} ${ingredient.name}`.trim();
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="mb-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Кулинарная книга
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {recipes.length} рецептов в базе
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск блюда или ингредиента..."
          className="mb-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
        />

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                category === cat
                  ? "bg-black text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="w-full rounded-3xl bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {recipe.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {recipe.category || "Без категории"}
                    {getCookingTime(recipe) ? ` · ${getCookingTime(recipe)}` : ""}
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {recipe.difficulty || "Рецепт"}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                {recipe.description || "Открыть рецепт приготовления"}
              </p>
            </button>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="mt-10 text-center text-sm text-gray-500">
            Ничего не найдено
          </div>
        )}
      </div>

      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
          <div className="mx-auto flex max-h-full max-w-md flex-col rounded-3xl bg-white">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedRecipe.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedRecipe.category || "Рецепт"}
                    {getCookingTime(selectedRecipe)
                      ? ` · ${getCookingTime(selectedRecipe)}`
                      : ""}
                  </p>

                  {selectedRecipe.cuisine && (
                    <p className="mt-1 text-sm text-gray-400">
                      {selectedRecipe.cuisine}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="rounded-full bg-gray-100 px-3 py-2 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5">
              {selectedRecipe.description && (
                <p className="mb-5 text-sm leading-6 text-gray-700">
                  {selectedRecipe.description}
                </p>
              )}

              <h3 className="mb-2 font-semibold text-gray-900">
                Ингредиенты
              </h3>

              <ul className="mb-5 space-y-2">
                {(selectedRecipe.ingredientIds || []).map((id, index) => (
                  <li
                    key={`${id}-${index}`}
                    className="rounded-2xl bg-gray-50 px-4 py-2 text-sm text-gray-700"
                  >
                    {getIngredientLabel(id)}
                  </li>
                ))}
              </ul>

              {(!selectedRecipe.ingredientIds ||
                selectedRecipe.ingredientIds.length === 0) && (
                <p className="mb-5 text-sm text-gray-500">
                  Ингредиенты не указаны.
                </p>
              )}

              <h3 className="mb-2 font-semibold text-gray-900">
                Приготовление
              </h3>

              <div className="space-y-3">
                {(selectedRecipe.steps || []).map((step, index) => (
                  <div
                    key={index}
                    className="rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700"
                  >
                    <b>Шаг {index + 1}.</b> {step}
                  </div>
                ))}
              </div>

              {(!selectedRecipe.steps || selectedRecipe.steps.length === 0) && (
                <p className="text-sm text-gray-500">
                  Шаги приготовления не указаны.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}