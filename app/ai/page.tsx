"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import { useFirestoreResumeKey } from "../../lib/useFirestoreResumeKey";
import { DeckModeLauncher } from "./components/DeckModeLauncher";
import { SwipeRecipeDeck } from "./components/SwipeRecipeDeck";
import {
  getQuickRecipeKind,
  getRecipeIngredientText,
  getRecipeKind,
  getRecipeSearchText,
  getRecipeTagsText,
  getRecipeTitleCategoryText,
  isBadRecipeForAi,
  isHolidayRecipe,
  isKidsRecipe,
  isQuickRecipe,
  isRealDish,
} from "./recipeClassifiers";
import type { RecipeKind } from "./recipeClassifiers";
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

type RecipeIngredientIndex = Record<string, string[]>;

type CachedMatchResult = {
  recipeId: string;
  score: number;
  haveIds: string[];
  missingIds: string[];
  total: number;
};

type RecipeMatchInput = {
  idsForScore: string[];
  comparableIdsById: Record<string, string[]>;
};

type RecipeMeta = {
  title: string;
  titleWords: string[];
  titleCategory: string;
  titleCategoryWords: string[];
  ingredients: string;
  tags: string;
  allText: string;
  isBad: boolean;
  isReal: boolean;
  kind: RecipeKind;
  quickKind: RecipeKind | "other";
  isQuick: boolean;
  isKids: boolean;
  isHoliday: boolean;
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

type CookDeckMode = "ready" | "kids" | "categories" | "favorites";
type SwipeDirection = "left" | "right" | "down" | "next";

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

function buildRecipeMeta(recipe: Recipe): RecipeMeta {
  const title = normalizeText(recipe.title || "");
  const titleCategory = getRecipeTitleCategoryText(recipe);
  const kind = getRecipeKind(recipe);

  return {
    title,
    titleWords: title.split(" ").filter(Boolean),
    titleCategory,
    titleCategoryWords: titleCategory.split(" ").filter(Boolean),
    ingredients: getRecipeIngredientText(recipe),
    tags: getRecipeTagsText(recipe),
    allText: getRecipeSearchText(recipe),
    isBad: isBadRecipeForAi(recipe),
    isReal: isRealDish(recipe),
    kind,
    quickKind: getQuickRecipeKind(recipe),
    isQuick: isQuickRecipe(recipe),
    isKids: isKidsRecipe(recipe),
    isHoliday: isHolidayRecipe(recipe),
  };
}

let cachedAiProducts: Product[] | null = null;
let cachedAiRecipes: Recipe[] | null = null;
let cachedAiRecipeIngredientIndex: RecipeIngredientIndex | null = null;
let cachedAiRecipeMetaSource: Recipe[] | null = null;
let cachedAiRecipeMetaById: Map<string, RecipeMeta> | null = null;
let cachedRecipeDetailsShards: Record<number, Record<string, Partial<Recipe>>> = {};


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
  const firestoreResumeKey = useFirestoreResumeKey();

  const [products, setProducts] = useState<Product[]>(
    () => cachedAiProducts || [],
  );
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>(
    () => cachedAiRecipes || [],
  );
  const [recipeIngredientIndex, setRecipeIngredientIndex] = useState<RecipeIngredientIndex>(
    () => cachedAiRecipeIngredientIndex || {},
  );
  const [searchRecipes, setSearchRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [cookingRecipes, setCookingRecipes] = useState<CookingRecipe[]>([]);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<MatchResult | null>(
    null,
  );

  const [loadingProducts, setLoadingProducts] = useState(
    () => !cachedAiProducts,
  );
  const [loadingFridge, setLoadingFridge] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(
    () => !cachedAiRecipes,
  );
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
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [selectedRecipeKind, setSelectedRecipeKind] =
    useState<RecipeKind | null>(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] =
    useState<SwipeDirection>("next");
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

  const recipeMatchInputs = useMemo(() => {
    // Важно: раньше здесь заранее просчитывались comparableIds для ВСЕХ 13 703 рецептов.
    // На телефоне это давало длинный первичный просчёт ещё до самого подбора.
    // Теперь comparableIds считаются лениво только для рецептов-кандидатов в buildMatch().
    return new Map<string, RecipeMatchInput>();
  }, []);

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

  const getRecipeMeta = useCallback((recipe: Recipe) => {
    // Важно для скорости: не строим метаданные сразу для всех 13 703 рецептов.
    // Создаём их лениво только для тех карточек/поиска, которые реально нужны.
    if (cachedAiRecipeMetaSource !== suggestedRecipes || !cachedAiRecipeMetaById) {
      cachedAiRecipeMetaSource = suggestedRecipes;
      cachedAiRecipeMetaById = new Map();
    }

    const cachedMeta = cachedAiRecipeMetaById.get(recipe.id);
    if (cachedMeta) return cachedMeta;

    const meta = buildRecipeMeta(recipe);
    cachedAiRecipeMetaById.set(recipe.id, meta);
    return meta;
  }, [suggestedRecipes]);

  function getSearchScore(recipe: Recipe, query: string) {
    const searchText = normalizeText(query);
    if (searchText.length < 2) return 0;

    const meta = getRecipeMeta(recipe);
    const words = searchText.split(" ").filter((word) => word.length >= 2);

    let score = 0;

    if (meta.title === searchText) score += 600;
    if (meta.title.startsWith(searchText)) score += 420;
    if (meta.title.includes(searchText)) score += 320;
    if (meta.titleCategory.includes(searchText)) score += 170;
    if (meta.tags.includes(searchText)) score += 110;
    if (meta.ingredients.includes(searchText)) score += 70;
    if (meta.allText.includes(searchText)) score += 35;

    for (const word of words) {
      if (meta.titleWords.some((item) => item === word)) score += 110;
      else if (meta.titleWords.some((item) => item.startsWith(word)))
        score += 85;
      else if (meta.title.includes(word)) score += 60;

      if (meta.titleCategoryWords.some((item) => item === word)) score += 45;
      else if (meta.titleCategoryWords.some((item) => item.startsWith(word)))
        score += 35;
      else if (meta.titleCategory.includes(word)) score += 25;

      if (meta.tags.includes(word)) score += 20;
      if (meta.ingredients.includes(word)) score += 12;
      if (!meta.allText.includes(word)) score -= 120;
    }

    if (score <= 0) return 0;

    const match = buildMatch(recipe);
    score += Math.min(match.score, 100);
    score += Math.min(match.haveIds.length * 8, 80);

    if (meta.isBad) score -= 250;
    if (meta.kind === "other") score -= 70;
    if ((recipe.steps?.length || 0) > 0) score += 20;
    if (recipe.cookingTime && recipe.cookingTime > 0) score += 10;
    if (recipe.popular) score += 12;
    if (recipe.familyFriendly) score += 8;

    return Math.max(0, score);
  }

  function seededNumber(value: string) {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4294967295;
  }

  
function recipeDetailsShardIndex(recipeId: string) {
  let hash = 2166136261;

  for (let index = 0; index < recipeId.length; index += 1) {
    hash ^= recipeId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 64;
}

function getFastSearchScore(recipe: Recipe, query: string) {
  const searchText = normalizeText(query);
  if (searchText.length < 2) return 0;

  const title = normalizeText(recipe.title || "");
  const category = normalizeText(recipe.category || "");
  const ingredientText = normalizeText((recipe.ingredientIds || []).join(" "));
  const words = searchText.split(" ").filter((word) => word.length >= 2);

  let score = 0;

  if (title === searchText) score += 600;
  if (title.startsWith(searchText)) score += 420;
  if (title.includes(searchText)) score += 320;
  if (category.includes(searchText)) score += 80;
  if (ingredientText.includes(searchText)) score += 40;

  for (const word of words) {
    if (title.split(" ").includes(word)) score += 90;
    else if (title.includes(word)) score += 50;
    if (category.includes(word)) score += 20;
    if (ingredientText.includes(word)) score += 10;
    if (!title.includes(word) && !category.includes(word) && !ingredientText.includes(word)) {
      score -= 80;
    }
  }

  if (recipe.popular) score += 10;
  if (recipe.familyFriendly) score += 8;

  return Math.max(0, score);
}

function sectionResults(
    predicate: (recipe: Recipe, result: MatchResult) => boolean,
    take = 20,
    sectionKey = "default",
  ) {
    const filteredResults = allMatchedResults.filter((result) => {
      if (!getRecipeMeta(result.recipe).isReal) return false;
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

    if (cachedAiProducts) return;

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
          cachedAiProducts = items;
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
      (error) => {
        console.warn("AI fridge snapshot warning", error);
        setLoadingFridge(false);
      },
    );

    return () => unsubscribe();
  }, [familyId, firestoreResumeKey]);

  useEffect(() => {
    let active = true;

    if (cachedAiRecipes && cachedAiRecipeIngredientIndex) return;

    async function loadAiRecipesFromFile() {
      try {
        setLoadingSuggested(true);
        setMessage("📦 Загружаю лёгкую базу рецептов...");

        const [response, indexResponse] = await Promise.all([
          fetch("/data/recipes_ai.json"),
          fetch("/data/recipe_ingredient_index.json"),
        ]);

        if (!response.ok) {
          throw new Error(`Recipes AI JSON load failed: ${response.status}`);
        }

        if (!indexResponse.ok) {
          throw new Error(`Recipe ingredient index load failed: ${indexResponse.status}`);
        }

        const [rawRecipes, rawRecipeIndex] = await Promise.all([
          response.json(),
          indexResponse.json(),
        ]);

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
                cuisine: rawRecipe.cuisine
                  ? String(rawRecipe.cuisine)
                  : undefined,
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
                optionalIngredientIds: Array.isArray(rawRecipe.optionalIngredientIds)
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
                searchText: rawRecipe.searchText
                  ? String(rawRecipe.searchText)
                  : normalizeText(
                      `${title} ${rawRecipe.category || ""} ${rawRecipe.categorySlug || ""} ${rawRecipe.cuisine || ""} ${rawRecipe.difficulty || ""} ${rawIngredients
                        .map(
                          (ingredient) =>
                            `${ingredient.name || ""} ${ingredient.ingredientId || ""} ${ingredient.quantity || ""}`,
                        )
                        .join(" ")}`,
                    ),
              };
            })
          : [];

        const parsedRecipeIndex: RecipeIngredientIndex = isRecord(rawRecipeIndex)
          ? Object.fromEntries(
              Object.entries(rawRecipeIndex)
                .filter(([, value]) => Array.isArray(value))
                .map(([key, value]) => [key, (value as unknown[]).map(String)]),
            )
          : {};

        if (active) {
          cachedAiRecipes = items;
          cachedAiRecipeIngredientIndex = parsedRecipeIndex;
          setSuggestedRecipes(items);
          setRecipeIngredientIndex(parsedRecipeIndex);
          setMessage(`✅ Лёгкая база рецептов загружена: ${items.length}`);
        }
      } catch (error) {
        console.error("LOCAL AI RECIPES LOAD ERROR", error);
        if (active) {
          setMessage(`Ошибка загрузки лёгкой базы рецептов: ${String(error)}`);
          setSuggestedRecipes([]);
          setRecipeIngredientIndex({});
        }
      } finally {
        if (active) {
          setLoadingSuggested(false);
        }
      }
    }

    loadAiRecipesFromFile();

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
      (error) => {
        console.warn("AI favorite recipes snapshot warning", error);
        setLoadingFavorites(false);
      },
    );

    return () => unsubscribe();
  }, [familyId, firestoreResumeKey]);

  useEffect(() => {
    if (!familyId) return;

    const cookingQuery = query(
      collection(db, "families", familyId, "cookingNow"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(
      cookingQuery,
      (snapshot) => {
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
      },
      (error) => {
        console.warn("AI cooking snapshot warning", error);
      },
    );

    return () => unsubscribe();
  }, [familyId, firestoreResumeKey]);

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
          searchScore: getFastSearchScore(recipe, searchText),
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

  const suggestedRecipeById = useMemo(() => {
    return new Map(suggestedRecipes.map((recipe) => [recipe.id, recipe]));
  }, [suggestedRecipes]);


  const ignoredCandidateIngredientIds = useMemo(() => {
    return new Set([
      "sol",
      "salt",
      "sahar",
      "sugar",
      "perec",
      "pepper",
      "black_pepper",
      "perec_cherniy_molotiy",
      "perec_chernyy_molotyy",
      "maslo",
      "oil",
      "maslo_rastitelnoe",
      "maslo_podsolnechnoe",
      "maslo_olivkovoe",
      "uksus",
      "voda",
      "water",
      "soda",
      "razryhlitel",
      "vanilin",
      "lavroviy_list",
      "lavrovyy_list",
    ]);
  }, []);

  function getRecipeCandidateScore(recipe: Recipe, usefulFridgeIds: Set<string>) {
    const allIds = Array.from(new Set(recipe.ingredientIds || []));
    const optionalIds = new Set(recipe.optionalIngredientIds || []);
    const requiredIds = allIds.filter((id) => !optionalIds.has(id));
    const idsForScore = requiredIds.length > 0 ? requiredIds : allIds;

    let hits = 0;

    for (const id of idsForScore) {
      // Быстрый первичный отбор: без тяжёлого normalizeText/normalizeIngredientKey на каждом ингредиенте.
      // Нормализация уже есть во fridgeIngredientIds.
      if (usefulFridgeIds.has(id)) hits += 1;
    }

    return hits;
  }

  function getRecipesForMatching() {
    const usefulFridgeIds = Array.from(
      new Set(
        fridgeIngredientIds.filter(
          (id) => !ignoredCandidateIngredientIds.has(normalizeIngredientKey(id)),
        ),
      ),
    );

    const hitsByRecipeId = new Map<string, number>();

    for (const ingredientId of usefulFridgeIds) {
      const directRecipeIds = recipeIngredientIndex[ingredientId] || [];
      const normalizedRecipeIds = recipeIngredientIndex[normalizeIngredientKey(ingredientId)] || [];

      for (const recipeId of directRecipeIds) {
        hitsByRecipeId.set(recipeId, (hitsByRecipeId.get(recipeId) || 0) + 1);
      }

      if (normalizedRecipeIds !== directRecipeIds) {
        for (const recipeId of normalizedRecipeIds) {
          hitsByRecipeId.set(recipeId, (hitsByRecipeId.get(recipeId) || 0) + 1);
        }
      }
    }

    const candidates = Array.from(hitsByRecipeId.entries())
      .map(([recipeId, hits]) => ({ recipe: suggestedRecipeById.get(recipeId), hits }))
      .filter((item): item is { recipe: Recipe; hits: number } => Boolean(item.recipe))
      .sort((a, b) => {
        if (b.hits !== a.hits) return b.hits - a.hits;
        return a.recipe.title.localeCompare(b.recipe.title, "ru");
      })
      .slice(0, 9000)
      .map((item) => item.recipe);

    return candidates;
  }

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
    const preparedInput = recipeMatchInputs.get(recipe.id);
    const fallbackIds = preparedInput
      ? []
      : Array.from(new Set(recipe.ingredientIds || []));
    const fallbackOptionalIds = preparedInput
      ? new Set<string>()
      : new Set(recipe.optionalIngredientIds || []);
    const fallbackRequiredIds = preparedInput
      ? []
      : fallbackIds.filter((id) => !fallbackOptionalIds.has(id));
    const idsForScore =
      preparedInput?.idsForScore ||
      (fallbackRequiredIds.length > 0 ? fallbackRequiredIds : fallbackIds);

    const haveIds: string[] = [];
    const missingIds: string[] = [];

    for (const id of idsForScore) {
      const comparableIds =
        preparedInput?.comparableIdsById[id] || getComparableIds(id);
      const hasIngredient = comparableIds.some((candidate) =>
        fridgeSet.has(candidate),
      );

      if (hasIngredient) {
        haveIds.push(id);
      } else {
        missingIds.push(id);
      }
    }

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
          matches?: CachedMatchResult[];
          recipeIds?: string[];
        };

        const matches = Array.isArray(parsed.matches) ? parsed.matches : [];
        const recipeIds = Array.isArray(parsed.recipeIds)
          ? parsed.recipeIds
          : matches.map((match) => match.recipeId);

        if (matches.length === 0 && recipeIds.length === 0) {
          setRecipesNeedRefresh(true);
          setMatchingRecipes(false);
          setMatchProgress(0);
          return;
        }

        const cachedResults = matches
          .map((match) => {
            const recipe = suggestedRecipeById.get(match.recipeId);
            if (!recipe) return null;

            return {
              recipe,
              score: match.score,
              haveIds: match.haveIds,
              missingIds: match.missingIds,
              total: match.total,
            } satisfies MatchResult;
          })
          .filter((result): result is MatchResult => Boolean(result));

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
    suggestedRecipeById,
    recipeCacheKey,
    fridgeSnapshotKey,
  ]);

  async function runRecipeMatching() {
    if (!products.length || !fridgeItems.length || !suggestedRecipes.length) {
      setMessage(
  `⚠️ База ещё загружается. Товары: ${products.length}, холодильник: ${fridgeItems.length}, рецепты: ${suggestedRecipes.length}`
);
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

    const recipesForMatching = getRecipesForMatching();

    if (recipesForMatching.length === 0) {
      setMatchedResultsState([]);
      setMatchProgress(100);
      setRecipesNeedRefresh(false);
      setMatchingRecipes(false);
      setMessage("⚠️ Для подбора нужны реальные продукты дома: мясо, овощи, крупы, молочка. Соль/масло/специи не считаю.");
      return;
    }

    const uniqueByTitle = new Map<string, MatchResult>();
    const chunkSize = 700;

    setMessage(
      `🤖 Считаю ${recipesForMatching.length} подходящих рецептов из ${suggestedRecipes.length}...`,
    );

    for (let index = 0; index < recipesForMatching.length; index += chunkSize) {
      const chunk = recipesForMatching.slice(index, index + chunkSize);

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
        Math.round(((index + chunk.length) / Math.max(recipesForMatching.length, 1)) * 100),
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
        matches: finalResults.map((result) => ({
          recipeId: result.recipe.id,
          score: result.score,
          haveIds: result.haveIds,
          missingIds: result.missingIds,
          total: result.total,
        })),
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
  const showAdvancedBlocks = false;

  const suggestedResults = useMemo(() => {
    const cleanResults = allMatchedResults.filter((result) =>
      getRecipeMeta(result.recipe).isReal,
    );

    const perfectResults = cleanResults
      .filter((result) => result.score === 100)
      .slice(0, 7);

    const almostResults = cleanResults
      .filter((result) => result.score < 100)
      .slice(0, 7 - perfectResults.length);

    return [...perfectResults, ...almostResults];
  }, [allMatchedResults, getRecipeMeta]);

  const quickResults = useMemo(() => {
    if (!showAdvancedBlocks) return [];

    const allowedKinds = new Set(["breakfast", "salad", "soup", "main"]);

    return allMatchedResults
      .filter((result) => {
        const meta = getRecipeMeta(result.recipe);
        return (
          result.score >= 35 &&
          allowedKinds.has(meta.quickKind) &&
          meta.isQuick
        );
      })
      .sort((a, b) => {
        const aKind = getRecipeMeta(a.recipe).quickKind;
        const bKind = getRecipeMeta(b.recipe).quickKind;
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
  }, [allMatchedResults, getRecipeMeta, recipeRefreshSeed]);

  const kidsResults = useMemo(() => {
    return sectionResults((recipe) => getRecipeMeta(recipe).isKids, 7, "kids");
    // sectionResults is pure route-local selection logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, getRecipeMeta, recipeRefreshSeed]);

  const holidayResults = useMemo(() => {
    if (!showAdvancedBlocks) return [];

    return sectionResults(
      (recipe) => getRecipeMeta(recipe).isHoliday,
      7,
      "holiday",
    );
    // sectionResults is pure route-local selection logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, getRecipeMeta, recipeRefreshSeed]);

  function recipeKind(result: MatchResult) {
    return getRecipeMeta(result.recipe).kind;
  }

  const mealPlans = useMemo(() => {
    if (!showAdvancedBlocks) return [];

    const usableResults = allMatchedResults.filter(
      (result) =>
        result.score >= 60 &&
        getRecipeMeta(result.recipe).isReal &&
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
  }, [allMatchedResults, getRecipeMeta, mealRecipeOverrides]);

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

  const favoriteRecipeIds = useMemo(() => {
    return new Set(favoriteRecipes.map((recipe) => recipe.id));
  }, [favoriteRecipes]);

  const readyResults = useMemo(() => {
    return allMatchedResults.filter(
      (result) =>
        getRecipeMeta(result.recipe).isReal &&
        result.total > 0 &&
        result.missingIds.length === 0 &&
        result.score === 100,
    );
  }, [allMatchedResults, getRecipeMeta]);

  const availableRecipeKinds = useMemo(() => {
    const counts = new Map<RecipeKind, { total: number; ready: number }>();

    for (const result of allMatchedResults) {
      const meta = getRecipeMeta(result.recipe);
      if (!meta.isReal || result.score < 25) continue;

      const kind = meta.kind;
      const current = counts.get(kind) || { total: 0, ready: 0 };

      counts.set(kind, {
        total: current.total + 1,
        ready:
          result.missingIds.length === 0 && result.score === 100
            ? current.ready + 1
            : current.ready,
      });
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
      .filter((kind) => (counts.get(kind)?.total || 0) > 0)
      .map((kind) => ({
        kind,
        count: counts.get(kind)?.total || 0,
        readyCount: counts.get(kind)?.ready || 0,
      }));
  }, [allMatchedResults, getRecipeMeta]);

  const categoryDeckResults = useMemo(() => {
    const categoryMap = new Map<RecipeKind, MatchResult[]>();
    const kinds = [
      "breakfast",
      "salad",
      "soup",
      "main",
      "side",
      "baking",
      "dessert",
      "drink",
      "other",
    ] as RecipeKind[];

    for (const kind of kinds) {
      categoryMap.set(
        kind,
        sectionResults(
          (recipe) => getRecipeMeta(recipe).kind === kind,
          60,
          `kind_${kind}`,
        ),
      );
    }

    return categoryMap;
    // getRecipeKind and sectionResults are pure route-local selection logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedResults, getRecipeMeta, recipeRefreshSeed]);

  const deckResults = useMemo(() => {
    const uniqueResults = new Map<string, MatchResult>();

    const source =
      activeDeckMode === "ready"
        ? readyResults
        : activeDeckMode === "kids"
          ? kidsResults
          : activeDeckMode === "favorites"
            ? favoriteResults
            : activeDeckMode === "categories" && selectedRecipeKind
              ? categoryDeckResults.get(selectedRecipeKind) || []
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
  }, [
    activeDeckMode,
    categoryDeckResults,
    favoriteResults,
    kidsResults,
    readyResults,
    recipeRefreshSeed,
    selectedRecipeKind,
  ]);

  const currentDeckResult =
    deckResults.length > 0 ? deckResults[deckIndex % deckResults.length] : null;

  const matchedResultByRecipeId = useMemo(() => {
    const map = new Map<string, MatchResult>();

    for (const result of [
      ...suggestedResults,
      ...quickResults,
      ...kidsResults,
      ...holidayResults,
      ...searchResults,
      ...favoriteResults,
    ]) {
      map.set(result.recipe.id, result);
    }

    return map;
  }, [
    favoriteResults,
    holidayResults,
    kidsResults,
    quickResults,
    searchResults,
    suggestedResults,
  ]);

  function getRecipeTime(recipe: Recipe) {
    if (recipe.cookingTimeText) return recipe.cookingTimeText;
    if (recipe.prepareTimeText) return recipe.prepareTimeText;
    if (recipe.time) return recipe.time;
    if (recipe.cookingTime) return `${recipe.cookingTime} мин`;
    return "";
  }

  function getEstimatedRecipeTime(recipe: Recipe) {
    const kind = getRecipeMeta(recipe).kind;
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
    return favoriteRecipeIds.has(recipeId);
  }

  async function loadRecipeDetails(recipeId: string) {
    const shardIndex = recipeDetailsShardIndex(recipeId);
    const cachedShard = cachedRecipeDetailsShards[shardIndex];

    if (cachedShard) {
      return cachedShard[recipeId] || null;
    }

    const response = await fetch(`/data/recipe_details_shards/shard_${shardIndex}.json`);

    if (!response.ok) {
      throw new Error(`Recipe details shard load failed: ${response.status}`);
    }

    const shard = (await response.json()) as Record<string, Partial<Recipe>>;
    cachedRecipeDetailsShards[shardIndex] = shard;

    return shard[recipeId] || null;
  }

  async function openRecipeResult(result: MatchResult) {
    setSelectedRecipe(result);
    setMessage("");

    const hasDetails =
      (result.recipe.rawIngredients?.length || 0) > 0 ||
      (result.recipe.steps?.length || 0) > 0 ||
      Boolean(result.recipe.description || result.recipe.note);

    if (hasDetails) return;

    try {
      const details = await loadRecipeDetails(result.recipe.id);
      if (!details) return;

      setSelectedRecipe((current) => {
        if (!current || current.recipe.id !== result.recipe.id) return current;

        return {
          ...current,
          recipe: cleanForFirestore({
            ...current.recipe,
            ...details,
            id: current.recipe.id,
            title: current.recipe.title,
            category: details.category || current.recipe.category,
            ingredientIds: current.recipe.ingredientIds,
            optionalIngredientIds: current.recipe.optionalIngredientIds,
          }),
        } satisfies MatchResult;
      });
    } catch (error) {
      console.warn("AI recipe details load warning", error);
      setMessage("⚠️ Не получилось загрузить шаги рецепта.");
    }
  }

  async function openRecipeById(recipeId: string) {
    const cached = matchedResultByRecipeId.get(recipeId);

    if (cached) {
      void openRecipeResult(cached);
      return;
    }

    const recipe = suggestedRecipes.find((item) => item.id === recipeId);

    if (!recipe) {
      setMessage("⚠️ Рецепт не найден в локальной базе.");
      return;
    }

    void openRecipeResult(buildMatch(recipe));
  }

  function showNextDeckRecipe(direction: SwipeDirection) {
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
                  void openRecipeResult(item);
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
            void openRecipeResult(result);
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

  function openDeckMode(mode: CookDeckMode) {
    setActiveDeckMode(mode);
    setSelectedRecipeKind(null);
    setDeckIndex(0);
    setShowDeckModal(true);
  }

  function closeDeckMode() {
    setShowDeckModal(false);
    setSelectedRecipeKind(null);
    setDeckIndex(0);
  }

  function renderDeckModeLauncher() {
    return (
      <DeckModeLauncher
        readyCount={readyResults.length}
        kidsCount={kidsResults.length}
        categoriesCount={availableRecipeKinds.length}
        favoritesCount={favoriteResults.length}
        onOpenMode={openDeckMode}
      />
    );
  }
  function renderSwipeRecipeDeck() {
    return (
      <SwipeRecipeDeck
        activeDeckMode={activeDeckMode}
        selectedRecipeKind={selectedRecipeKind}
        deckIndex={deckIndex}
        swipeDirection={swipeDirection}
        currentDeckResult={currentDeckResult}
        favoriteResults={favoriteResults}
        availableRecipeKinds={availableRecipeKinds}
        loadingFavorites={loadingFavorites}
        loadingSuggested={loadingSuggested}
        matchingRecipes={matchingRecipes}
        addingRecipeId={addingRecipeId}
        onClose={closeDeckMode}
        onSelectRecipeKind={(kind) => {
          setSelectedRecipeKind(kind);
          setDeckIndex(0);
        }}
        onNext={() => showNextDeckRecipe("right")}
        onPrevious={showPrevDeckRecipe}
        onFavoriteSwipe={(result) => {
          void toggleFavoriteRecipe(result.recipe);
          showNextDeckRecipe("down");
        }}
        onOpenRecipe={(result) => {
          void openRecipeResult(result);
        }}
        onAddMissingToShopping={addMissingToShopping}
        onStartCooking={startCooking}
        renderRecipeCard={(result) => (
          <RecipeCard key={result.recipe.id} result={result} />
        )}
        getRecipeTimeLabel={getRecipeTimeLabel}
        getProductLabel={getProductLabel}
      />
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
          {!isSearching && renderDeckModeLauncher()}

          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔍 Найти рецепт от 2 букв"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-blue-400"
          />
          {!isSearching && (
  <button
    type="button"
    onClick={refreshRecipesManually}
    disabled={matchingRecipes || loadingSuggested}
    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 active:scale-[0.99]"
  >
    {matchingRecipes
      ? `⏳ Обновляю... ${matchProgress}%`
      : "🔄 Обновить подбор"}
  </button>
)}

          {!isSearching && recipesNeedRefresh && !matchingRecipes && !loadingSuggested && (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-100">
              🔄 Подбор рецептов не обновлён. Нажми “Обновить подбор”, когда нужно пересчитать по продуктам дома.
            </div>
          )}

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
          {showDeckModal && (
            <motion.div
              key="ai-deck-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="mx-auto min-h-[100dvh] max-w-md overflow-hidden rounded-none bg-slate-950 shadow-2xl sm:my-5 sm:min-h-[calc(100dvh-40px)] sm:rounded-[32px]"
              >
                {renderSwipeRecipeDeck()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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