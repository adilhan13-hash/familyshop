"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  addDoc,
  collection,
  endAt,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAt,
  where,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type FridgeItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
};

type Recipe = {
  id: string;
  title: string;
  category?: string;
  cuisine?: string;
  difficulty?: string;
  cookingTime?: number;
  cookingTimeText?: string;
  description?: string;
  ingredientIds?: string[];
  optionalIngredientIds?: string[];
  ingredientNames?: Record<string, string>;
  ingredients?: string[];
  steps?: string[];
  searchTitle?: string;
  searchText?: string;
  aiCandidate?: boolean;
};

type MatchResult = {
  recipe: Recipe;
  score: number;
  haveIds: string[];
  missingIds: string[];
  total: number;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AiCookPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [searchRecipes, setSearchRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<MatchResult | null>(null);
  const [search, setSearch] = useState("");
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [loadingFridge, setLoadingFridge] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "fridge"),
      (snapshot) => {
        const items: FridgeItem[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.name) {
            items.push({
              id: document.id,
              name: data.name,
              productId: data.productId,
              ingredientId: data.ingredientId,
            });
          }
        });

        setFridgeItems(items);
        setLoadingFridge(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    async function loadCandidateRecipes() {
      try {
        setLoadingSuggestions(true);

        const recipesQuery = query(
          collection(db, "recipes"),
          where("aiCandidate", "==", true),
          limit(50)
        );

        const snapshot = await getDocs(recipesQuery);

        const items: Recipe[] = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<Recipe, "id">),
        }));

        setSuggestedRecipes(items);
      } catch (error) {
        console.error("AI CANDIDATE RECIPES LOAD ERROR", error);
      } finally {
        setLoadingSuggestions(false);
      }
    }

    loadCandidateRecipes();
  }, []);

  useEffect(() => {
    const text = normalizeText(search);

    setSearchRecipes([]);

    if (text.length < 2) {
      setLoadingSearch(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSearch(true);

        const recipesQuery = query(
          collection(db, "recipes"),
          orderBy("searchTitle"),
          startAt(text),
          endAt(text + "\uf8ff"),
          limit(20)
        );

        const snapshot = await getDocs(recipesQuery);

        const items: Recipe[] = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<Recipe, "id">),
        }));

        setSearchRecipes(items);
      } catch (error) {
        console.error("AI SEARCH RECIPES ERROR", error);
      } finally {
        setLoadingSearch(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [search]);

  const fridgeIngredientIds = useMemo(() => {
    const ids = fridgeItems
      .map((item) => item.ingredientId)
      .filter(Boolean) as string[];

    return Array.from(new Set(ids));
  }, [fridgeItems]);

  const fridgeNames = useMemo(() => {
    return fridgeItems.map((item) => normalizeText(item.name));
  }, [fridgeItems]);

  function getRecipeIngredientIds(recipe: Recipe) {
    if (recipe.ingredientIds && recipe.ingredientIds.length > 0) {
      return Array.from(new Set(recipe.ingredientIds));
    }

    if (recipe.ingredients && recipe.ingredients.length > 0) {
      return recipe.ingredients.map((name) => normalizeText(name));
    }

    return [];
  }

  function getIngredientLabel(recipe: Recipe, id: string) {
    if (recipe.ingredientNames?.[id]) {
      return recipe.ingredientNames[id];
    }

    if (recipe.ingredients?.length) {
      const found = recipe.ingredients.find(
        (name) => normalizeText(name) === normalizeText(id)
      );

      if (found) return found;
    }

    return id;
  }

  function buildMatch(recipe: Recipe): MatchResult {
    const allIds = getRecipeIngredientIds(recipe);
    const optionalIds = new Set(recipe.optionalIngredientIds || []);

    const requiredIds = allIds.filter((id) => !optionalIds.has(id));
    const idsForScore = requiredIds.length > 0 ? requiredIds : allIds;

    const fridgeIdSet = new Set(fridgeIngredientIds);

    const haveIds = idsForScore.filter((id) => {
      if (fridgeIdSet.has(id)) return true;

      const label = normalizeText(getIngredientLabel(recipe, id));

      return fridgeNames.some(
        (fridgeName) => fridgeName.includes(label) || label.includes(fridgeName)
      );
    });

    const missingIds = idsForScore.filter((id) => !haveIds.includes(id));

    const score =
      idsForScore.length === 0
        ? 0
        : Math.round((haveIds.length / idsForScore.length) * 100);

    return {
      recipe,
      score,
      haveIds,
      missingIds,
      total: idsForScore.length,
    };
  }

  const suggestedResults = useMemo(() => {
    return suggestedRecipes
      .map(buildMatch)
      .filter((result) => result.haveIds.length > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.missingIds.length - b.missingIds.length;
      });
  }, [suggestedRecipes, fridgeIngredientIds, fridgeNames]);

  const searchResults = useMemo(() => {
    return searchRecipes
      .map(buildMatch)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.missingIds.length - b.missingIds.length;
      });
  }, [searchRecipes, fridgeIngredientIds, fridgeNames]);

  function getRecipeTime(recipe: Recipe) {
    if (recipe.cookingTimeText) return recipe.cookingTimeText;
    if (recipe.cookingTime) return `${recipe.cookingTime} мин`;
    return "";
  }

  async function addMissingToShopping(result: MatchResult) {
    if (!familyId) return;

    for (const ingredientId of result.missingIds) {
      const name = getIngredientLabel(result.recipe, ingredientId);

      await addDoc(collection(db, "families", familyId, "shopping"), {
        name,
        ingredientId,
        createdAt: serverTimestamp(),
        source: "AI Cook",
        recipeId: result.recipe.id,
      });

      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_add_to_shopping",
        title: "AI добавил ингредиент",
        message: `${name} для блюда ${result.recipe.title}`,
        emoji: "🤖",
        itemName: name,
      });
    }

    setMessage(`Недостающие продукты для "${result.recipe.title}" добавлены в покупки.`);
  }

  function RecipeCard({ result }: { result: MatchResult }) {
    const recipe = result.recipe;

    return (
      <motion.button
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setSelectedRecipe(result);
          setMessage("");
        }}
        className="w-full rounded-3xl bg-white p-4 text-left shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              🍳 {recipe.title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {recipe.category || "Рецепт"}
              {getRecipeTime(recipe) ? ` · ${getRecipeTime(recipe)}` : ""}
            </p>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              result.score === 100
                ? "bg-green-100 text-green-700"
                : result.score >= 70
                ? "bg-orange-100 text-orange-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {result.score}%
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${
              result.score === 100
                ? "bg-green-500"
                : result.score >= 70
                ? "bg-orange-400"
                : "bg-slate-400"
            }`}
            style={{ width: `${result.score}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Есть {result.haveIds.length} из {result.total}
          {result.missingIds.length > 0
            ? ` · не хватает ${result.missingIds.length}`
            : " · можно готовить"}
        </p>
      </motion.button>
    );
  }

  const isSearchMode = normalizeText(search).length >= 2;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">AI Cook 🤖</h1>
          <p className="mt-1 text-sm text-slate-500">
            Подбор рецептов из холодильника без лишней нагрузки на базу
          </p>
        </header>

        <section className="space-y-4 px-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔍 Поиск рецепта от 2 букв"
            className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-4 text-base outline-none transition focus:border-blue-400"
          />

          <div className="grid grid-cols-2 gap-3">
            <Link href="/recipes" className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="text-2xl">📖</div>
              <div className="mt-2 font-semibold">Книга рецептов</div>
              <div className="mt-1 text-xs text-slate-500">Поиск отдельно</div>
            </Link>

            <button
              onClick={() => setIsFridgeOpen((prev) => !prev)}
              className="rounded-3xl bg-white p-4 text-left shadow-sm"
            >
              <div className="text-2xl">🥛</div>
              <div className="mt-2 font-semibold">Есть дома</div>
              <div className="mt-1 text-xs text-slate-500">
                {loadingFridge ? "Загрузка..." : `${fridgeItems.length} товаров`}
              </div>
            </button>
          </div>

          <AnimatePresence>
            {isFridgeOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                className="overflow-hidden rounded-3xl bg-white p-4 shadow-sm"
              >
                {fridgeItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Холодильник пуст.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {fridgeItems.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {message && (
            <div className="rounded-3xl bg-green-100 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {isSearchMode ? (
            <div>
              <h2 className="mb-3 text-xl font-bold">🔍 Результаты поиска</h2>

              {loadingSearch ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                  Ищу рецепты...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
                  <div className="text-4xl">🤔</div>
                  <h3 className="mt-3 text-lg font-semibold">Ничего не найдено</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Попробуй другое название блюда.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {searchResults.map((result) => (
                      <RecipeCard key={result.recipe.id} result={result} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-xl font-bold">🍳 Что можно приготовить</h2>

              {fridgeItems.length === 0 && !loadingFridge ? (
                <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
                  <div className="text-4xl">🥛</div>
                  <h3 className="mt-3 text-lg font-semibold">Холодильник пуст</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Купленные товары будут появляться в холодильнике.
                  </p>
                  <Link
                    href="/fridge"
                    className="mt-4 inline-block rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
                  >
                    Перейти в холодильник
                  </Link>
                </div>
              ) : loadingSuggestions ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                  Подбираю 50 рецептов...
                </div>
              ) : suggestedResults.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                  Пока нет подходящих рецептов.
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {suggestedResults.slice(0, 50).map((result) => (
                      <RecipeCard key={result.recipe.id} result={result} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </section>

        {selectedRecipe && (
          <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
            <div className="mx-auto flex max-h-full max-w-md flex-col rounded-3xl bg-white">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedRecipe.recipe.title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRecipe.recipe.category || "Рецепт"}
                      {getRecipeTime(selectedRecipe.recipe)
                        ? ` · ${getRecipeTime(selectedRecipe.recipe)}`
                        : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-5">
                <div className="mb-5 rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-500">Готовность</div>
                      <div className="text-2xl font-bold">
                        {selectedRecipe.score}%
                      </div>
                    </div>

                    <div className="text-sm text-slate-500">
                      Есть {selectedRecipe.haveIds.length} из {selectedRecipe.total}
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${selectedRecipe.score}%` }}
                    />
                  </div>
                </div>

                {selectedRecipe.recipe.description && (
                  <p className="mb-5 text-sm leading-6 text-slate-700">
                    {selectedRecipe.recipe.description}
                  </p>
                )}

                <h3 className="mb-2 font-semibold">Есть дома</h3>

                <div className="mb-5 space-y-2">
                  {selectedRecipe.haveIds.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Из нужных ингредиентов дома ничего нет.
                    </p>
                  ) : (
                    selectedRecipe.haveIds.map((id) => (
                      <div
                        key={id}
                        className="rounded-2xl bg-green-50 px-4 py-2 text-sm text-green-700"
                      >
                        ✓ {getIngredientLabel(selectedRecipe.recipe, id)}
                      </div>
                    ))
                  )}
                </div>

                {selectedRecipe.missingIds.length > 0 && (
                  <>
                    <h3 className="mb-2 font-semibold">Не хватает</h3>

                    <div className="mb-5 space-y-2">
                      {selectedRecipe.missingIds.map((id) => (
                        <div
                          key={id}
                          className="rounded-2xl bg-orange-50 px-4 py-2 text-sm text-orange-700"
                        >
                          + {getIngredientLabel(selectedRecipe.recipe, id)}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addMissingToShopping(selectedRecipe)}
                      className="mb-5 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
                    >
                      🛒 Добавить недостающее в покупки
                    </button>
                  </>
                )}

                <h3 className="mb-2 font-semibold">Приготовление</h3>

                <div className="space-y-3">
                  {(selectedRecipe.recipe.steps || []).map((step, index) => (
                    <div
                      key={`${step}-${index}`}
                      className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                    >
                      <b>Шаг {index + 1}.</b> {step}
                    </div>
                  ))}
                </div>

                {(!selectedRecipe.recipe.steps ||
                  selectedRecipe.recipe.steps.length === 0) && (
                  <p className="text-sm text-slate-500">
                    Шаги приготовления не указаны.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <BottomNav current="ai" />
      </div>
    </main>
  );
}