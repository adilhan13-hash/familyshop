"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  endAt,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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

type Product = {
  id: string;
  icon: string;
  name: string;
  category?: string;
  ingredientId?: string;
  search?: string[];
  aliases?: string[];
};

type Recipe = {
  id: string;
  title: string;
  category?: string;
  cuisine?: string;
  difficulty?: string;
  cookingTime?: number;
  cookingTimeText?: string;
  time?: string;
  description?: string;
  ingredientIds?: string[];
  optionalIngredientIds?: string[];
  steps?: string[];
  searchTitle?: string;
};

type CookingRecipe = {
  id: string;
  recipeId: string;
  title: string;
  category?: string;
  cookingTime?: string;
  score?: number;
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

function addProductKey(
  map: Record<string, Product>,
  key: unknown,
  product: Product
) {
  if (typeof key !== "string") return;

  const rawKey = key.trim();
  if (!rawKey) return;

  map[rawKey] = product;

  const normalizedKey = normalizeText(rawKey);
  if (normalizedKey) {
    map[normalizedKey] = product;
  }
}

export default function AiCookPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [search, setSearch] = useState("");

  const [searchRecipes, setSearchRecipes] = useState<Recipe[]>([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [cookingRecipes, setCookingRecipes] = useState<CookingRecipe[]>([]);

  const [selectedRecipe, setSelectedRecipe] = useState<MatchResult | null>(null);

  const [showCooking, setShowCooking] = useState(true);
  const [showSuggested, setShowSuggested] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFridge, setShowFridge] = useState(false);

  const [addedAnimation, setAddedAnimation] = useState(false);
  const [cookingAnimation, setCookingAnimation] = useState(false);

  const [loadingFridge, setLoadingFridge] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingCooking, setLoadingCooking] = useState(true);

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
    const productsQuery = query(
      collection(db, "products"),
      orderBy("name"),
      limit(3000)
    );

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const map: Record<string, Product> = {};

      snapshot.forEach((document) => {
        const data = document.data();

        if (!data.name) return;

        const product: Product = {
          id: document.id,
          icon: data.icon || "🛒",
          name: data.name,
          category: data.category,
          ingredientId: data.ingredientId || document.id,
          search: Array.isArray(data.search) ? data.search : [],
          aliases: Array.isArray(data.aliases) ? data.aliases : [],
        };

        addProductKey(map, document.id, product);
        addProductKey(map, product.id, product);
        addProductKey(map, product.ingredientId, product);
        addProductKey(map, product.name, product);

        product.aliases?.forEach((alias) => addProductKey(map, alias, product));
        product.search?.forEach((term) => addProductKey(map, term, product));
      });

      setProductsMap(map);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "favoriteRecipes"),
      (snapshot) => {
        const items: Recipe[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.title) {
            items.push({
              id: document.id,
              ...(data as Omit<Recipe, "id">),
            });
          }
        });

        setFavoriteRecipes(items);
        setLoadingFavorites(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "cookingNow"),
      (snapshot) => {
        const items: CookingRecipe[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.title) {
            items.push({
              id: document.id,
              recipeId: data.recipeId || document.id,
              title: data.title,
              category: data.category,
              cookingTime: data.cookingTime,
              score: data.score,
            });
          }
        });

        setCookingRecipes(items);
        setLoadingCooking(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  const fridgeIngredientIds = useMemo(() => {
    const ids = fridgeItems
      .map((item) => item.ingredientId || item.productId)
      .filter(Boolean) as string[];

    return Array.from(new Set(ids));
  }, [fridgeItems]);

  useEffect(() => {
    async function loadSuggestedRecipes() {
      setSuggestedRecipes([]);

      if (fridgeIngredientIds.length === 0) return;

      setLoadingSuggested(true);

      try {
        const recipesQuery = query(
          collection(db, "recipes"),
          where("ingredientIds", "array-contains-any", fridgeIngredientIds.slice(0, 30)),
          limit(120)
        );

        const snapshot = await getDocs(recipesQuery);

        const items: Recipe[] = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<Recipe, "id">),
        }));

        setSuggestedRecipes(items);
      } finally {
        setLoadingSuggested(false);
      }
    }

    loadSuggestedRecipes();
  }, [fridgeIngredientIds.join("|")]);

  useEffect(() => {
    async function searchRecipesFromBook() {
      const text = normalizeText(search);

      setSearchRecipes([]);

      if (text.length < 2) return;

      setLoadingSearch(true);

      try {
        const recipesQuery = query(
          collection(db, "recipes"),
          orderBy("searchTitle"),
          startAt(text),
          endAt(text + "\uf8ff"),
          limit(40)
        );

        const snapshot = await getDocs(recipesQuery);

        const items: Recipe[] = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<Recipe, "id">),
        }));

        setSearchRecipes(items);
      } finally {
        setLoadingSearch(false);
      }
    }

    const timer = setTimeout(searchRecipesFromBook, 350);

    return () => clearTimeout(timer);
  }, [search]);

  function buildMatch(recipe: Recipe): MatchResult {
    const fridgeSet = new Set(fridgeIngredientIds);
    const allIds = Array.from(new Set(recipe.ingredientIds || []));
    const optionalIds = new Set(recipe.optionalIngredientIds || []);

    const requiredIds = allIds.filter((id) => !optionalIds.has(id));
    const idsForScore = requiredIds.length > 0 ? requiredIds : allIds;

    const haveIds = idsForScore.filter((id) => fridgeSet.has(id));
    const missingIds = idsForScore.filter((id) => !fridgeSet.has(id));

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
  }, [suggestedRecipes, fridgeIngredientIds]);

  const searchResults = useMemo(() => {
    return searchRecipes.map(buildMatch);
  }, [searchRecipes, fridgeIngredientIds]);

  const favoriteResults = useMemo(() => {
    return favoriteRecipes.map(buildMatch);
  }, [favoriteRecipes, fridgeIngredientIds]);

  function getProductByIngredientId(id: string) {
    return productsMap[id] || productsMap[normalizeText(id)];
  }

  function getProductLabel(id: string) {
    const product = getProductByIngredientId(id);

    if (!product) {
      return id.replace(/_/g, " ");
    }

    return `${product.icon || "🛒"} ${product.name}`;
  }

  function getRecipeTime(recipe: Recipe) {
    if (recipe.cookingTimeText) return recipe.cookingTimeText;
    if (recipe.time) return recipe.time;
    if (recipe.cookingTime) return `${recipe.cookingTime} мин`;
    return "";
  }

  function isFavoriteRecipe(recipeId: string) {
    return favoriteRecipes.some((recipe) => recipe.id === recipeId);
  }

  async function toggleFavoriteRecipe(recipe: Recipe) {
    if (!familyId) return;

    if (isFavoriteRecipe(recipe.id)) {
      await deleteDoc(
        doc(db, "families", familyId, "favoriteRecipes", recipe.id)
      );
      return;
    }

    await setDoc(
      doc(db, "families", familyId, "favoriteRecipes", recipe.id),
      {
        ...recipe,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async function startCooking(result: MatchResult) {
    if (!familyId) return;

    await setDoc(
      doc(db, "families", familyId, "cookingNow", result.recipe.id),
      {
        recipeId: result.recipe.id,
        title: result.recipe.title,
        category: result.recipe.category || "Рецепт",
        cookingTime: getRecipeTime(result.recipe),
        score: result.score,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "ai_start_cooking",
      title: "Будет готовить",
      message: result.recipe.title,
      emoji: "👨‍🍳",
      itemName: result.recipe.title,
    });

    setCookingAnimation(true);
    setShowCooking(true);

    setTimeout(() => {
      setCookingAnimation(false);
    }, 2000);
  }

  async function finishCooking(recipe: CookingRecipe) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "cookingNow", recipe.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "ai_finish_cooking",
      title: "Приготовил блюдо",
      message: recipe.title,
      emoji: "✅",
      itemName: recipe.title,
    });

    setMessage(`✅ Приготовили: ${recipe.title}`);
  }

  async function removeCooking(recipe: CookingRecipe) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "cookingNow", recipe.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "ai_remove_cooking",
      title: "Убрал из готовки",
      message: recipe.title,
      emoji: "🗑️",
      itemName: recipe.title,
    });
  }

  async function addMissingToShopping(result: MatchResult) {
    if (!familyId) return;

    for (const ingredientId of result.missingIds) {
      const product = getProductByIngredientId(ingredientId);

      const name = product
        ? `${product.icon || "🛒"} ${product.name}`
        : ingredientId.replace(/_/g, " ");

      await addDoc(collection(db, "families", familyId, "shopping"), {
        name,
        productName: product?.name || ingredientId.replace(/_/g, " "),
        icon: product?.icon || "🛒",
        productId: product?.id || ingredientId,
        ingredientId: product?.ingredientId || ingredientId,
        category: product?.category || "Другое",
        source: "AI Cook",
        recipeId: result.recipe.id,
        createdAt: serverTimestamp(),
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

    await startCooking(result);

    setMessage(
      `✅ Недостающее для "${result.recipe.title}" добавлено в покупки. Блюдо добавлено в “Будем готовить”.`
    );

    setAddedAnimation(true);
    setShowCooking(true);

    setTimeout(() => {
      setAddedAnimation(false);
    }, 2000);
  }

  function ToggleBlock({
    title,
    count,
    open,
    onToggle,
    children,
  }: {
    title: string;
    count: number;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white p-5 shadow-sm"
      >
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{title}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              {count}
            </span>
          </div>

          <span className="text-xl text-slate-400">{open ? "▼" : "▶"}</span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="overflow-hidden"
            >
              <div className="mt-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  function RecipeCard({ result }: { result: MatchResult }) {
    const recipe = result.recipe;
    const favorite = isFavoriteRecipe(recipe.id);

    return (
      <div className="relative">
        <motion.button
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSelectedRecipe(result);
            setMessage("");
          }}
          className="w-full rounded-3xl bg-slate-50 p-4 text-left"
        >
          <div className="flex items-start justify-between gap-3 pr-7">
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

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
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

        <button
          onClick={() => toggleFavoriteRecipe(recipe)}
          className="absolute right-3 top-3 rounded-full bg-white/90 px-1 text-lg shadow-sm"
        >
          {favorite ? "⭐" : "☆"}
        </button>
      </div>
    );
  }

  const isSearching = normalizeText(search).length >= 2;

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
          <p className="mt-1 text-sm text-slate-500">
            Поиск рецептов и блюда из холодильника
          </p>
        </motion.header>

        <section className="space-y-5 px-5">
          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔍 Найти рецепт от 2 букв"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
          />

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="rounded-3xl bg-green-100 px-4 py-3 text-sm text-green-700"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">🔍 Результаты поиска</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  {searchResults.length}
                </span>
              </div>

              {loadingSearch ? (
                <p className="text-sm text-slate-500">Ищу рецепты...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-slate-500">Ничего не найдено.</p>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <RecipeCard key={result.recipe.id} result={result} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {!isSearching && (
            <>
              <ToggleBlock
                title="👨‍🍳 Будем готовить"
                count={cookingRecipes.length}
                open={showCooking}
                onToggle={() => setShowCooking((prev) => !prev)}
              >
                {loadingCooking ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : cookingRecipes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Пока ничего не выбрано. Открой рецепт и нажми “Будем готовить”.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cookingRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="font-semibold">🍳 {recipe.title}</div>

                        <div className="mt-1 text-sm text-slate-500">
                          {recipe.category || "Рецепт"}
                          {recipe.cookingTime ? ` · ${recipe.cookingTime}` : ""}
                          {typeof recipe.score === "number"
                            ? ` · ${recipe.score}%`
                            : ""}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => finishCooking(recipe)}
                            className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                          >
                            ✅ Приготовили
                          </button>

                          <button
                            onClick={() => removeCooking(recipe)}
                            className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            Убрать
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ToggleBlock>

              <ToggleBlock
                title="🥘 Можно приготовить"
                count={suggestedResults.length}
                open={showSuggested}
                onToggle={() => setShowSuggested((prev) => !prev)}
              >
                {loadingSuggested ? (
                  <p className="text-sm text-slate-500">Подбираю рецепты...</p>
                ) : suggestedResults.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Пока нет подходящих рецептов.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suggestedResults.slice(0, 40).map((result) => (
                      <RecipeCard key={result.recipe.id} result={result} />
                    ))}
                  </div>
                )}
              </ToggleBlock>

              <ToggleBlock
                title="⭐ Избранные"
                count={favoriteResults.length}
                open={showFavorites}
                onToggle={() => setShowFavorites((prev) => !prev)}
              >
                {loadingFavorites ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : favoriteResults.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Пока нет избранных рецептов. Нажми ☆ на рецепте.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {favoriteResults.map((result) => (
                      <RecipeCard key={result.recipe.id} result={result} />
                    ))}
                  </div>
                )}
              </ToggleBlock>

              <ToggleBlock
                title="🥛 Есть дома"
                count={fridgeIngredientIds.length}
                open={showFridge}
                onToggle={() => setShowFridge((prev) => !prev)}
              >
                {loadingFridge || loadingProducts ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : fridgeIngredientIds.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Добавь продукты в холодильник, и AI подберёт блюда.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {fridgeIngredientIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                      >
                        {getProductLabel(id)}
                      </span>
                    ))}
                  </div>
                )}
              </ToggleBlock>
            </>
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
                <AnimatePresence>
                  {addedAnimation && (
                    <motion.div
                      initial={{ opacity: 0, y: 18, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className="mb-4 rounded-2xl bg-green-100 p-3 text-center text-sm font-medium text-green-700"
                    >
                      ✅ Добавлено в покупки и в “Будем готовить”
                    </motion.div>
                  )}

                  {cookingAnimation && (
                    <motion.div
                      initial={{ opacity: 0, y: 18, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className="mb-4 rounded-2xl bg-blue-100 p-3 text-center text-sm font-medium text-blue-700"
                    >
                      👨‍🍳 Блюдо отмечено как “Будем готовить”
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mb-5 rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-500">Готовность</div>
                      <div className="text-2xl font-bold">
                        {selectedRecipe.score}%
                      </div>
                    </div>

                    <div className="text-sm text-slate-500">
                      Есть {selectedRecipe.haveIds.length} из{" "}
                      {selectedRecipe.total}
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${selectedRecipe.score}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => startCooking(selectedRecipe)}
                  className="mb-4 w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white"
                >
                  👨‍🍳 Будем готовить
                </button>

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
                        ✓ {getProductLabel(id)}
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
                          + {getProductLabel(id)}
                        </div>
                      ))}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => addMissingToShopping(selectedRecipe)}
                      className="mb-5 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
                    >
                      🛒 Добавить недостающее в покупки
                    </motion.button>
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