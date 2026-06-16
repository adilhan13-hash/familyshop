"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type FridgeItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
  productName?: string;
  icon?: string;
  category?: string;
};

type Product = {
  id: string;
  icon: string;
  name: string;
  category?: string;
  ingredientId?: string;
  aliases?: string[];
  search?: string[];
  mergedIds?: string[];
};

type RecipeTag = {
  name?: string;
  slug?: string;
};

type RawIngredient = {
  name?: string;
  ingredientId?: string;
  quantity?: string;
};

type Recipe = {
  id: string;
  title: string;
  category?: string;
  categorySlug?: string;
  cuisine?: string;
  difficulty?: string;
  cookingTime?: number | null;
  cookingTimeText?: string | null;
  prepareTimeText?: string | null;
  time?: string;
  description?: string;
  note?: string;
  poster?: string | null;
  video?: string | null;
  tags?: RecipeTag[];
  popular?: boolean;
  familyFriendly?: boolean;
  rawIngredients?: RawIngredient[];
  ingredientIds?: string[];
  optionalIngredientIds?: string[];
  steps?: string[];
  stepImages?: string[];
  source?: string;
  searchTitle?: string;
  searchText?: string;
};

type CookingRecipe = {
  id: string;
  recipeId: string;
  title: string;
  category?: string;
  cookingTime?: string;
  score?: number;
  mealPlanId?: string;
  mealPlanTitle?: string;
  mealPlanEmoji?: string;
  mealPlanSubtitle?: string;
};

type MatchResult = {
  recipe: Recipe;
  score: number;
  haveIds: string[];
  missingIds: string[];
  total: number;
};

type IngredientAlias = {
  icon: string;
  name: string;
  productId?: string;
  category?: string;
};

type MealPlan = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  items: MatchResult[];
  score: number;
  missingIds: string[];
};

type RecipeKind =
  | "breakfast"
  | "salad"
  | "soup"
  | "main"
  | "side"
  | "baking"
  | "dessert"
  | "drink"
  | "other";

type CookDeckMode = "ready" | "kids" | "categories" | "favorites";

const recipeKindLabels: Record<RecipeKind, string> = {
  breakfast: "Завтраки",
  salad: "Салаты",
  soup: "Первое",
  main: "Второе",
  side: "Гарниры",
  baking: "Выпечка",
  dessert: "Десерты",
  drink: "Напитки",
  other: "Другое",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIngredientKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’'`]/g, "")
    .replace(/[^a-zа-я0-9]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();
}

function makeLabel(icon: string, name: string) {
  return `${icon || "🛒"} ${name}`;
}

const ingredientAliases: Record<string, IngredientAlias> = {
  // овощи / зелень
  luk: { icon: "🧅", name: "Лук", productId: "luk" },
  onion: { icon: "🧅", name: "Лук", productId: "luk" },
  onions: { icon: "🧅", name: "Лук", productId: "luk" },
  luk_repchatiy: {
    icon: "🧅",
    name: "Лук репчатый",
    productId: "luk_repchatyy",
  },
  luk_repchatyy: {
    icon: "🧅",
    name: "Лук репчатый",
    productId: "luk_repchatyy",
  },
  chesnok: { icon: "🧄", name: "Чеснок", productId: "chesnok" },
  garlic: { icon: "🧄", name: "Чеснок", productId: "chesnok" },
  pomidor: { icon: "🍅", name: "Помидор", productId: "pomidor" },
  tomato: { icon: "🍅", name: "Помидор", productId: "pomidor" },
  pomidory: { icon: "🍅", name: "Помидоры", productId: "pomidory" },
  tomatoes: { icon: "🍅", name: "Помидоры", productId: "pomidory" },
  pomidory_v_sobstvennom_soku: {
    icon: "🍅",
    name: "Помидоры в собственном соку",
  },
  tomatniy_sok: { icon: "🍅", name: "Томатный сок" },
  tomatnyy_sok: { icon: "🍅", name: "Томатный сок" },
  tomatnaya_pasta: { icon: "🍅", name: "Томатная паста" },
  kartofel: { icon: "🥔", name: "Картофель", productId: "kartofel" },
  kartofel_otvarnoy: { icon: "🥔", name: "Отварной картофель" },
  potato: { icon: "🥔", name: "Картофель", productId: "kartofel" },
  potatoes: { icon: "🥔", name: "Картофель", productId: "kartofel" },
  morkov: { icon: "🥕", name: "Морковь", productId: "morkov" },
  carrot: { icon: "🥕", name: "Морковь", productId: "morkov" },
  carrots: { icon: "🥕", name: "Морковь", productId: "morkov" },
  morkov_po_koreyski: { icon: "🥕", name: "Морковь по-корейски" },
  svekla: { icon: "🟣", name: "Свекла" },
  kapusta: { icon: "🥬", name: "Капуста" },
  kapusta_kvashenaya: { icon: "🥬", name: "Капуста квашеная" },
  kvashenaya_kapusta: { icon: "🥬", name: "Капуста квашеная" },
  kapusta_pekinskaya: { icon: "🥬", name: "Капуста пекинская" },
  kabachki: { icon: "🥒", name: "Кабачки" },
  ogurcy: { icon: "🥒", name: "Огурцы" },
  ogurec: { icon: "🥒", name: "Огурец" },
  salat: { icon: "🥬", name: "Салат" },
  salat_latuk: { icon: "🥬", name: "Салат латук" },
  zelen: { icon: "🌿", name: "Зелень" },
  zelen_svejaya: { icon: "🌿", name: "Свежая зелень" },
  greens: { icon: "🌿", name: "Зелень" },
  kinza: { icon: "🌿", name: "Кинза" },
  bazilik: { icon: "🌿", name: "Базилик" },
  basil: { icon: "🌿", name: "Базилик" },
  petrushka: { icon: "🌿", name: "Петрушка" },
  parsley: { icon: "🌿", name: "Петрушка" },
  ukrop: { icon: "🌿", name: "Укроп" },
  dill: { icon: "🌿", name: "Укроп" },
  stebel_seldereya: { icon: "🥬", name: "Стебель сельдерея" },
  selderey: { icon: "🥬", name: "Сельдерей" },
  schavel: { icon: "🥬", name: "Щавель" },

  // мясо / птица / рыба / морепродукты
  myaso: { icon: "🥩", name: "Мясо" },
  beef: { icon: "🥩", name: "Говядина" },
  govyadina: { icon: "🥩", name: "Говядина" },
  baranina: { icon: "🥩", name: "Баранина" },
  pork: { icon: "🥩", name: "Свинина" },
  svinina: { icon: "🥩", name: "Свинина" },
  kurica: { icon: "🍗", name: "Курица" },
  chicken: { icon: "🍗", name: "Курица" },
  kurinoe_file: { icon: "🍗", name: "Куриное филе" },
  kurinaya_grudka: { icon: "🍗", name: "Куриная грудка" },
  kurinaya_pechen: { icon: "🍗", name: "Куриная печень" },
  pechen_kurinaya: { icon: "🍗", name: "Куриная печень" },
  svino_govyajiy_farsh: { icon: "🥩", name: "Свино-говяжий фарш" },
  svino_govyazhiy_farsh: { icon: "🥩", name: "Свино-говяжий фарш" },
  govyazhiy_farsh: { icon: "🥩", name: "Говяжий фарш" },
  farsh_govyazhiy: { icon: "🥩", name: "Говяжий фарш" },
  farsh: { icon: "🥩", name: "Фарш" },
  bekon: { icon: "🥓", name: "Бекон" },
  bacon: { icon: "🥓", name: "Бекон" },
  vetchina: { icon: "🥓", name: "Ветчина" },
  krevetki: { icon: "🦐", name: "Креветки" },
  shrimps: { icon: "🦐", name: "Креветки" },
  shrimp: { icon: "🦐", name: "Креветки" },

  // молочка / яйца / сыр
  yayco: { icon: "🥚", name: "Яйцо" },
  yayco_kurinoe: { icon: "🥚", name: "Яйцо" },
  yayca: { icon: "🥚", name: "Яйца" },
  yayca_kurinye: { icon: "🥚", name: "Яйца" },
  yayca_varenye: { icon: "🥚", name: "Варёные яйца" },
  yaichniy_belok: { icon: "🥚", name: "Яичный белок" },
  yaichniy_jeltok: { icon: "🥚", name: "Яичный желток" },
  eggs: { icon: "🥚", name: "Яйца" },
  egg: { icon: "🥚", name: "Яйцо" },
  moloko: { icon: "🥛", name: "Молоко" },
  milk: { icon: "🥛", name: "Молоко" },
  kefir: { icon: "🥛", name: "Кефир" },
  slivki: { icon: "🥛", name: "Сливки" },
  cream: { icon: "🥛", name: "Сливки" },
  smetana: { icon: "🥛", name: "Сметана" },
  yogurt_naturalniy: { icon: "🥛", name: "Йогурт натуральный" },
  naturalnyy_yogurt: { icon: "🥛", name: "Йогурт натуральный" },
  naturalnogo_yogurta: { icon: "🥛", name: "Йогурт натуральный" },
  tvorog: { icon: "🥛", name: "Творог" },
  syr: { icon: "🧀", name: "Сыр" },
  cheese: { icon: "🧀", name: "Сыр" },
  syr_tverdiy: { icon: "🧀", name: "Сыр твердый" },
  syr_tverdyy: { icon: "🧀", name: "Сыр твердый" },
  hard_cheese: { icon: "🧀", name: "Сыр твердый" },
  syr_tvorojniy: { icon: "🧀", name: "Сыр творожный" },
  syr_tvorozhnyy: { icon: "🧀", name: "Сыр творожный" },
  syr_kopcheniy: { icon: "🧀", name: "Копчёный сыр" },
  syr_mocarella: { icon: "🧀", name: "Сыр моцарелла" },
  mocarella: { icon: "🧀", name: "Моцарелла" },
  mozzarella: { icon: "🧀", name: "Моцарелла" },
  syr_parmezan: { icon: "🧀", name: "Сыр пармезан" },
  parmesan: { icon: "🧀", name: "Пармезан" },

  // крупы / мука / хлеб / тесто
  ris: { icon: "🍚", name: "Рис" },
  rice: { icon: "🍚", name: "Рис" },
  ris_basmati: { icon: "🍚", name: "Рис басмати" },
  muka: { icon: "🌾", name: "Мука" },
  flour: { icon: "🌾", name: "Мука" },
  muki: { icon: "🌾", name: "Мука" },
  muka_pshenichnaya: { icon: "🌾", name: "Мука пшеничная" },
  krahmal: { icon: "🌽", name: "Крахмал" },
  kukuruzniy_krahmal: { icon: "🌽", name: "Кукурузный крахмал" },
  krupa: { icon: "🌾", name: "Крупа" },
  kunjut: { icon: "🌾", name: "Кунжут" },
  lavash_tonkiy: { icon: "🫓", name: "Лаваш тонкий" },
  lavash: { icon: "🫓", name: "Лаваш" },
  testo: { icon: "🥟", name: "Тесто" },
  lapsha: { icon: "🍜", name: "Лапша" },
  listy_lazani: { icon: "🍝", name: "Листы лазаньи" },
  makaronnye_izdeliya: { icon: "🍝", name: "Макароны" },

  // масла / соусы / консервы
  maslo_slivochnoe: { icon: "🧈", name: "Масло сливочное" },
  slivochnoe_maslo: { icon: "🧈", name: "Масло сливочное" },
  maslo_rastitelnoe: { icon: "🫒", name: "Масло растительное" },
  maslo_podsolnechnoe: { icon: "🫒", name: "Масло подсолнечное" },
  maslo_olivkovoe: { icon: "🫒", name: "Масло оливковое" },
  oil: { icon: "🫒", name: "Масло" },
  mayonez: { icon: "🥫", name: "Майонез" },
  mayonnaise: { icon: "🥫", name: "Майонез" },
  ketchup: { icon: "🍅", name: "Кетчуп" },
  uksus: { icon: "🍾", name: "Уксус" },
  uksus_vinniy_krasniy: { icon: "🍷", name: "Красный винный уксус" },
  fasol_konservirovannaya: { icon: "🥫", name: "Фасоль консервированная" },
  kukuruza_konservirovannaya: { icon: "🌽", name: "Кукуруза консервированная" },
  ananasy_konservirovannye: { icon: "🍍", name: "Ананасы консервированные" },

  // специи / сладкое / добавки
  sol: { icon: "🧂", name: "Соль" },
  salt: { icon: "🧂", name: "Соль" },
  sahar: { icon: "🍬", name: "Сахар" },
  sugar: { icon: "🍬", name: "Сахар" },
  sahar_korichneviy: { icon: "🍬", name: "Сахар коричневый" },
  saharnaya_pudra: { icon: "🍬", name: "Сахарная пудра" },
  vanilin: { icon: "🧂", name: "Ванилин" },
  vanil: { icon: "🧂", name: "Ваниль" },
  soda: { icon: "🧂", name: "Сода" },
  razryhlitel: { icon: "🧂", name: "Разрыхлитель" },
  pepper: { icon: "🌶️", name: "Перец" },
  black_pepper: { icon: "🧂", name: "Чёрный перец" },
  perec: { icon: "🌶️", name: "Перец" },
  perec_cherniy_molotiy: { icon: "🧂", name: "Перец черный молотый" },
  perec_chernyy_molotyy: { icon: "🧂", name: "Перец черный молотый" },
  perec_krasniy_jguchiy: { icon: "🌶️", name: "Перец красный жгучий" },
  lavroviy_list: { icon: "🍃", name: "Лавровый лист" },
  lavrovyy_list: { icon: "🍃", name: "Лавровый лист" },
  hmeli_suneli: { icon: "🧂", name: "Хмели-сунели" },
  muskatniy_oreh: { icon: "🌰", name: "Мускатный орех" },
  hren_stoloviy: { icon: "🌱", name: "Хрен" },
  shokolad_temniy: { icon: "🍫", name: "Шоколад темный" },
  limonniy_sok: { icon: "🍋", name: "Лимонный сок" },
  ekstrakt_mindalya: { icon: "🌰", name: "Экстракт миндаля" },
  greckie_orehi: { icon: "🥜", name: "Грецкие орехи" },
  izyum: { icon: "🍇", name: "Изюм" },
  fruktoza: { icon: "🟡", name: "Фруктоза" },
  banany: { icon: "🍌", name: "Бананы" },
  varene: { icon: "🍯", name: "Варенье" },
};

function ToggleBlock({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number | string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="min-w-0 flex-1 break-words text-xl font-bold leading-snug">
          {title}
        </h2>

        <div className="flex shrink-0 items-center gap-3">
          <span className="min-w-10 rounded-full bg-slate-100 px-3 py-1 text-center text-sm text-slate-600">
            {count}
          </span>
          <span className="text-xl text-slate-400">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AiPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [searchRecipes, setSearchRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [cookingRecipes, setCookingRecipes] = useState<CookingRecipe[]>([]);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<MatchResult | null>(
    null,
  );

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingFridge, setLoadingFridge] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [matchingRecipes, setMatchingRecipes] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const [matchedResultsState, setMatchedResultsState] = useState<MatchResult[]>(
    [],
  );
  const [recipesNeedRefresh, setRecipesNeedRefresh] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [addingMealPlanId, setAddingMealPlanId] = useState<string | null>(null);

  const [showMealPlan, setShowMealPlan] = useState(true);
  const [mealRecipeOverrides, setMealRecipeOverrides] = useState<
    Record<string, string>
  >({});
  const [showCooking, setShowCooking] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showKids, setShowKids] = useState(false);
  const [activeDeckMode, setActiveDeckMode] = useState<CookDeckMode>("ready");
  const [selectedRecipeKind, setSelectedRecipeKind] =
    useState<RecipeKind | null>(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<
    "left" | "right" | "up" | "next"
  >("next");
  const [recipeRefreshSeed, setRecipeRefreshSeed] = useState(() => Date.now());
  const [, setAddedAnimation] = useState(false);
  const [, setCookingAnimation] = useState(false);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  function refreshRecipesManually() {
    setDeckIndex((prev) => prev + 1);
    setRecipeRefreshSeed((prev) => prev + 1);
    setMealRecipeOverrides({});
    runRecipeMatching();
  }

  const productsMap = useMemo(() => {
    const map: Record<string, Product> = {};

    for (const product of products) {
      const keys = [
        product.id,
        product.ingredientId,
        ...(product.search || []),
        ...(product.aliases || []),
        ...(product.mergedIds || []),
        product.name,
      ].filter(Boolean) as string[];

      for (const key of keys) {
        map[key] = product;
        map[normalizeIngredientKey(key)] = product;
        map[normalizeText(key)] = product;
      }
    }

    return map;
  }, [products]);

  function getIngredientInfo(id: string) {
    const raw = String(id || "").trim();
    const key = normalizeIngredientKey(raw);
    const textKey = normalizeText(raw);

    const directProduct =
      productsMap[raw] ||
      productsMap[key] ||
      productsMap[textKey] ||
      productsMap[raw.replace(/-/g, "_")] ||
      productsMap[raw.replace(/_/g, "-")];

    if (directProduct) {
      return {
        icon: directProduct.icon || "🛒",
        name: directProduct.name,
        productId: directProduct.id,
        category: directProduct.category || "Другое",
      };
    }

    const alias = ingredientAliases[key] || ingredientAliases[textKey];

    if (alias) {
      const aliasProduct = alias.productId
        ? productsMap[alias.productId] ||
          productsMap[normalizeIngredientKey(alias.productId)]
        : null;

      return {
        icon: aliasProduct?.icon || alias.icon || "🛒",
        name: aliasProduct?.name || alias.name,
        productId: aliasProduct?.id || alias.productId || key,
        category: aliasProduct?.category || alias.category || "Другое",
      };
    }

    const prettyName = raw
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\w/, (letter) => letter.toUpperCase());

    return {
      icon: "🛒",
      name: prettyName || raw,
      productId: key || raw,
      category: "Другое",
    };
  }

  function getProductLabel(id: string) {
    const ingredient = getIngredientInfo(id);
    return makeLabel(ingredient.icon, ingredient.name);
  }

  function getComparableIds(id: string) {
    const info = getIngredientInfo(id);
    return Array.from(
      new Set(
        [
          id,
          info.productId,
          normalizeIngredientKey(id),
          normalizeIngredientKey(info.productId || ""),
          normalizeText(id),
          normalizeText(info.name),
        ].filter(Boolean),
      ),
    );
  }

  function getRecipeTagsText(recipe: Recipe) {
    return normalizeText(
      (recipe.tags || [])
        .map((tag) => `${tag.name || ""} ${tag.slug || ""}`)
        .join(" "),
    );
  }

  function getRecipeSearchText(recipe: Recipe) {
    if (recipe.searchText) return recipe.searchText;

    const rawIngredientsText = (recipe.rawIngredients || [])
      .map(
        (ingredient) =>
          `${ingredient.name || ""} ${ingredient.ingredientId || ""} ${ingredient.quantity || ""}`,
      )
      .join(" ");

    return normalizeText(
      `${recipe.title} ${recipe.searchTitle || ""} ${recipe.category || ""} ${
        recipe.categorySlug || ""
      } ${recipe.cuisine || ""} ${recipe.difficulty || ""} ${getRecipeTagsText(
        recipe,
      )} ${rawIngredientsText}`,
    );
  }

  function makeShoppingDocId(value: string) {
    return (
      normalizeIngredientKey(value || "unknown").slice(0, 120) || "unknown"
    );
  }

  function makeFavoriteRecipeDocId(recipe: Recipe) {
    const base = normalizeIngredientKey(
      `${recipe.title || "recipe"}_${recipe.id || ""}`
    )
      .replace(/[^a-zа-я0-9_]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return base.slice(0, 120) || "recipe";
  }

  function cleanForFirestore<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .filter((item) => item !== undefined)
        .map((item) => cleanForFirestore(item)) as T;
    }

    if (value && typeof value === "object") {
      const cleanObject: Record<string, unknown> = {};

      Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
        if (item === undefined) return;
        cleanObject[key] = cleanForFirestore(item);
      });

      return cleanObject as T;
    }

    return value;
  }

  function hasAnyWord(text: string, words: string[]) {
    const preparedText = ` ${normalizeText(text)} `;
    return words.some(
      (word) =>
        preparedText.includes(` ${normalizeText(word)} `) ||
        preparedText.includes(normalizeText(word)),
    );
  }

  function getRecipeTitleCategoryText(recipe: Recipe) {
    return normalizeText(
      `${recipe.title || ""} ${recipe.category || ""} ${recipe.categorySlug || ""} ${(
        recipe.tags || []
      )
        .map((tag) => `${tag.name || ""} ${tag.slug || ""}`)
        .join(" ")}`,
    );
  }

  function getRecipeIngredientText(recipe: Recipe) {
    return normalizeText(
      `${(recipe.rawIngredients || [])
        .map(
          (ingredient) =>
            `${ingredient.name || ""} ${ingredient.ingredientId || ""} ${ingredient.quantity || ""}`,
        )
        .join(" ")} ${(recipe.ingredientIds || []).join(" ")}`,
    );
  }

  function recipeHasTitleSignal(recipe: Recipe, words: string[]) {
    return hasAnyWord(getRecipeTitleCategoryText(recipe), words);
  }

  function isBadRecipeForAi(recipe: Recipe) {
    const title = normalizeText(recipe.title || "");
    const titleCategory = getRecipeTitleCategoryText(recipe);
    const allText = getRecipeSearchText(recipe);
    const stepsCount = recipe.steps?.length || 0;
    const ingredientCount =
      recipe.rawIngredients?.length || recipe.ingredientIds?.length || 0;

    const badCategory = hasAnyWord(titleCategory, [
      "соусы",
      "соус",
      "маринад",
      "маринады",
      "заготовки",
      "консервация",
      "соленья",
      "молочные продукты домашние",
      "сыр домашний",
      "творог домашний",
      "домашний сыр",
    ]);

    const badTitle = hasAnyWord(title, [
      "соус",
      "маринад",
      "заправка",
      "заготовка",
      "заготовки",
      "консервация",
      "рассол",
      "квас",
      "закваска",
      "домашний майонез",
      "домашний сыр",
      "сыр домашний",
      "творог домашний",
    ]);

    const badTechnical = hasAnyWord(allText, [
      "соус для",
      "маринад для",
      "заготовки на зиму",
    ]);

    if (badCategory || badTitle || badTechnical) return true;

    if (ingredientCount < 2 && stepsCount < 2) return true;

    return false;
  }

  function isRealDish(recipe: Recipe) {
    if (isBadRecipeForAi(recipe)) return false;

    const ingredientCount =
      recipe.rawIngredients?.length || recipe.ingredientIds?.length || 0;
    const stepsCount = recipe.steps?.length || 0;

    return ingredientCount >= 2 || stepsCount >= 2;
  }

  function getSearchScore(recipe: Recipe, query: string) {
    const searchText = normalizeText(query);
    if (searchText.length < 2) return 0;

    const title = normalizeText(recipe.title || "");
    const titleCategory = getRecipeTitleCategoryText(recipe);
    const ingredients = getRecipeIngredientText(recipe);
    const tags = getRecipeTagsText(recipe);
    const allText = getRecipeSearchText(recipe);
    const words = searchText.split(" ").filter((word) => word.length >= 2);

    let score = 0;

    if (title === searchText) score += 600;
    if (title.startsWith(searchText)) score += 420;
    if (title.includes(searchText)) score += 320;
    if (titleCategory.includes(searchText)) score += 170;
    if (tags.includes(searchText)) score += 110;
    if (ingredients.includes(searchText)) score += 70;
    if (allText.includes(searchText)) score += 35;

    for (const word of words) {
      const titleWords = title.split(" ");
      const titleCategoryWords = titleCategory.split(" ");

      if (titleWords.some((item) => item === word)) score += 110;
      else if (titleWords.some((item) => item.startsWith(word))) score += 85;
      else if (title.includes(word)) score += 60;

      if (titleCategoryWords.some((item) => item === word)) score += 45;
      else if (titleCategoryWords.some((item) => item.startsWith(word)))
        score += 35;
      else if (titleCategory.includes(word)) score += 25;

      if (tags.includes(word)) score += 20;
      if (ingredients.includes(word)) score += 12;
      if (!allText.includes(word)) score -= 120;
    }

    if (score <= 0) return 0;

    // buildMatch is a route-local function declaration used for scoring.
    // eslint-disable-next-line react-hooks/immutability
    const match = buildMatch(recipe);
    score += Math.min(match.score, 100);
    score += Math.min(match.haveIds.length * 8, 80);

    if (isBadRecipeForAi(recipe)) score -= 250;
    if (getRecipeKind(recipe) === "other") score -= 70;
    if ((recipe.steps?.length || 0) > 0) score += 20;
    if (recipe.cookingTime && recipe.cookingTime > 0) score += 10;
    if (recipe.popular) score += 12;
    if (recipe.familyFriendly) score += 8;

    return Math.max(0, score);
  }

  function getRecipeKind(recipe: Recipe): RecipeKind {
    if (!isRealDish(recipe)) return "other";

    const titleCategory = getRecipeTitleCategoryText(recipe);
    const allText = getRecipeSearchText(recipe);
    const ingredientText = getRecipeIngredientText(recipe);

    const hasTitle = (words: string[]) => recipeHasTitleSignal(recipe, words);
    const hasCategory = (words: string[]) => hasAnyWord(titleCategory, words);
    const hasIngredients = (words: string[]) =>
      hasAnyWord(ingredientText, words);

    if (
      hasTitle([
        "салат",
        "салаты",
        "винегрет",
        "цезарь",
        "оливье",
        "сельдь под шубой",
        "селедка под шубой",
      ]) ||
      hasCategory(["салат", "салаты"])
    ) {
      return "salad";
    }

    if (
      hasTitle([
        "суп",
        "супы",
        "борщ",
        "щи",
        "уха",
        "рассольник",
        "солянка",
        "шурпа",
        "бульон",
        "свекольник",
        "харчо",
        "лагман",
        "окрошка",
        "крем суп",
        "суп пюре",
        "гороховый суп",
        "чечевичный суп",
        "фасолевый суп",
      ]) ||
      hasCategory(["первое блюдо", "первые блюда", "суп", "супы"])
    ) {
      return "soup";
    }

    if (
      hasTitle([
        "завтрак",
        "омлет",
        "яичница",
        "каша",
        "сырники",
        "гренки",
        "тост",
        "бутерброд",
        "сэндвич",
      ]) ||
      hasCategory(["завтрак", "завтраки"])
    ) {
      return "breakfast";
    }

    if (
      hasTitle([
        "тесто",
        "паста домашняя",
        "домашняя паста",
        "лапша домашняя",
        "домашняя лапша",
        "галушки",
        "клецки",
        "вареники",
        "пельмени",
        "манты",
        "хинкали",
        "лепешки",
        "лепёшки",
        "хлеб",
        "булочка",
        "булочки",
        "блины",
        "блинчики",
        "оладьи",
        "оладушки",
        "пирожки",
        "пирог",
        "пироги",
        "пицца",
      ]) ||
      hasCategory(["выпечка", "тесто", "мучные блюда"])
    ) {
      return "baking";
    }

    if (
      hasTitle([
        "торт",
        "пирожное",
        "печенье",
        "кекс",
        "десерт",
        "ватрушка",
        "пончики",
        "мороженое",
        "желе",
      ]) ||
      hasCategory(["десерт", "десерты"])
    ) {
      return "dessert";
    }

    if (
      hasTitle([
        "чай",
        "кофе",
        "компот",
        "морс",
        "кисель",
        "напиток",
        "сок",
        "какао",
        "смузи",
        "коктейль",
      ]) ||
      hasCategory(["напитки", "напиток"])
    ) {
      return "drink";
    }

    const meatFishSignal =
      hasTitle([
        "курица",
        "куриное",
        "куриный",
        "куриная",
        "индейка",
        "утка",
        "мясо",
        "мясной",
        "говядина",
        "свинина",
        "баранина",
        "конина",
        "фарш",
        "рыба",
        "семга",
        "сёмга",
        "лосось",
        "форель",
        "минтай",
        "судак",
        "котлеты",
        "котлета",
        "тефтели",
        "фрикадельки",
        "гуляш",
        "жаркое",
        "отбивные",
        "шашлык",
        "стейк",
        "плов",
        "голубцы",
        "долма",
        "лазанья",
        "шаурма с курицей",
        "паста с курицей",
        "паста с мясом",
        "макароны с мясом",
        "картофель с мясом",
        "картошка с мясом",
        "рис с мясом",
        "гречка с мясом",
      ]) ||
      hasIngredients([
        "курица",
        "куриное филе",
        "куриная грудка",
        "говядина",
        "свинина",
        "баранина",
        "фарш",
        "рыба",
        "индейка",
      ]);

    if (
      meatFishSignal &&
      !hasAnyWord(allText, ["салат", "суп", "соус", "маринад", "тесто"])
    ) {
      return "main";
    }

    const sideSignal =
      hasTitle([
        "рис",
        "гречка",
        "картофель",
        "картошка",
        "пюре",
        "макароны",
        "спагетти",
        "паста",
        "овощи на гарнир",
        "овощное рагу",
        "рагу овощное",
        "деруны",
        "драники",
        "запеченные овощи",
        "запечённые овощи",
      ]) || hasCategory(["гарнир", "гарниры"]);

    if (sideSignal && !meatFishSignal) {
      return "side";
    }

    const categoryLooksLikeMain = hasCategory([
      "второе блюдо",
      "вторые блюда",
      "горячее",
      "горячие блюда",
      "основное блюдо",
      "основные блюда",
    ]);

    if (categoryLooksLikeMain && meatFishSignal) {
      return "main";
    }

    return "other";
  }

  function getQuickRecipeKind(recipe: Recipe) {
    const kind = getRecipeKind(recipe);
    return ["breakfast", "salad", "soup", "main", "side", "baking"].includes(
      kind,
    )
      ? kind
      : "other";
  }

  function isQuickRecipe(recipe: Recipe) {
    if (!isRealDish(recipe)) return false;

    const kind = getQuickRecipeKind(recipe);
    const time = recipe.cookingTime || 0;

    if (kind === "breakfast") return time === 0 || time <= 35;
    if (kind === "salad") return time === 0 || time <= 40;
    if (kind === "soup") return time === 0 || time <= 75;
    if (kind === "main") return time === 0 || time <= 75;
    if (kind === "side") return time === 0 || time <= 55;
    if (kind === "baking") return time === 0 || time <= 90;

    return false;
  }

  function isKidsRecipe(recipe: Recipe) {
    if (!isRealDish(recipe)) return false;

    const text = getRecipeSearchText(recipe);

    if (
      hasAnyWord(text, [
        "алкоголь",
        "водка",
        "вино",
        "коньяк",
        "ром",
        "острый",
        "острая",
        "чили",
        "хрен",
        "горчица",
      ])
    ) {
      return false;
    }

    return hasAnyWord(text, [
      "детское",
      "детский",
      "детская",
      "детские",
      "детского",
      "детскому",
      "для детей",
      "детям",
      "ребенку",
      "ребёнку",
      "малышу",
      "малышам",
      "детское меню",
      "детское питание",
    ]);
  }

  function isHolidayRecipe(recipe: Recipe) {
    if (!isRealDish(recipe)) return false;

    const text = getRecipeSearchText(recipe);

    const holidayTag = hasAnyWord(text, [
      "праздничный стол",
      "праздничное",
      "праздник",
      "новогодний",
      "новый год",
      "рождество",
      "день рождения",
      "банкет",
      "фуршет",
      "гости",
      "для гостей",
      "к праздничному столу",
      "праздничная закуска",
      "праздничный салат",
      "праздничное блюдо",
    ]);

    const kind = getRecipeKind(recipe);
    const ingredientCount =
      recipe.rawIngredients?.length || recipe.ingredientIds?.length || 0;
    const stepsCount = recipe.steps?.length || 0;

    return (
      holidayTag &&
      ["salad", "soup", "main", "dessert"].includes(kind) &&
      ingredientCount >= 4 &&
      stepsCount >= 2
    );
  }

  function seededNumber(value: string) {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4294967295;
  }

  function sectionResults(
    predicate: (recipe: Recipe, result: MatchResult) => boolean,
    take = 20,
    sectionKey = "default",
  ) {
    const filteredResults = allMatchedResults.filter((result) => {
      if (!isRealDish(result.recipe)) return false;
      if (result.total < 2) return false;
      if (result.score < 25) return false;
      return predicate(result.recipe, result);
    });

    const strongResults = filteredResults.filter(
      (result) => result.score >= 70,
    );
    const goodResults = filteredResults.filter((result) => result.score >= 45);
    const pool =
      strongResults.length >= 3
        ? strongResults
        : goodResults.length >= 3
          ? goodResults
          : filteredResults;

    return [...pool]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.missingIds.length !== b.missingIds.length)
          return a.missingIds.length - b.missingIds.length;
        const aRandom = seededNumber(
          `${recipeRefreshSeed}_${sectionKey}_${a.recipe.id}_${a.recipe.title}`,
        );
        const bRandom = seededNumber(
          `${recipeRefreshSeed}_${sectionKey}_${b.recipe.id}_${b.recipe.title}`,
        );
        return bRandom - aRandom;
      })
      .slice(0, take);
  }

  useEffect(() => {
    let active = true;

    async function loadProductsFromFile() {
      try {
        setLoadingProducts(true);

        const response = await fetch(
          "/data/products_v8_ready_for_firebase.json",
        );

        if (!response.ok) {
          throw new Error(`Products JSON load failed: ${response.status}`);
        }

        const rawProducts = await response.json();

        const items: Product[] = Array.isArray(rawProducts)
          ? rawProducts.map((product: unknown, index: number) => {
              const rawProduct = isRecord(product) ? product : {};
              const id = String(rawProduct.id || `product_${index}`);

              return {
                id,
                icon: String(rawProduct.icon || "🛒"),
                name: String(
                  rawProduct.name || rawProduct.id || `Товар ${index + 1}`,
                ),
                category: String(rawProduct.category || "Другое"),
                ingredientId: rawProduct.ingredientId
                  ? String(rawProduct.ingredientId)
                  : undefined,
                aliases: Array.isArray(rawProduct.aliases)
                  ? rawProduct.aliases.map(String)
                  : [],
                search: Array.isArray(rawProduct.search)
                  ? rawProduct.search.map(String)
                  : [],
                mergedIds: Array.isArray(rawProduct.mergedIds)
                  ? rawProduct.mergedIds.map(String)
                  : [],
              };
            })
          : [];

        if (active) {
          setProducts(items);
        }
      } catch (error) {
        console.warn("AI products local load warning", error);
        if (active) {
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoadingProducts(false);
        }
      }
    }

    loadProductsFromFile();

    return () => {
      active = false;
    };
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
              productId: data.productId,
              ingredientId: data.ingredientId,
              productName: data.productName,
              icon: data.icon,
              category: data.category,
            });
          }
        });

        setFridgeItems(items);
        setLoadingFridge(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    let active = true;

    async function loadAllRecipesFromFile() {
      try {
        setLoadingSuggested(true);

        const response = await fetch("/data/recipes_all.json");

        if (!response.ok) {
          throw new Error(`Recipes JSON load failed: ${response.status}`);
        }

        const rawRecipes = await response.json();

        const items: Recipe[] = Array.isArray(rawRecipes)
          ? rawRecipes.map((recipe: unknown, index: number) => {
              const rawRecipe = isRecord(recipe) ? recipe : {};
              const title = String(
                rawRecipe.title || rawRecipe.name || "Без названия",
              );
              const tags = Array.isArray(rawRecipe.tags)
                ? (rawRecipe.tags as RecipeTag[])
                : [];
              const rawIngredients = Array.isArray(rawRecipe.rawIngredients)
                ? (rawRecipe.rawIngredients as RawIngredient[])
                : [];

              return {
                id: String(rawRecipe.id || rawRecipe.slug || `recipe_${index}`),
                title,
                category: String(rawRecipe.category || "Рецепт"),
                categorySlug: rawRecipe.categorySlug
                  ? String(rawRecipe.categorySlug)
                  : undefined,
                cuisine: rawRecipe.cuisine ? String(rawRecipe.cuisine) : undefined,
                difficulty: rawRecipe.difficulty
                  ? String(rawRecipe.difficulty)
                  : undefined,
                cookingTime:
                  typeof rawRecipe.cookingTime === "number"
                    ? rawRecipe.cookingTime
                    : null,
                cookingTimeText: rawRecipe.cookingTimeText
                  ? String(rawRecipe.cookingTimeText)
                  : null,
                prepareTimeText: rawRecipe.prepareTimeText
                  ? String(rawRecipe.prepareTimeText)
                  : null,
                time: rawRecipe.time ? String(rawRecipe.time) : undefined,
                description: rawRecipe.description
                  ? String(rawRecipe.description)
                  : undefined,
                note: rawRecipe.note ? String(rawRecipe.note) : undefined,
                poster: rawRecipe.poster ? String(rawRecipe.poster) : null,
                video: rawRecipe.video ? String(rawRecipe.video) : null,
                tags,
                popular: Boolean(rawRecipe.popular),
                familyFriendly: Boolean(rawRecipe.familyFriendly),
                rawIngredients,
                ingredientIds: Array.isArray(rawRecipe.ingredientIds)
                  ? rawRecipe.ingredientIds.map(String)
                  : [],
                optionalIngredientIds: Array.isArray(
                  rawRecipe.optionalIngredientIds,
                )
                  ? rawRecipe.optionalIngredientIds.map(String)
                  : [],
                steps: Array.isArray(rawRecipe.steps)
                  ? rawRecipe.steps.map(String)
                  : [],
                stepImages: Array.isArray(rawRecipe.stepImages)
                  ? rawRecipe.stepImages.map(String)
                  : [],
                source: rawRecipe.source ? String(rawRecipe.source) : undefined,
                searchTitle: rawRecipe.searchTitle
                  ? String(rawRecipe.searchTitle)
                  : normalizeText(title),
                searchText: normalizeText(
                  `${title} ${rawRecipe.searchTitle || ""} ${
                    rawRecipe.category || ""
                  } ${rawRecipe.categorySlug || ""} ${rawRecipe.cuisine || ""} ${
                    rawRecipe.difficulty || ""
                  } ${tags.map((tag) => `${tag.name || ""} ${tag.slug || ""}`).join(" ")} ${rawIngredients.map((ingredient) => `${ingredient.name || ""} ${ingredient.ingredientId || ""} ${ingredient.quantity || ""}`).join(" ")}`,
                ),
              };
            })
          : [];

        if (active) {
          setSuggestedRecipes(items);
        }
      } catch (error) {
        console.warn("AI recipes local load warning", error);
        if (active) {
          setSuggestedRecipes([]);
        }
      } finally {
        if (active) {
          setLoadingSuggested(false);
        }
      }
    }

    loadAllRecipesFromFile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "favoriteRecipes"),
      (snapshot) => {
        const items: Recipe[] = [];

        snapshot.forEach((document) => {
          const data = document.data();
          items.push({
            id: data.id || document.id,
            title: data.title || "Без названия",
            category: data.category || "Рецепт",
            categorySlug: data.categorySlug,
            cookingTime: data.cookingTime ?? null,
            cookingTimeText: data.cookingTimeText || null,
            prepareTimeText: data.prepareTimeText || null,
            time: data.time,
            difficulty: data.difficulty,
            description: data.description,
            note: data.note,
            poster: data.poster || null,
            tags: Array.isArray(data.tags) ? data.tags : [],
            popular: Boolean(data.popular),
            familyFriendly: Boolean(data.familyFriendly),
            rawIngredients: Array.isArray(data.rawIngredients)
              ? data.rawIngredients
              : [],
            ingredientIds: data.ingredientIds || [],
            optionalIngredientIds: data.optionalIngredientIds || [],
            steps: data.steps || [],
            stepImages: Array.isArray(data.stepImages) ? data.stepImages : [],
            source: data.source,
            searchTitle: data.searchTitle,
            searchText: data.searchText,
          });
        });

        setFavoriteRecipes(items);
        setLoadingFavorites(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const cookingQuery = query(
      collection(db, "families", familyId, "cookingNow"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(cookingQuery, (snapshot) => {
      const items: CookingRecipe[] = [];

      snapshot.forEach((document) => {
        const data = document.data();
        items.push({
          id: document.id,
          recipeId: data.recipeId || document.id,
          title: data.title || "Без названия",
          category: data.category || "Рецепт",
          cookingTime: data.cookingTime || "",
          score: data.score || 0,
          mealPlanId: data.mealPlanId || "single",
          mealPlanTitle: data.mealPlanTitle || "Отдельные блюда",
          mealPlanEmoji: data.mealPlanEmoji || "👨‍🍳",
          mealPlanSubtitle: data.mealPlanSubtitle || "Будем готовить",
        });
      });

      setCookingRecipes(items);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const searchText = normalizeText(search);

    const timer = setTimeout(() => {
      if (searchText.length < 2) {
        setSearchRecipes([]);
        setLoadingSearch(false);
        return;
      }

      setLoadingSearch(true);

      const items = suggestedRecipes
        .map((recipe) => ({
          recipe,
          searchScore: getSearchScore(recipe, searchText),
        }))
        .filter((item) => item.searchScore > 0)
        .sort((a, b) => {
          if (b.searchScore !== a.searchScore)
            return b.searchScore - a.searchScore;
          return a.recipe.title.localeCompare(b.recipe.title, "ru");
        })
        .slice(0, 30)
        .map((item) => item.recipe);

      setSearchRecipes(items);
      setLoadingSearch(false);
    }, 150);

    return () => clearTimeout(timer);
    // Keep this tied to the source lists; scoring helpers are pure route-local logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, suggestedRecipes]);

  const fridgeIngredientIds = useMemo(() => {
    const ids: string[] = [];

    for (const item of fridgeItems) {
      const rawValues = [
        item.productId,
        item.ingredientId,
        item.productName,
        item.name,
        normalizeIngredientKey(item.name),
        normalizeText(item.name),
      ].filter(Boolean) as string[];

      for (const value of rawValues) {
        ids.push(...getComparableIds(value));
      }
    }

    return Array.from(new Set(ids));
    // productsMap captures the catalog changes that affect comparable ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fridgeItems, productsMap]);

  const fridgeIngredientSet = useMemo(() => {
    return new Set(fridgeIngredientIds);
  }, [fridgeIngredientIds]);

  const fridgeSnapshotKey = useMemo(() => {
    return fridgeIngredientIds.slice().sort().join("|");
  }, [fridgeIngredientIds]);

  const recipeCacheKey = useMemo(() => {
    return `familyshop_ai_matched_recipes_${familyId || "guest"}`;
  }, [familyId]);

  function getSavedRecipeCache() {
    if (typeof window === "undefined") return null;

    const exactSaved = window.localStorage.getItem(recipeCacheKey);
    if (exactSaved) return exactSaved;

    const lastSaved = window.localStorage.getItem("familyshop_ai_matched_recipes_last");
    if (lastSaved) return lastSaved;

    let newestValue: string | null = null;
    let newestTime = 0;

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("familyshop_ai_matched_recipes_")) continue;

      const value = window.localStorage.getItem(key);
      if (!value) continue;

      try {
        const parsed = JSON.parse(value) as { updatedAt?: number };
        const updatedAt = parsed.updatedAt || 0;
        if (updatedAt >= newestTime) {
          newestTime = updatedAt;
          newestValue = value;
        }
      } catch {
        // ignore broken cache
      }
    }

    return newestValue;
  }

  function buildMatch(recipe: Recipe): MatchResult {
    const fridgeSet = fridgeIngredientSet;
    const allIds = Array.from(new Set(recipe.ingredientIds || []));
    const optionalIds = new Set(recipe.optionalIngredientIds || []);

    const requiredIds = allIds.filter((id) => !optionalIds.has(id));
    const idsForScore = requiredIds.length > 0 ? requiredIds : allIds;

    const haveIds = idsForScore.filter((id) =>
      getComparableIds(id).some((candidate) => fridgeSet.has(candidate)),
    );

    const missingIds = idsForScore.filter(
      (id) =>
        !getComparableIds(id).some((candidate) => fridgeSet.has(candidate)),
    );

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

  useEffect(() => {
    if (
      loadingProducts ||
      loadingFridge ||
      loadingSuggested ||
      !suggestedRecipes.length
    ) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        const saved = getSavedRecipeCache();

        if (!saved) {
          setRecipesNeedRefresh(true);
          setMatchingRecipes(false);
          setMatchProgress(0);
          return;
        }

        const parsed = JSON.parse(saved) as {
          fridgeKey?: string;
          recipeIds?: string[];
        };

        const recipeIds = Array.isArray(parsed.recipeIds)
          ? parsed.recipeIds
          : [];

        if (recipeIds.length === 0) {
          setRecipesNeedRefresh(true);
          setMatchingRecipes(false);
          setMatchProgress(0);
          return;
        }

        const recipeOrder = new Map<string, number>();
        recipeIds.forEach((id, index) => recipeOrder.set(id, index));

        const cachedResults = suggestedRecipes
          .filter((recipe) => recipeOrder.has(recipe.id))
          .map(buildMatch)
          .filter((result) => result.total > 0)
          .sort((a, b) => {
            const aIndex = recipeOrder.get(a.recipe.id) ?? 999999;
            const bIndex = recipeOrder.get(b.recipe.id) ?? 999999;
            return aIndex - bIndex;
          });

        setMatchedResultsState(cachedResults);
        setRecipesNeedRefresh(parsed.fridgeKey !== fridgeSnapshotKey);
        setMatchingRecipes(false);
        setMatchProgress(0);
      } catch (error) {
        console.warn("AI cached recipes load warning", error);
        setRecipesNeedRefresh(true);
        setMatchingRecipes(false);
        setMatchProgress(0);
      }
    }, 0);

    return () => clearTimeout(timer);
    // Cache hydration intentionally follows data keys, not every helper identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadingProducts,
    loadingFridge,
    loadingSuggested,
    suggestedRecipes,
    recipeCacheKey,
    fridgeSnapshotKey,
  ]);

  async function runRecipeMatching() {
    if (loadingProducts || loadingFridge || loadingSuggested || !suggestedRecipes.length) {
      setMessage("⚠️ База ещё загружается. Попробуй через секунду.");
      return;
    }

    setMatchingRecipes(true);
    setRecipesNeedRefresh(false);
    setMatchProgress(1);
    setMessage("🤖 Обновляю подбор рецептов...");

    await new Promise((resolve) => {
      if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
        window.requestAnimationFrame(() => resolve(null));
        return;
      }

      setTimeout(resolve, 0);
    });

    const uniqueByTitle = new Map<string, MatchResult>();
    const chunkSize = 40;

    for (let index = 0; index < suggestedRecipes.length; index += chunkSize) {
      const chunk = suggestedRecipes.slice(index, index + chunkSize);

      chunk
        .map(buildMatch)
        .filter((result) => result.total > 0 && result.score > 0)
        .forEach((result) => {
          const titleKey = normalizeText(result.recipe.title);

          if (!uniqueByTitle.has(titleKey)) {
            uniqueByTitle.set(titleKey, result);
          }
        });

      setMatchProgress(
        Math.round(((index + chunk.length) / suggestedRecipes.length) * 100),
      );

      await new Promise((resolve) => {
        if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
          window.requestAnimationFrame(() => resolve(null));
          return;
        }

        setTimeout(resolve, 0);
      });
    }

    const finalResults = Array.from(uniqueByTitle.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.haveIds.length !== a.haveIds.length) {
          return b.haveIds.length - a.haveIds.length;
        }
        if (a.missingIds.length !== b.missingIds.length) {
          return a.missingIds.length - b.missingIds.length;
        }
        return a.recipe.title.localeCompare(b.recipe.title, "ru");
      })
      .slice(0, 800);

    setMatchedResultsState(finalResults);
    setMatchProgress(100);
    setRecipesNeedRefresh(false);

    try {
      const cachePayload = JSON.stringify({
        fridgeKey: fridgeSnapshotKey,
        recipeIds: finalResults.map((result) => result.recipe.id),
        updatedAt: Date.now(),
      });

      window.localStorage.setItem(recipeCacheKey, cachePayload);
      window.localStorage.setItem("familyshop_ai_matched_recipes_last", cachePayload);
    } catch (error) {
      console.warn("AI cached recipes save warning", error);
    }

    window.setTimeout(() => {
      setMatchingRecipes(false);
      setMessage("✅ Рецепты обновлены");
    }, 150);
  }

  const allMatchedResults = matchedResultsState;

  const suggestedResults = useMemo(() => {
    const cleanResults = allMatchedResults.filter((result) =>
      isRealDish(result.recipe),
    );

    const perfectResults = cleanResults
      .filter((result) => result.score === 100)
      .slice(0, 7);

    const almostResults = cleanResults
      .filter((result) => result.score < 100)
      .slice(0, 7 - perfectResults.length);

    return [...perfectResults, ...almostResults];
    // isRealDish is pure route-local filtering logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults]);

  const quickResults = useMemo(() => {
    const allowedKinds = new Set(["breakfast", "salad", "soup", "main"]);

    return allMatchedResults
      .filter((result) => {
        const kind = getQuickRecipeKind(result.recipe);
        return (
          result.score >= 35 &&
          allowedKinds.has(kind) &&
          isQuickRecipe(result.recipe)
        );
      })
      .sort((a, b) => {
        const aKind = getQuickRecipeKind(a.recipe);
        const bKind = getQuickRecipeKind(b.recipe);
        const aTime = a.recipe.cookingTime || 999;
        const bTime = b.recipe.cookingTime || 999;
        const aBonus =
          aKind === "main"
            ? 10
            : aKind === "soup"
              ? 7
              : aKind === "breakfast"
                ? 5
                : 4;
        const bBonus =
          bKind === "main"
            ? 10
            : bKind === "soup"
              ? 7
              : bKind === "breakfast"
                ? 5
                : 4;
        const aRank =
          a.score * 10 +
          aBonus -
          Math.min(aTime, 120) / 10 +
          Math.min(a.haveIds.length, 8);
        const bRank =
          b.score * 10 +
          bBonus -
          Math.min(bTime, 120) / 10 +
          Math.min(b.haveIds.length, 8);

        if (bRank !== aRank) return bRank - aRank;
        return a.recipe.title.localeCompare(b.recipe.title, "ru");
      })
      .slice(0, 15);
    // Recipe classifiers are pure route-local logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, recipeRefreshSeed]);

  const kidsResults = useMemo(() => {
    return sectionResults((recipe) => isKidsRecipe(recipe), 7, "kids");
    // sectionResults is pure route-local selection logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, recipeRefreshSeed]);

  const holidayResults = useMemo(() => {
    return sectionResults((recipe) => isHolidayRecipe(recipe), 7, "holiday");
    // sectionResults is pure route-local selection logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, recipeRefreshSeed]);

  function recipeKind(result: MatchResult) {
    return getRecipeKind(result.recipe);
  }

  const mealPlans = useMemo(() => {
    const usableResults = allMatchedResults.filter(
      (result) =>
        result.score >= 60 &&
        isRealDish(result.recipe) &&
        recipeKind(result) !== "other",
    );

    function best(kind: string, excludeIds: string[] = []) {
      return usableResults.find(
        (result) =>
          recipeKind(result) === kind && !excludeIds.includes(result.recipe.id),
      );
    }

    function fallbackMain(excludeIds: string[] = []) {
      return usableResults.find(
        (result) =>
          recipeKind(result) === "main" &&
          !excludeIds.includes(result.recipe.id),
      );
    }

    function rebuildPlan(plan: MealPlan): MealPlan {
      const replacedItems = plan.items.map((item, index) => {
        const overrideId = mealRecipeOverrides[`${plan.id}_${index}`];
        const overrideItem = overrideId
          ? usableResults.find((result) => result.recipe.id === overrideId)
          : null;

        return overrideItem || item;
      });

      const missingIds = Array.from(
        new Set(replacedItems.flatMap((item) => item.missingIds)),
      );

      const score = Math.round(
        replacedItems.reduce((sum, item) => sum + item.score, 0) /
          replacedItems.length,
      );

      return {
        ...plan,
        items: replacedItems,
        score,
        missingIds,
      };
    }

    function buildPlan(
      id: string,
      emoji: string,
      title: string,
      subtitle: string,
      items: Array<MatchResult | undefined>,
    ): MealPlan | null {
      const cleanItems = items.filter(Boolean) as MatchResult[];

      if (cleanItems.length === 0) return null;

      const missingIds = Array.from(
        new Set(cleanItems.flatMap((item) => item.missingIds)),
      );

      const score = Math.round(
        cleanItems.reduce((sum, item) => sum + item.score, 0) /
          cleanItems.length,
      );

      return rebuildPlan({
        id,
        emoji,
        title,
        subtitle,
        items: cleanItems,
        score,
        missingIds,
      });
    }

    const breakfastMain = best("breakfast") || fallbackMain();
    const breakfastDrink = best(
      "drink",
      breakfastMain ? [breakfastMain.recipe.id] : [],
    );

    const lunchSalad = best("salad");
    const lunchSoup = best("soup", lunchSalad ? [lunchSalad.recipe.id] : []);
    const lunchMain = fallbackMain(
      [lunchSalad?.recipe.id, lunchSoup?.recipe.id].filter(Boolean) as string[],
    );

    const dinnerSalad = best("salad");
    const dinnerMain = fallbackMain(dinnerSalad ? [dinnerSalad.recipe.id] : []);

    return [
      buildPlan("breakfast", "🌅", "Завтрак", "Быстрый вариант на утро", [
        breakfastMain,
        breakfastDrink,
      ]),
      buildPlan("lunch", "☀️", "Обед", "Салат + первое + второе", [
        lunchSalad,
        lunchSoup,
        lunchMain,
      ]),
      buildPlan("dinner", "🌙", "Ужин", "Салат + основное блюдо", [
        dinnerSalad,
        dinnerMain,
      ]),
    ].filter(Boolean) as MealPlan[];
    // Meal planning depends on the matched list and user overrides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, mealRecipeOverrides]);

  const searchResults = useMemo(() => {
    return searchRecipes.map(buildMatch).slice(0, 20);
    // buildMatch derives from fridgeIngredientIds through route-local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRecipes, fridgeIngredientIds]);

  const favoriteResults = useMemo(() => {
    return favoriteRecipes.map(buildMatch).slice(0, 50);
    // buildMatch derives from fridgeIngredientIds through route-local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteRecipes, fridgeIngredientIds]);

  const readyResults = useMemo(() => {
    return allMatchedResults.filter(
      (result) =>
        isRealDish(result.recipe) &&
        result.total > 0 &&
        result.missingIds.length === 0 &&
        result.score === 100,
    );
    // isRealDish is pure route-local filtering logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults]);

  const availableRecipeKinds = useMemo(() => {
    const counts = new Map<RecipeKind, number>();

    for (const result of allMatchedResults) {
      if (!isRealDish(result.recipe) || result.score < 25) continue;

      const kind = getRecipeKind(result.recipe) as RecipeKind;
      counts.set(kind, (counts.get(kind) || 0) + 1);
    }

    return (
      [
        "breakfast",
        "salad",
        "soup",
        "main",
        "side",
        "baking",
        "dessert",
        "drink",
        "other",
      ] as RecipeKind[]
    )
      .filter((kind) => (counts.get(kind) || 0) > 0)
      .map((kind) => ({ kind, count: counts.get(kind) || 0 }));
    // getRecipeKind/isRealDish are pure route-local classifiers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults]);

  const deckResults = useMemo(() => {
    const uniqueResults = new Map<string, MatchResult>();

    const source =
      activeDeckMode === "ready"
        ? readyResults
        : activeDeckMode === "kids"
          ? kidsResults
          : activeDeckMode === "categories" && selectedRecipeKind
            ? sectionResults(
                (recipe) => getRecipeKind(recipe) === selectedRecipeKind,
                60,
                `kind_${selectedRecipeKind}`,
              )
            : [];

    for (const result of source) {
      uniqueResults.set(result.recipe.id, result);
    }

    return Array.from(uniqueResults.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aRandom = seededNumber(
        `${recipeRefreshSeed}_${activeDeckMode}_${selectedRecipeKind || "none"}_${a.recipe.id}`,
      );
      const bRandom = seededNumber(
        `${recipeRefreshSeed}_${activeDeckMode}_${selectedRecipeKind || "none"}_${b.recipe.id}`,
      );
      return bRandom - aRandom;
    });
    // getRecipeKind and sectionResults are pure route-local selection logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeDeckMode,
    kidsResults,
    readyResults,
    recipeRefreshSeed,
    selectedRecipeKind,
  ]);

  const currentDeckResult =
    deckResults.length > 0 ? deckResults[deckIndex % deckResults.length] : null;

  function getRecipeTime(recipe: Recipe) {
    if (recipe.cookingTimeText) return recipe.cookingTimeText;
    if (recipe.prepareTimeText) return recipe.prepareTimeText;
    if (recipe.time) return recipe.time;
    if (recipe.cookingTime) return `${recipe.cookingTime} мин`;
    return "";
  }

  function getEstimatedRecipeTime(recipe: Recipe) {
    const kind = getRecipeKind(recipe);
    const stepsCount = recipe.steps?.length || 0;

    if (kind === "drink") return "10-15 мин";
    if (kind === "salad") return "15-25 мин";
    if (kind === "breakfast") return "20-35 мин";
    if (kind === "side") return "25-40 мин";
    if (kind === "soup") return "45-75 мин";
    if (kind === "baking") return "40-90 мин";
    if (kind === "main") return "35-60 мин";

    if (stepsCount <= 3) return "15-25 мин";
    if (stepsCount <= 6) return "25-40 мин";
    if (stepsCount <= 10) return "40-60 мин";

    return "45-75 мин";
  }

  function getRecipeTimeLabel(recipe: Recipe) {
    return getRecipeTime(recipe) || `≈ ${getEstimatedRecipeTime(recipe)}`;
  }

  function isFavoriteRecipe(recipeId: string) {
    return favoriteRecipes.some((recipe) => recipe.id === recipeId);
  }

  async function openRecipeById(recipeId: string) {
    const cached = [
      ...suggestedResults,
      ...quickResults,
      ...kidsResults,
      ...holidayResults,
      ...searchResults,
      ...favoriteResults,
    ].find((result) => result.recipe.id === recipeId);

    if (cached) {
      setSelectedRecipe(cached);
      setMessage("");
      return;
    }

    const recipe = suggestedRecipes.find((item) => item.id === recipeId);

    if (!recipe) {
      setMessage("⚠️ Рецепт не найден в локальной базе.");
      return;
    }

    setSelectedRecipe(buildMatch(recipe));
    setMessage("");
  }

  function showNextDeckRecipe(direction: "left" | "right" | "up" | "next") {
    setSwipeDirection(direction);

    setDeckIndex((prev) => {
      if (deckResults.length === 0) return 0;
      return (prev + 1) % deckResults.length;
    });
  }

  function showPrevDeckRecipe() {
    setSwipeDirection("left");

    setDeckIndex((prev) => {
      if (deckResults.length === 0) return 0;
      return (prev - 1 + deckResults.length) % deckResults.length;
    });
  }

  function handleRecipeDragEnd(result: MatchResult, info: PanInfo) {
    const absX = Math.abs(info.offset.x);
    const absY = Math.abs(info.offset.y);

    if (absX < 80 && absY < 80) return;

    // Слева направо — следующий рецепт.
    if (absX > absY && info.offset.x > 90) {
      showNextDeckRecipe("right");
      return;
    }

    // Справа налево — предыдущий рецепт.
    if (absX > absY && info.offset.x < -90) {
      showPrevDeckRecipe();
      return;
    }

    // Сверху вниз — добавить в избранное.
    if (absY > absX && info.offset.y > 110) {
      void toggleFavoriteRecipe(result.recipe);
      showNextDeckRecipe("up");
    }
  }

  async function toggleFavoriteRecipe(recipe: Recipe) {
    if (!familyId) return;

    const favoriteDocId = makeFavoriteRecipeDocId(recipe);

    try {
      if (isFavoriteRecipe(recipe.id)) {
        await deleteDoc(
          doc(db, "families", familyId, "favoriteRecipes", favoriteDocId),
        );
        setMessage("☆ Убрано из избранного");
        return;
      }

      await setDoc(
        doc(db, "families", familyId, "favoriteRecipes", favoriteDocId),
        cleanForFirestore({
          ...recipe,
          id: recipe.id,
          favoriteDocId,
          createdAt: serverTimestamp(),
        }),
        { merge: true },
      );

      setMessage("⭐ Добавлено в избранное");
    } catch (error) {
      console.warn("AI favorite recipe warning", error);
      setMessage("⚠️ Не получилось изменить избранное.");
    }
  }

  async function startCooking(result: MatchResult) {
    if (!familyId) return;

    await setDoc(
      doc(db, "families", familyId, "cookingNow", result.recipe.id),
      {
        recipeId: result.recipe.id,
        title: result.recipe.title,
        category: result.recipe.category || "Рецепт",
        cookingTime: getRecipeTimeLabel(result.recipe),
        score: result.score,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        createdAt: serverTimestamp(),
      },
      { merge: true },
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

    setMessage(`👨‍🍳 Будем готовить: ${result.recipe.title}`);
    setCookingAnimation(true);
    setTimeout(() => setCookingAnimation(false), 2000);
  }

  async function addMissingToShopping(result: MatchResult) {
    if (!familyId || addingRecipeId) return;

    if (result.missingIds.length === 0) {
      await startCooking(result);
      return;
    }

    try {
      setAddingRecipeId(result.recipe.id);
      setMessage(`🛒 Добавляю недостающее для "${result.recipe.title}"...`);

      const batch = writeBatch(db);

      for (const ingredientId of result.missingIds) {
        const ingredient = getIngredientInfo(ingredientId);
        const name = makeLabel(ingredient.icon, ingredient.name);

        const shoppingDocId = `ai_${makeShoppingDocId(
          ingredient.productId || ingredientId,
        )}`;
        const shoppingRef = doc(
          db,
          "families",
          familyId,
          "shopping",
          shoppingDocId,
        );

        batch.set(
          shoppingRef,
          {
            name,
            productName: ingredient.name,
            icon: ingredient.icon,
            productId: ingredient.productId || ingredientId,
            ingredientId: ingredient.productId || ingredientId,
            category: ingredient.category || "Другое",
            source: "AI Cook",
            recipeId: result.recipe.id,
            recipeTitle: result.recipe.title,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_add_to_shopping",
        title: "AI добавил ингредиенты",
        message: `${result.missingIds.length} шт. для блюда ${result.recipe.title}`,
        emoji: "🤖",
        itemName: result.recipe.title,
      });

      await startCooking(result);

      setMessage(
        `✅ ${result.missingIds.length} ингредиент(ов) для "${result.recipe.title}" добавлено в покупки.`,
      );
      setSelectedRecipe(null);
      setAddedAnimation(true);
      setTimeout(() => setAddedAnimation(false), 2000);
    } catch (error) {
      console.warn("AI add missing ingredients warning", error);
      setMessage("⚠️ Не получилось добавить ингредиенты. Попробуй ещё раз.");
    } finally {
      setAddingRecipeId(null);
    }
  }

  async function markCookingDone(item: CookingRecipe) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "cookingNow", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "ai_cooking_done",
      title: "Приготовил",
      message: item.title,
      emoji: "✅",
      itemName: item.title,
    });
  }

  async function removeCooking(item: CookingRecipe) {
    if (!familyId) return;
    await deleteDoc(doc(db, "families", familyId, "cookingNow", item.id));
  }

  function refreshMealRecipe(plan: MealPlan, item: MatchResult, index: number) {
    const kind = recipeKind(item);
    const usedIds = plan.items
      .filter((_, itemIndex) => itemIndex !== index)
      .map((planItem) => planItem.recipe.id);

    const candidates = allMatchedResults.filter(
      (result) =>
        result.score >= 70 &&
        recipeKind(result) === kind &&
        !usedIds.includes(result.recipe.id),
    );

    if (candidates.length <= 1) {
      setMessage("Пока нет другого подходящего рецепта для замены.");
      return;
    }

    const currentIndex = candidates.findIndex(
      (candidate) => candidate.recipe.id === item.recipe.id,
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % candidates.length : 0;
    const nextRecipe = candidates[nextIndex];

    setMealRecipeOverrides((current) => ({
      ...current,
      [`${plan.id}_${index}`]: nextRecipe.recipe.id,
    }));

    setMessage(`🔄 Заменил на: ${nextRecipe.recipe.title}`);
  }

  async function addSingleMealItemToCooking(plan: MealPlan, item: MatchResult) {
    if (!familyId) return;

    await setDoc(
      doc(
        db,
        "families",
        familyId,
        "cookingNow",
        `${plan.id}_${item.recipe.id}`,
      ),
      {
        recipeId: item.recipe.id,
        title: item.recipe.title,
        category: item.recipe.category || "Рецепт",
        cookingTime: getRecipeTimeLabel(item.recipe),
        score: item.score,
        mealPlanId: plan.id,
        mealPlanTitle: plan.title,
        mealPlanEmoji: plan.emoji,
        mealPlanSubtitle: plan.subtitle,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "ai_meal_single_start_cooking",
      title: "Будет готовить блюдо",
      message: `${item.recipe.title} из набора ${plan.title}`,
      emoji: "👨‍🍳",
      itemName: item.recipe.title,
    });

    setMessage(`👨‍🍳 Добавлено в “Будем готовить”: ${item.recipe.title}`);
    setCookingAnimation(true);
    setTimeout(() => setCookingAnimation(false), 2000);
  }

  async function addMealPlanToCooking(plan: MealPlan, addMissing: boolean) {
    const actionId = `${plan.id}_${addMissing ? "missing" : "cooking"}`;
    if (!familyId || addingMealPlanId) return;

    if (plan.items.length === 0) {
      setMessage(`В "${plan.title}" нет выбранных блюд.`);
      return;
    }

    try {
      setAddingMealPlanId(actionId);
      setMessage(
        addMissing && plan.missingIds.length > 0
          ? `🛒 Добавляю недостающее для "${plan.title}"...`
          : `👨‍🍳 Добавляю "${plan.title}" в “Будем готовить”...`,
      );

      const batch = writeBatch(db);

      if (addMissing && plan.missingIds.length > 0) {
        for (const ingredientId of plan.missingIds) {
          const ingredient = getIngredientInfo(ingredientId);
          const name = makeLabel(ingredient.icon, ingredient.name);

          const shoppingDocId = `ai_${makeShoppingDocId(
            ingredient.productId || ingredientId,
          )}`;
          const shoppingRef = doc(
            db,
            "families",
            familyId,
            "shopping",
            shoppingDocId,
          );

          batch.set(
            shoppingRef,
            {
              name,
              productName: ingredient.name,
              icon: ingredient.icon,
              productId: ingredient.productId || ingredientId,
              ingredientId: ingredient.productId || ingredientId,
              category: ingredient.category || "Другое",
              source: "AI Cook meal plan",
              mealPlanId: plan.id,
              mealPlanTitle: plan.title,
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      }

      for (const item of plan.items) {
        const cookingRef = doc(
          db,
          "families",
          familyId,
          "cookingNow",
          `${plan.id}_${item.recipe.id}`,
        );

        batch.set(
          cookingRef,
          {
            recipeId: item.recipe.id,
            title: item.recipe.title,
            category: item.recipe.category || "Рецепт",
            cookingTime: getRecipeTimeLabel(item.recipe),
            score: item.score,
            mealPlanId: plan.id,
            mealPlanTitle: plan.title,
            mealPlanEmoji: plan.emoji,
            mealPlanSubtitle: plan.subtitle,
            userId: appUser?.uid || "unknown",
            userName: appUser?.displayName || "Без имени",
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      if (addMissing && plan.missingIds.length > 0) {
        await addActivity({
          familyId,
          userId: appUser?.uid || "unknown",
          userName: appUser?.displayName || "Без имени",
          type: "ai_meal_add_to_shopping",
          title: "AI добавил ингредиенты для меню",
          message: `${plan.missingIds.length} шт. для набора ${plan.title}`,
          emoji: "🍽",
          itemName: plan.title,
        });
      }

      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "ai_meal_start_cooking",
        title: "Будет готовить меню",
        message: plan.title,
        emoji: plan.emoji,
        itemName: plan.title,
      });

      setMessage(
        addMissing && plan.missingIds.length > 0
          ? `🛒 ${plan.missingIds.length} ингредиент(ов) для "${plan.title}" добавлено в покупки, а меню добавлено в “Будем готовить”.`
          : `👨‍🍳 "${plan.title}" добавлен в “Будем готовить”.`,
      );
      setAddedAnimation(addMissing && plan.missingIds.length > 0);
      setCookingAnimation(true);
      setTimeout(() => setAddedAnimation(false), 2000);
      setTimeout(() => setCookingAnimation(false), 2000);
    } catch (error) {
      console.warn("AI add meal plan warning", error);
      setMessage("⚠️ Не получилось добавить меню. Попробуй ещё раз.");
    } finally {
      setAddingMealPlanId(null);
    }
  }

  async function addMealMissingToShopping(plan: MealPlan) {
    await addMealPlanToCooking(plan, true);
  }

  function getMealPlanStyle(planId: string) {
    if (planId === "breakfast") {
      return {
        card: "bg-amber-50 border border-amber-200",
        badge: "bg-amber-100 text-amber-800",
        item: "bg-white/90",
        refresh: "bg-amber-100 text-amber-800",
        missing: "bg-orange-100 text-orange-800",
        add: "bg-amber-500 text-white",
      };
    }

    if (planId === "lunch") {
      return {
        card: "bg-green-50 border border-green-200",
        badge: "bg-green-100 text-green-800",
        item: "bg-white/90",
        refresh: "bg-green-100 text-green-800",
        missing: "bg-orange-100 text-orange-800",
        add: "bg-green-500 text-white",
      };
    }

    return {
      card: "bg-indigo-50 border border-indigo-200",
      badge: "bg-indigo-100 text-indigo-800",
      item: "bg-white/90",
      refresh: "bg-indigo-100 text-indigo-800",
      missing: "bg-orange-100 text-orange-800",
      add: "bg-indigo-500 text-white",
    };
  }

  function MealPlanCard({ plan }: { plan: MealPlan }) {
    const style = getMealPlanStyle(plan.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-4 shadow-sm ${style.card}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {plan.emoji} {plan.subtitle}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              {plan.title}
            </h3>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-sm font-semibold ${style.badge}`}
          >
            {plan.score}%
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {plan.items.map((item, index) => (
            <div
              key={`${plan.id}_${index}_${item.recipe.id}`}
              className={`flex items-center gap-2 rounded-2xl px-3 py-3 shadow-sm ${style.item}`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedRecipe(item);
                  setMessage("");
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="font-semibold leading-snug text-slate-900 break-words">
                  {recipeKind(item) === "salad"
                    ? "🥗"
                    : recipeKind(item) === "soup"
                      ? "🍲"
                      : recipeKind(item) === "drink"
                        ? "☕"
                        : recipeKind(item) === "breakfast"
                          ? "🍳"
                          : recipeKind(item) === "side"
                            ? "🍚"
                            : recipeKind(item) === "baking"
                              ? "🥟"
                              : "🍽"}{" "}
                  {item.recipe.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.missingIds.length > 0
                    ? `Не хватает: ${item.missingIds.length}`
                    : "Всё есть дома"}
                </p>
              </button>

              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                {item.score}%
              </span>

              <button
                type="button"
                onClick={() => addSingleMealItemToCooking(plan, item)}
                className="shrink-0 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                title="Добавить это блюдо в Будем готовить"
              >
                👨‍🍳
              </button>

              <button
                type="button"
                onClick={() => refreshMealRecipe(plan, item, index)}
                className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${style.refresh}`}
                title="Показать другой вариант"
              >
                🎲
              </button>
            </div>
          ))}
        </div>

        {plan.missingIds.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-white/90 p-3">
            <p className="text-sm font-semibold text-slate-700">Не хватает:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {plan.missingIds.slice(0, 8).map((id) => (
                <span
                  key={id}
                  className={`rounded-full px-3 py-1 text-sm ${style.missing}`}
                >
                  {getProductLabel(id)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/90 p-3 text-sm font-semibold text-green-700">
            ✅ Для этого набора всё есть дома
          </p>
        )}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => addMealPlanToCooking(plan, false)}
            disabled={plan.items.length === 0 || addingMealPlanId !== null}
            className="w-full rounded-2xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            👨‍🍳 Будем готовить
          </button>

          {plan.missingIds.length > 0 ? (
            <button
              type="button"
              onClick={() => addMealMissingToShopping(plan)}
              disabled={plan.items.length === 0 || addingMealPlanId !== null}
              className={`w-full rounded-2xl px-3 py-3 text-sm font-semibold disabled:opacity-50 ${style.add}`}
            >
              🛒 Добавить недостающее
            </button>
          ) : null}
        </div>
      </motion.div>
    );
  }

  function RecipeCard({ result }: { result: MatchResult }) {
    const recipe = result.recipe;
    const favorite = isFavoriteRecipe(recipe.id);
    const recipeTime = getRecipeTimeLabel(recipe);
    const statusText =
      result.missingIds.length > 0
        ? `Не хватает: ${result.missingIds.length}`
        : "Можно готовить";

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
          className="w-full overflow-hidden rounded-3xl bg-slate-50 text-left"
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 pr-7">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-semibold leading-snug text-slate-900">
                  🔍 {recipe.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {recipe.category || "Рецепт"}
                  {recipeTime ? ` · ⏱ ${recipeTime}` : ""}
                  {recipe.difficulty ? ` · ${recipe.difficulty}` : ""}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
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
              Есть {result.haveIds.length} из {result.total} · {statusText}
            </p>
          </div>
        </motion.button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleFavoriteRecipe(recipe);
          }}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 text-lg shadow-sm"
        >
          {favorite ? "⭐" : "☆"}
        </button>
      </div>
    );
  }

  function renderSwipeRecipeDeck() {
    const result = currentDeckResult;
    const recipe = result?.recipe;
    const tabs: Array<{
      id: CookDeckMode;
      label: string;
      count: number | string;
    }> = [
      { id: "ready", label: "✅ Можно", count: readyResults.length || "—" },
      { id: "kids", label: "👶 Детское", count: kidsResults.length },
      {
        id: "categories",
        label: "▦ Категории",
        count: availableRecipeKinds.length || "—",
      },
      { id: "favorites", label: "⭐ Избранное", count: favoriteResults.length },
    ];

    return (
      <div className="space-y-4">
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex w-max gap-2 px-1">
            {tabs.map((tab) => {
              const active = activeDeckMode === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveDeckMode(tab.id);
                    if (tab.id !== "categories") {
                      setSelectedRecipeKind(null);
                    }
                    setDeckIndex(0);
                  }}
                  className={`shrink-0 rounded-full px-4 py-3 text-sm font-black shadow-sm transition active:scale-[0.98] ${
                    active
                      ? "bg-slate-950 text-white ring-1 ring-slate-950"
                      : "bg-white text-slate-700 ring-1 ring-slate-100"
                  }`}
                >
                  {tab.label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeDeckMode === "categories" ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {availableRecipeKinds.map(({ kind, count }) => {
              const active = selectedRecipeKind === kind;

              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setSelectedRecipeKind(kind);
                    setDeckIndex(0);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black shadow-sm transition active:scale-[0.98] ${
                    active
                      ? "bg-green-500 text-white ring-1 ring-green-500"
                      : "bg-white text-slate-600 ring-1 ring-slate-100"
                  }`}
                >
                  {recipeKindLabels[kind]} · {count}
                </button>
              );
            })}
          </div>
        ) : null}

        {activeDeckMode === "favorites" ? (
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Избранное</h2>

            {loadingFavorites ? (
              <p className="mt-3 text-sm text-slate-500">Загрузка...</p>
            ) : favoriteResults.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Пока нет избранных рецептов. Добавляй понравившиеся свайпом или
                кнопкой.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {favoriteResults.map((favorite) => (
                  <RecipeCard key={favorite.recipe.id} result={favorite} />
                ))}
              </div>
            )}
          </div>
        ) : activeDeckMode === "categories" && !selectedRecipeKind ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Выбери категорию
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              После выбора категории откроется свайп-подборка рецептов этого
              типа.
            </p>
          </div>
        ) : (
          <>
        {loadingSuggested || matchingRecipes ? (
          <div className="rounded-3xl bg-white p-5 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-100">
            Подбираю рецепты по продуктам дома...
          </div>
        ) : !result || !recipe ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              Пока нет рецептов
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Добавь продукты в “Есть дома” или попробуй другой режим.
            </p>

          </div>
        ) : (
          <>
            <div className="relative min-h-[500px] overflow-hidden rounded-[34px] bg-gradient-to-b from-slate-200 to-slate-100 p-2">
              <div className="pointer-events-none absolute inset-x-8 top-4 h-24 rounded-full bg-white/70 blur-2xl" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeDeckMode}_${deckIndex}_${recipe.id}`}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => handleRecipeDragEnd(result, info)}
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                  exit={{
                    opacity: 0,
                    x:
                      swipeDirection === "right"
                        ? 150
                        : swipeDirection === "left"
                          ? -150
                          : 0,
                    y: swipeDirection === "up" ? 130 : 18,
                    rotate:
                      swipeDirection === "right"
                        ? 7
                        : swipeDirection === "left"
                          ? -7
                          : 0,
                    scale: 0.97,
                  }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-x-2 top-2 cursor-grab active:cursor-grabbing"
                >
                  <div
                    className={`overflow-hidden rounded-[30px] p-5 text-white shadow-xl ${
                      result.score === 100
                        ? "bg-gradient-to-br from-emerald-600 via-slate-900 to-slate-950"
                        : result.score >= 70
                          ? "bg-gradient-to-br from-orange-500 via-slate-900 to-slate-950"
                          : "bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-white/10">
                          <span>🍽</span>
                          <span className="truncate">{recipe.category || "Рецепт"}</span>
                        </div>

                        <h2 className="mt-4 line-clamp-4 break-words text-[32px] font-black leading-[1.04] tracking-tight">
                          {recipe.title}
                        </h2>
                      </div>

                      <div className="shrink-0 rounded-3xl bg-white/12 px-3 py-3 text-center ring-1 ring-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-white/60">
                          готово
                        </div>
                        <div className="text-2xl font-black">{result.score}%</div>
                      </div>
                    </div>

                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-white transition-all"
                        style={{ width: `${result.score}%` }}
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-3xl bg-white/12 px-2 py-3 ring-1 ring-white/10">
                        <div className="text-2xl font-black">
                          {result.haveIds.length}
                        </div>
                        <div className="text-[11px] font-medium text-white/60">
                          есть дома
                        </div>
                      </div>

                      <div className="rounded-3xl bg-white/12 px-2 py-3 ring-1 ring-white/10">
                        <div className="text-2xl font-black">
                          {result.missingIds.length}
                        </div>
                        <div className="text-[11px] font-medium text-white/60">
                          не хватает
                        </div>
                      </div>

                      <div className="rounded-3xl bg-white/12 px-2 py-3 ring-1 ring-white/10">
                        <div className="line-clamp-1 text-sm font-black leading-tight">
                          {getRecipeTimeLabel(recipe)}
                        </div>
                        <div className="text-[11px] font-medium text-white/60">время</div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                      {result.missingIds.length > 0 ? (
                        <>
                          <p className="text-xs font-bold uppercase tracking-wide text-orange-100/80">
                            Нужно докупить
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/90">
                            {result.missingIds
                              .slice(0, 4)
                              .map((id) => getProductLabel(id))
                              .join(", ")}
                            {result.missingIds.length > 4 ? "..." : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-bold leading-6 text-green-100">
                          ✅ Всё нужное уже есть дома. Можно готовить без покупок.
                        </p>
                      )}
                    </div>

                    {recipe.description ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/70">
                        {recipe.description}
                      </p>
                    ) : null}

                    <div className="mt-5 rounded-3xl bg-black/15 px-4 py-3 text-center text-xs font-bold text-white/70 ring-1 ring-white/10">
                      ← назад · ↓ в избранное · → дальше
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipe(result);
                          setMessage("");
                        }}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm active:scale-[0.98]"
                      >
                        Открыть
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          result.missingIds.length > 0
                            ? addMissingToShopping(result)
                            : startCooking(result)
                        }
                        disabled={addingRecipeId !== null}
                        className="rounded-2xl bg-green-500 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60 active:scale-[0.98]"
                      >
                        {result.missingIds.length > 0 ? "В покупки" : "Готовить"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>


          </>
        )}
          </>
        )}
      </div>
    );
  }

  function renderRecipeListBlock({
    title,
    count,
    open,
    onToggle,
    items,
    emptyText,
  }: {
    title: string;
    count: number | string;
    open: boolean;
    onToggle: () => void;
    items: MatchResult[];
    emptyText: string;
  }) {
    return (
      <ToggleBlock title={title} count={count} open={open} onToggle={onToggle}>
        <button
          type="button"
          onClick={refreshRecipesManually}
          disabled={matchingRecipes || loadingSuggested}
          className="mb-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 active:scale-[0.99]"
        >
          {matchingRecipes ? "⏳ Обновляю..." : "🔄 Обновить рецепты"}
        </button>

        {loadingSuggested || matchingRecipes ? (
          <p className="text-sm text-slate-500">Подбираю рецепты...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyText}</p>
        ) : (
          <div className="space-y-3">
            {items.map((result) => (
              <RecipeCard key={result.recipe.id} result={result} />
            ))}
          </div>
        )}
      </ToggleBlock>
    );
  }

  const isSearching = normalizeText(search).length >= 2;
  const showAdvancedBlocks = false;

  const cookingGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        title: string;
        emoji: string;
        subtitle: string;
        items: CookingRecipe[];
      }
    >();

    cookingRecipes.forEach((recipe) => {
      const groupId = recipe.mealPlanId || "single";

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          title: recipe.mealPlanTitle || "Отдельные блюда",
          emoji: recipe.mealPlanEmoji || "👨‍🍳",
          subtitle: recipe.mealPlanSubtitle || "Будем готовить",
          items: [],
        });
      }

      groups.get(groupId)?.items.push(recipe);
    });

    const order: Record<string, number> = {
      breakfast: 1,
      lunch: 2,
      dinner: 3,
      single: 4,
    };

    return Array.from(groups.values()).sort(
      (a, b) => (order[a.id] || 99) - (order[b.id] || 99),
    );
  }, [cookingRecipes]);

  const recipeCountText = matchingRecipes || loadingSuggested ? "…" : null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <AnimatePresence>
          {message && (
            <motion.div
              key="ai-message-toast"
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-20 z-[9999] w-[88%] max-w-md -translate-x-1/2 rounded-2xl bg-blue-500 px-4 py-2.5 text-center text-sm font-semibold leading-snug text-white shadow-xl"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {matchingRecipes && (
            <motion.div
              key="ai-matching-toast"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none fixed left-1/2 top-4 z-[9998] w-[88%] max-w-md -translate-x-1/2 rounded-2xl bg-blue-50 px-4 py-3 shadow-xl ring-1 ring-blue-100"
            >
              <div className="text-sm font-medium text-blue-700">
                🤖 Сопоставляю продукты дома и рецепты...
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${matchProgress}%` }}
                />
              </div>

              <div className="mt-1 text-xs text-blue-600">
                {matchProgress}% обработано
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-5 pt-8 pb-4"
        >
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">AI Cook 🤖</h1>
          <p className="mt-1 text-sm text-slate-500">
            Рецепты по продуктам дома, времени и семейным сценариям
          </p>
        </motion.header>

        <section className="space-y-5 px-5">
          {!isSearching && renderSwipeRecipeDeck()}

          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔍 Найти рецепт от 2 букв"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-blue-400"
          />


          {isSearching && (
            <ToggleBlock
              title="🔎 Результаты поиска"
              count={searchResults.length}
              open={showSearch}
              onToggle={() => setShowSearch((prev) => !prev)}
            >
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
            </ToggleBlock>
          )}

          {!isSearching && cookingRecipes.length > 0 && (
            <ToggleBlock
              title="👨‍🍳 Будем готовить"
              count={cookingRecipes.length}
              open={showCooking}
              onToggle={() => setShowCooking((prev) => !prev)}
            >
              <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                  {cookingGroups.map((group) => {
                    const style = getMealPlanStyle(group.id);

                    return (
                      <motion.div
                        key={group.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        className={`rounded-3xl p-4 shadow-sm ${style.card}`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-500">
                              {group.emoji} {group.subtitle}
                            </p>
                            <h3 className="text-lg font-bold text-slate-900">
                              {group.title}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${style.badge}`}
                          >
                            {group.items.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {group.items.map((recipe) => (
                            <motion.div
                              key={recipe.id}
                              layout
                              whileTap={{ scale: 0.98 }}
                              onClick={() => openRecipeById(recipe.recipeId)}
                              className={`cursor-pointer rounded-2xl p-3 ${style.item}`}
                            >
                              <h4 className="text-base font-semibold text-slate-900">
                                🔍 {recipe.title}
                              </h4>
                              <p className="mt-1 text-sm text-slate-500">
                                {recipe.category || "Рецепт"}
                                {recipe.cookingTime
                                  ? ` · ${recipe.cookingTime}`
                                  : ""}
                                {typeof recipe.score === "number"
                                  ? ` · ${recipe.score}%`
                                  : ""}
                              </p>

                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    markCookingDone(recipe);
                                  }}
                                  className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                                >
                                  ✅ Приготовили
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeCooking(recipe);
                                  }}
                                  className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                                >
                                  Убрать
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </ToggleBlock>
          )}

          {!isSearching && showAdvancedBlocks && (
            <ToggleBlock
              title="🍽 Меню на сегодня"
              count={recipeCountText || mealPlans.length}
              open={showMealPlan}
              onToggle={() => setShowMealPlan((prev) => !prev)}
            >
              {loadingSuggested || matchingRecipes ? (
                <p className="text-sm text-slate-500">Собираю меню...</p>
              ) : mealPlans.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Пока не получилось собрать завтрак, обед или ужин. Добавь
                  больше продуктов в “Есть дома”.
                </p>
              ) : (
                <div className="space-y-4">
                  {mealPlans.map((plan) => (
                    <MealPlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              )}
            </ToggleBlock>
          )}

          {!isSearching && showAdvancedBlocks && (
            <>
              <ToggleBlock
                title="⚡ Быстро приготовить"
                count={recipeCountText || quickResults.length}
                open={showQuick}
                onToggle={() => setShowQuick((prev) => !prev)}
              >
                {loadingSuggested || matchingRecipes ? (
                  <p className="text-sm text-slate-500">
                    Подбираю быстрые рецепты...
                  </p>
                ) : quickResults.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Пока нет быстрых рецептов по текущим продуктам дома.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {quickResults.map((result) => (
                      <RecipeCard key={result.recipe.id} result={result} />
                    ))}
                  </div>
                )}
              </ToggleBlock>

              {renderRecipeListBlock({
                title: "👶 Детское меню",
                count: recipeCountText || kidsResults.length,
                open: showKids,
                onToggle: () => setShowKids((prev) => !prev),
                items: kidsResults,
                emptyText:
                  "Пока не нашёл рецепты с пометкой детское по текущим продуктам дома.",
              })}

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
            </>
          )}
        </section>

        <AnimatePresence>
          {selectedRecipe && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 px-4 py-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className="mx-auto flex max-h-full max-w-md flex-col rounded-3xl bg-white"
              >
                <div className="border-b border-slate-100 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedRecipe.recipe.title}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedRecipe.recipe.category || "Рецепт"}
                        {` · ${getRecipeTimeLabel(selectedRecipe.recipe)}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRecipe(null)}
                      className="rounded-full bg-slate-100 px-3 py-2 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto p-5 pb-40">
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

                  <div className="mb-4 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => startCooking(selectedRecipe)}
                      className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white"
                    >
                      👨‍🍳 Будем готовить
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFavoriteRecipe(selectedRecipe.recipe)}
                      className="rounded-2xl bg-slate-100 px-4 py-3 text-xl shadow-sm"
                      title="Добавить в избранное"
                    >
                      {isFavoriteRecipe(selectedRecipe.recipe.id) ? "⭐" : "☆"}
                    </button>
                  </div>

                  {selectedRecipe.recipe.description && (
                    <p className="mb-5 text-sm leading-6 text-slate-700">
                      {selectedRecipe.recipe.description}
                    </p>
                  )}

                  {selectedRecipe.recipe.note ? (
                    <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                      💡 {selectedRecipe.recipe.note}
                    </p>
                  ) : null}

                  <h3 className="mb-2 font-semibold">Есть дома</h3>

                  <div className="mb-5 space-y-2">
                    {selectedRecipe.haveIds.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Из нужных ингредиентов дома ничего нет.
                      </p>
                    ) : (
                      selectedRecipe.haveIds.map((id) => (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="rounded-2xl bg-green-50 px-4 py-2 text-sm text-green-700"
                        >
                          ✓ {getProductLabel(id)}
                        </motion.div>
                      ))
                    )}
                  </div>

                  {selectedRecipe.missingIds.length > 0 && (
                    <>
                      <h3 className="mb-2 font-semibold">Не хватает</h3>

                      <div className="mb-5 space-y-2">
                        {selectedRecipe.missingIds.map((id) => (
                          <motion.div
                            key={id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="rounded-2xl bg-orange-50 px-4 py-2 text-sm text-orange-700"
                          >
                            + {getProductLabel(id)}
                          </motion.div>
                        ))}
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        type="button"
                        onClick={() => addMissingToShopping(selectedRecipe)}
                        disabled={addingRecipeId !== null}
                        className="mb-5 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white disabled:opacity-60"
                      >
                        {addingRecipeId === selectedRecipe.recipe.id
                          ? "⏳ Добавляю..."
                          : "🛒 Добавить недостающее в покупки"}
                      </motion.button>
                    </>
                  )}

                  {selectedRecipe.recipe.rawIngredients &&
                  selectedRecipe.recipe.rawIngredients.length > 0 ? (
                    <>
                      <h3 className="mb-2 font-semibold">
                        Ингредиенты по рецепту
                      </h3>
                      <div className="mb-5 space-y-2">
                        {selectedRecipe.recipe.rawIngredients.map(
                          (ingredient, index) => (
                            <div
                              key={`${ingredient.ingredientId || ingredient.name}-${index}`}
                              className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700"
                            >
                              {ingredient.name || ingredient.ingredientId}
                              {ingredient.quantity
                                ? ` — ${ingredient.quantity}`
                                : ""}
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  ) : null}

                  <h3 className="mb-2 font-semibold">Приготовление</h3>

                  <div className="space-y-3">
                    {(selectedRecipe.recipe.steps || []).map((step, index) => (
                      <motion.div
                        key={`${step}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                      >
                        <b>Шаг {index + 1}.</b> {step}
                      </motion.div>
                    ))}
                  </div>

                  {(!selectedRecipe.recipe.steps ||
                    selectedRecipe.recipe.steps.length === 0) && (
                    <p className="text-sm text-slate-500">
                      Шаги приготовления не указаны.
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <BottomNav current="ai" />
      </div>
    </main>
  );
}
