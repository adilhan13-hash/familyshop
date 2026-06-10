"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { addActivity } from "../../lib/activity";
import { Recipe, recipes } from "./recipes";

type FridgeItem = {
  id: string;
  name: string;
};

type MatchResult = {
  recipe: Recipe;
  score: number;
  requiredTotal: number;
  requiredHave: number;
  optionalTotal: number;
  optionalHave: number;
  missingRequired: string[];
  missingOptional: string[];
};

const ACTIVE_RECIPES_KEY = "familyshop_active_recipe_ids";

function normalizeProductName(value: string) {
  return value
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();
}

function getCleanName(value: string) {
  return value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function groupByCategory(items: MatchResult[]) {
  return items.reduce<Record<string, MatchResult[]>>((acc, item) => {
    const category = item.recipe.category;

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(item);
    return acc;
  }, {});
}

function saveActiveRecipeIds(ids: string[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ACTIVE_RECIPES_KEY, JSON.stringify(ids));
}

function loadActiveRecipeIds() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(ACTIVE_RECIPES_KEY);

    if (!value) return [];

    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

export default function AiCookPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<MatchResult | null>(null);
  const [activeRecipeIds, setActiveRecipeIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    {}
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    setActiveRecipeIds(loadActiveRecipeIds());
  }, []);

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
            });
          }
        });

        setFridgeItems(items);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  const fridgeNames = useMemo(() => {
    return fridgeItems.map((item) => normalizeProductName(item.name));
  }, [fridgeItems]);

  const matchResults = useMemo<MatchResult[]>(() => {
    return recipes
      .map((recipe) => {
        const requiredIngredients = recipe.ingredients.filter(
          (ingredient) => !ingredient.optional
        );

        const optionalIngredients = recipe.ingredients.filter(
          (ingredient) => ingredient.optional
        );

        const missingRequired = requiredIngredients
          .filter(
            (ingredient) =>
              !fridgeNames.includes(normalizeProductName(ingredient.name))
          )
          .map((ingredient) => ingredient.name);

        const missingOptional = optionalIngredients
          .filter(
            (ingredient) =>
              !fridgeNames.includes(normalizeProductName(ingredient.name))
          )
          .map((ingredient) => ingredient.name);

        const requiredHave =
          requiredIngredients.length - missingRequired.length;

        const optionalHave =
          optionalIngredients.length - missingOptional.length;

        const requiredScore =
          requiredIngredients.length === 0
            ? 100
            : Math.round((requiredHave / requiredIngredients.length) * 100);

        const optionalBonus =
          optionalIngredients.length === 0
            ? 0
            : Math.round((optionalHave / optionalIngredients.length) * 8);

        const score = Math.min(100, requiredScore + optionalBonus);

        return {
          recipe,
          score,
          requiredTotal: requiredIngredients.length,
          requiredHave,
          optionalTotal: optionalIngredients.length,
          optionalHave,
          missingRequired,
          missingOptional,
        };
      })
      .filter((result) => result.requiredHave > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        if (a.missingRequired.length !== b.missingRequired.length) {
          return a.missingRequired.length - b.missingRequired.length;
        }

        return a.recipe.title.localeCompare(b.recipe.title, "ru");
      });
  }, [fridgeNames]);

  const activeRecipes = useMemo(() => {
    return activeRecipeIds
      .map((recipeId) =>
        matchResults.find((result) => result.recipe.id === recipeId)
      )
      .filter((result): result is MatchResult => Boolean(result));
  }, [activeRecipeIds, matchResults]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return matchResults;

    return matchResults.filter((result) => {
      const titleMatch = result.recipe.title.toLowerCase().includes(query);
      const categoryMatch = result.recipe.category.toLowerCase().includes(query);
      const ingredientMatch = result.recipe.ingredients.some((ingredient) =>
        ingredient.name.toLowerCase().includes(query)
      );

      return titleMatch || categoryMatch || ingredientMatch;
    });
  }, [matchResults, search]);

  const readyResults = useMemo(() => {
    return filteredResults.filter(
      (result) => result.missingRequired.length === 0
    );
  }, [filteredResults]);

  const almostResults = useMemo(() => {
    return filteredResults.filter(
      (result) => result.missingRequired.length > 0 && result.score >= 70
    );
  }, [filteredResults]);

  const otherResults = useMemo(() => {
    return filteredResults.filter((result) => result.score < 70);
  }, [filteredResults]);

  const groupedAlmost = useMemo(
    () => groupByCategory(almostResults),
    [almostResults]
  );

  const groupedOther = useMemo(
    () => groupByCategory(otherResults),
    [otherResults]
  );

  function toggleCategory(category: string) {
    setOpenCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  async function addActiveRecipe(recipeId: string) {
    const recipe = recipes.find((item) => item.id === recipeId);

    setActiveRecipeIds((current) => {
      if (current.includes(recipeId)) {
        return current;
      }

      const updated = [recipeId, ...current];

      saveActiveRecipeIds(updated);

      return updated;
    });

    if (familyId && recipe) {
      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_recipe_active",
        title: "Добавил блюдо в готовку",
        message: recipe.title,
        emoji: "👨‍🍳",
        itemName: recipe.title,
      });
    }

    setMessage("Блюдо добавлено в «Готовлю сейчас».");
  }

  async function removeActiveRecipe(recipeId: string) {
    const recipe = recipes.find((item) => item.id === recipeId);

    setActiveRecipeIds((current) => {
      const updated = current.filter((id) => id !== recipeId);

      saveActiveRecipeIds(updated);

      return updated;
    });

    if (familyId && recipe) {
      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_recipe_remove",
        title: "Убрал блюдо из готовки",
        message: recipe.title,
        emoji: "🗑️",
        itemName: recipe.title,
      });
    }
  }

  async function clearActiveRecipes() {
    setActiveRecipeIds([]);
    setMessage("");
    saveActiveRecipeIds([]);

    if (familyId) {
      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_recipes_clear",
        title: "Очистил готовку",
        message: "Очистил список «Готовлю сейчас»",
        emoji: "🧹",
        itemName: "Готовлю сейчас",
      });
    }
  }

  function openRecipe(result: MatchResult) {
    setSelectedRecipe(result);
  }

  async function addIngredientsToShopping(
    result: MatchResult,
    ingredients: string[],
    label: string
  ) {
    if (!familyId) return;

    for (const ingredientName of ingredients) {
      await addDoc(collection(db, "families", familyId, "shopping"), {
        name: ingredientName,
        createdAt: new Date(),
        source: "AI Cook",
        recipeId: result.recipe.id,
      });

      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_add_to_shopping",
        title: "AI добавил ингредиент",
        message: `${ingredientName} для блюда ${result.recipe.title}`,
        emoji: "🤖",
        itemName: ingredientName,
      });
    }

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "ai_recipe_selected",
      title: "Выбрал рецепт",
      message: result.recipe.title,
      emoji: "🍳",
      itemName: result.recipe.title,
    });

    await addActiveRecipe(result.recipe.id);
    setMessage(`${label} для "${result.recipe.title}" добавлены в покупки.`);
  }

  function RecipeCard({
    result,
    compact = false,
    showRemove = false,
  }: {
    result: MatchResult;
    compact?: boolean;
    showRemove?: boolean;
  }) {
    const isActive = activeRecipeIds.includes(result.recipe.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="rounded-3xl bg-slate-50 p-4"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => openRecipe(result)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-bold">
                {result.recipe.emoji} {result.recipe.title}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                ⏱ {result.recipe.time} · 🍽 {result.recipe.portions}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                ⭐ {result.recipe.difficulty}
              </div>
            </div>

            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                result.score === 100
                  ? "bg-green-500 text-white"
                  : result.score >= 70
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {result.score}%
            </div>
          </div>

          {!compact && (
            <>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.score}%` }}
                  transition={{ duration: 0.45 }}
                  className={`h-2 rounded-full ${
                    result.score === 100
                      ? "bg-green-500"
                      : result.score >= 70
                      ? "bg-green-400"
                      : "bg-orange-400"
                  }`}
                />
              </div>

              {result.missingRequired.length > 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Не хватает: {result.missingRequired.slice(0, 4).join(", ")}
                  {result.missingRequired.length > 4 ? "..." : ""}
                </p>
              ) : (
                <p className="mt-3 text-sm font-medium text-green-600">
                  Все основные ингредиенты есть
                </p>
              )}

              {result.missingOptional.length > 0 && (
                <p className="mt-1 text-sm text-orange-500">
                  Желательно: {result.missingOptional.slice(0, 3).join(", ")}
                  {result.missingOptional.length > 3 ? "..." : ""}
                </p>
              )}
            </>
          )}
        </motion.button>

        <div className="mt-3 flex gap-2">
          {!isActive && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => addActiveRecipe(result.recipe.id)}
              className="flex-1 rounded-2xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
            >
              👨‍🍳 Готовлю
            </motion.button>
          )}

          {isActive && !showRemove && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => removeActiveRecipe(result.recipe.id)}
              className="flex-1 rounded-2xl bg-green-100 px-3 py-2 text-sm font-medium text-green-700"
            >
              ✅ Уже готовлю
            </motion.button>
          )}

          {showRemove && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => removeActiveRecipe(result.recipe.id)}
              className="flex-1 rounded-2xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Убрать
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  function CategorySection({
    title,
    items,
    color,
  }: {
    title: string;
    items: MatchResult[];
    color: "orange" | "slate";
  }) {
    const isOpen = openCategories[title] ?? false;
    const visibleItems = isOpen ? items : [];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="rounded-3xl bg-white p-5 shadow-sm"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => toggleCategory(title)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isOpen ? "Скрыть блюда" : "Нажми, чтобы раскрыть"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                color === "orange"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {items.length}
            </span>

            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl text-slate-400"
            >
              ⌄
            </motion.span>
          </div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3">
                {visibleItems.map((result) => (
                  <RecipeCard
                    key={result.recipe.id}
                    result={result}
                    compact={color === "slate"}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (selectedRecipe) {
    const recipe = selectedRecipe.recipe;
    const isActive = activeRecipeIds.includes(recipe.id);

    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-5 pt-8 pb-4"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRecipe(null)}
              className="mb-4 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm"
            >
              ← Назад
            </motion.button>

            <p className="text-sm text-slate-500">AI Cook</p>
            <h1 className="text-3xl font-bold">
              {recipe.emoji} {recipe.title}
            </h1>
          </motion.header>

          <section className="px-5 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Готовность</p>
                  <h2 className="text-4xl font-bold text-green-600">
                    {selectedRecipe.score}%
                  </h2>
                </div>

                <div className="text-right text-sm text-slate-500">
                  <p>⏱ {recipe.time}</p>
                  <p>🍽 {recipe.portions}</p>
                  <p>⭐ {recipe.difficulty}</p>
                  <p>📌 {recipe.category}</p>
                </div>
              </div>

              {!isActive ? (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => addActiveRecipe(recipe.id)}
                  className="mt-4 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
                >
                  👨‍🍳 Добавить в «Готовлю сейчас»
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => removeActiveRecipe(recipe.id)}
                  className="mt-4 w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
                >
                  Убрать из «Готовлю сейчас»
                </motion.button>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold">Ингредиенты</h2>

              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => {
                  const exists = fridgeNames.includes(
                    normalizeProductName(ingredient.name)
                  );

                  return (
                    <motion.div
                      key={ingredient.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.02 }}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <span>{ingredient.name}</span>
                      <span
                        className={
                          exists
                            ? "font-medium text-green-600"
                            : ingredient.optional
                            ? "font-medium text-orange-500"
                            : "font-medium text-red-500"
                        }
                      >
                        {exists
                          ? "Есть"
                          : ingredient.optional
                          ? "Желательно"
                          : "Нет"}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {selectedRecipe.missingRequired.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() =>
                    addIngredientsToShopping(
                      selectedRecipe,
                      selectedRecipe.missingRequired,
                      "Обязательные продукты"
                    )
                  }
                  className="mt-4 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
                >
                  🛒 Добавить обязательное в покупки
                </motion.button>
              )}

              {selectedRecipe.missingOptional.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() =>
                    addIngredientsToShopping(
                      selectedRecipe,
                      selectedRecipe.missingOptional,
                      "Желательные продукты"
                    )
                  }
                  className="mt-3 w-full rounded-2xl bg-orange-100 px-4 py-3 font-medium text-orange-700"
                >
                  ➕ Добавить желательное в покупки
                </motion.button>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold">Приготовление</h2>

              <div className="space-y-3">
                {recipe.steps.map((step, index) => (
                  <motion.div
                    key={`${step}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: index * 0.03 }}
                    className="rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-500">
                      Шаг {index + 1}
                    </p>
                    <p className="mt-1 leading-relaxed">{step}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          <BottomNav current="ai" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-5 pt-8 pb-4"
        >
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">AI Cook 🤖</h1>
        </motion.header>

        <section className="px-5 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsFridgeOpen(!isFridgeOpen)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold">Есть дома</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isFridgeOpen ? "Скрыть продукты" : "Показать продукты"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                  {fridgeItems.length}
                </span>

                <motion.span
                  animate={{ rotate: isFridgeOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl text-slate-400"
                >
                  ⌄
                </motion.span>
              </div>
            </motion.button>

            <AnimatePresence>
              {isFridgeOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4">
                    {loading ? (
                      <p className="text-sm text-slate-500">Загрузка...</p>
                    ) : fridgeItems.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Добавь продукты в холодильник, и я подберу блюда.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {fridgeItems.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: index * 0.02 }}
                            className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium"
                          >
                            {getCleanName(item.name)}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence mode="popLayout">
            {activeRecipes.length > 0 && (
              <motion.div
                key="active-recipes"
                layout
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">👨‍🍳 Готовлю сейчас</h2>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={clearActiveRecipes}
                    className="text-sm text-slate-400"
                  >
                    Очистить
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {activeRecipes.map((result) => (
                    <RecipeCard
                      key={result.recipe.id}
                      result={result}
                      showRemove
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-green-50 p-4 text-sm text-green-700"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            placeholder="🔍 Найти рецепт или ингредиент"
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">✅ Готово сейчас</h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {readyResults.length}
              </span>
            </div>

            {readyResults.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока нет блюд на 100%. Добавь больше продуктов в холодильник.
              </p>
            ) : (
              <div className="space-y-3">
                {readyResults.slice(0, 15).map((result) => (
                  <RecipeCard key={result.recipe.id} result={result} />
                ))}
              </div>
            )}
          </motion.div>

          {Object.entries(groupedAlmost).map(([category, items]) => (
            <CategorySection
              key={`almost-${category}`}
              title={`🟡 Почти готово: ${category}`}
              items={items}
              color="orange"
            />
          ))}

          {Object.entries(groupedOther).map(([category, items]) => (
            <CategorySection
              key={`other-${category}`}
              title={`🔎 Ещё варианты: ${category}`}
              items={items}
              color="slate"
            />
          ))}
        </section>

        <BottomNav current="ai" />
      </div>
    </main>
  );
}