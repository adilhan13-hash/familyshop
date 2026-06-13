"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  getDoc,
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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white p-5 shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            {count}
          </span>
        </div>
        <span className="text-xl text-slate-400">{open ? "▲" : "▼"}</span>
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
    </motion.div>
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
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  const [showMealPlan, setShowMealPlan] = useState(true);
  const [mealRecipeOverrides, setMealRecipeOverrides] = useState<
    Record<string, string>
  >({});
  const [showCooking, setShowCooking] = useState(true);
  const [showSuggested, setShowSuggested] = useState(true);
  const [showSearch, setShowSearch] = useState(true);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFridge, setShowFridge] = useState(false);

  const [addedAnimation, setAddedAnimation] = useState(false);
  const [cookingAnimation, setCookingAnimation] = useState(false);

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

  useEffect(() => {
    const productsQuery = query(collection(db, "products"));

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const items: Product[] = [];

      snapshot.forEach((document) => {
        const data = document.data();
        items.push({
          id: data.id || document.id,
          icon: data.icon || "🛒",
          name: data.name || document.id,
          category: data.category || "Другое",
          ingredientId: data.ingredientId,
          aliases: data.aliases || [],
          search: data.search || [],
          mergedIds: data.mergedIds || [],
        });
      });

      setProducts(items);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
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
    async function loadAllRecipes() {
      try {
        setLoadingSuggested(true);

        const snapshot = await getDocs(collection(db, "recipes"));
        const items: Recipe[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          items.push({
            id: data.id || document.id,
            title: data.title || "Без названия",
            category: data.category || "Рецепт",
            cuisine: data.cuisine,
            difficulty: data.difficulty,
            cookingTime: data.cookingTime,
            cookingTimeText: data.cookingTimeText,
            time: data.time,
            description: data.description,
            ingredientIds: data.ingredientIds || [],
            optionalIngredientIds: data.optionalIngredientIds || [],
            steps: data.steps || [],
            searchTitle: data.searchTitle || normalizeText(data.title || ""),
          });
        });

        setSuggestedRecipes(items);
      } catch (error) {
        console.error("AI recipes load error", error);
        setSuggestedRecipes([]);
      } finally {
        setLoadingSuggested(false);
      }
    }

    loadAllRecipes();
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
            cookingTime: data.cookingTime,
            cookingTimeText: data.cookingTimeText,
            time: data.time,
            description: data.description,
            ingredientIds: data.ingredientIds || [],
            optionalIngredientIds: data.optionalIngredientIds || [],
            steps: data.steps || [],
            searchTitle: data.searchTitle,
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

    if (searchText.length < 2) {
      setSearchRecipes([]);
      setLoadingSearch(false);
      return;
    }

    async function searchRecipesFromBook() {
      try {
        setLoadingSearch(true);

        const recipesQuery = query(
          collection(db, "recipes"),
          orderBy("searchTitle"),
          startAt(searchText),
          endAt(`${searchText}\uf8ff`),
          limit(40),
        );

        const snapshot = await getDocs(recipesQuery);

        const items: Recipe[] = snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: data.id || document.id,
            title: data.title || "Без названия",
            category: data.category || "Рецепт",
            cuisine: data.cuisine,
            difficulty: data.difficulty,
            cookingTime: data.cookingTime,
            cookingTimeText: data.cookingTimeText,
            time: data.time,
            description: data.description,
            ingredientIds: data.ingredientIds || [],
            optionalIngredientIds: data.optionalIngredientIds || [],
            steps: data.steps || [],
            searchTitle: data.searchTitle || normalizeText(data.title || ""),
          };
        });

        setSearchRecipes(items);
      } catch (error) {
        console.error("AI recipe search error", error);
      } finally {
        setLoadingSearch(false);
      }
    }

    const timer = setTimeout(searchRecipesFromBook, 350);
    return () => clearTimeout(timer);
  }, [search]);

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
  }, [fridgeItems, productsMap]);

  function buildMatch(recipe: Recipe): MatchResult {
    const fridgeSet = new Set(fridgeIngredientIds);
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

  const allMatchedResults = useMemo(() => {
    const uniqueByTitle = new Map<string, MatchResult>();

    suggestedRecipes
      .map(buildMatch)
      .filter((result) => result.total > 0 && result.score > 0)
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
      .forEach((result) => {
        const titleKey = normalizeText(result.recipe.title);

        if (!uniqueByTitle.has(titleKey)) {
          uniqueByTitle.set(titleKey, result);
        }
      });

    return Array.from(uniqueByTitle.values());
  }, [suggestedRecipes, fridgeIngredientIds]);

  const suggestedResults = useMemo(() => {
    const perfectResults = allMatchedResults
      .filter((result) => result.score === 100)
      .slice(0, 15);

    const almostResults = allMatchedResults
      .filter((result) => result.score < 100)
      .slice(0, 50 - perfectResults.length);

    return [...perfectResults, ...almostResults];
  }, [allMatchedResults]);

  function recipeKind(result: MatchResult) {
    const text = normalizeText(
      `${result.recipe.title} ${result.recipe.category || ""}`,
    );

    if (/(салат|винегрет|закуска|овощн)/.test(text)) return "salad";
    if (
      /(суп|борщ|щи|уха|рассольник|солянка|окрошка|шурпа|бульон|крем суп)/.test(
        text,
      )
    )
      return "soup";
    if (/(чай|кофе|компот|морс|кисель|напиток|сок|какао)/.test(text))
      return "drink";
    if (
      /(десерт|торт|пирог|печенье|кекс|булоч|пирожн|сырник|запеканка|блины|оладьи)/.test(
        text,
      )
    ) {
      if (
        /(сырник|каша|омлет|яичниц|блины|оладьи|бутерброд|тост|завтрак)/.test(
          text,
        )
      ) {
        return "breakfast";
      }
      return "dessert";
    }
    if (
      /(завтрак|омлет|яичниц|каша|бутерброд|тост|гренк|сырник|блины|оладьи)/.test(
        text,
      )
    ) {
      return "breakfast";
    }

    return "main";
  }

  const mealPlans = useMemo(() => {
    const usableResults = allMatchedResults.filter(
      (result) => result.score >= 70,
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
  }, [allMatchedResults, mealRecipeOverrides]);

  const recommendedMeal = useMemo(() => {
    if (mealPlans.length === 0) return null;

    return [...mealPlans].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.missingIds.length !== b.missingIds.length) {
        return a.missingIds.length - b.missingIds.length;
      }
      return b.items.length - a.items.length;
    })[0];
  }, [mealPlans]);

  const searchResults = useMemo(() => {
    return searchRecipes.map(buildMatch);
  }, [searchRecipes, fridgeIngredientIds]);

  const favoriteResults = useMemo(() => {
    return favoriteRecipes.map(buildMatch);
  }, [favoriteRecipes, fridgeIngredientIds]);

  function getRecipeTime(recipe: Recipe) {
    if (recipe.cookingTimeText) return recipe.cookingTimeText;
    if (recipe.time) return recipe.time;
    if (recipe.cookingTime) return `${recipe.cookingTime} мин`;
    return "";
  }

  function isFavoriteRecipe(recipeId: string) {
    return favoriteRecipes.some((recipe) => recipe.id === recipeId);
  }

  async function openRecipeById(recipeId: string) {
    const cached = [
      ...suggestedResults,
      ...searchResults,
      ...favoriteResults,
    ].find((result) => result.recipe.id === recipeId);

    if (cached) {
      setSelectedRecipe(cached);
      setMessage("");
      return;
    }

    try {
      const recipeDoc = await getDoc(doc(db, "recipes", recipeId));

      if (!recipeDoc.exists()) {
        setMessage("⚠️ Рецепт не найден в базе.");
        return;
      }

      const data = recipeDoc.data();
      const recipe: Recipe = {
        id: data.id || recipeDoc.id,
        title: data.title || "Без названия",
        category: data.category || "Рецепт",
        cuisine: data.cuisine,
        difficulty: data.difficulty,
        cookingTime: data.cookingTime,
        cookingTimeText: data.cookingTimeText,
        time: data.time,
        description: data.description,
        ingredientIds: data.ingredientIds || [],
        optionalIngredientIds: data.optionalIngredientIds || [],
        steps: data.steps || [],
        searchTitle: data.searchTitle || normalizeText(data.title || ""),
      };

      setSelectedRecipe(buildMatch(recipe));
      setMessage("");
    } catch (error) {
      console.error("OPEN RECIPE ERROR", error);
      setMessage("⚠️ Не получилось открыть рецепт.");
    }
  }

  async function toggleFavoriteRecipe(recipe: Recipe) {
    if (!familyId) return;

    if (isFavoriteRecipe(recipe.id)) {
      await deleteDoc(
        doc(db, "families", familyId, "favoriteRecipes", recipe.id),
      );
      return;
    }

    await setDoc(
      doc(db, "families", familyId, "favoriteRecipes", recipe.id),
      {
        ...recipe,
        createdAt: serverTimestamp(),
      },
      { merge: true },
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
    if (!familyId) return;

    for (const ingredientId of result.missingIds) {
      const ingredient = getIngredientInfo(ingredientId);
      const name = makeLabel(ingredient.icon, ingredient.name);

      await addDoc(collection(db, "families", familyId, "shopping"), {
        name,
        productName: ingredient.name,
        icon: ingredient.icon,
        productId: ingredient.productId || ingredientId,
        ingredientId: ingredient.productId || ingredientId,
        category: ingredient.category || "Другое",
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
      `✅ Недостающее для "${result.recipe.title}" добавлено в покупки.`,
    );
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
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
      doc(db, "families", familyId, "cookingNow", `${plan.id}_${item.recipe.id}`),
      {
        recipeId: item.recipe.id,
        title: item.recipe.title,
        category: item.recipe.category || "Рецепт",
        cookingTime: getRecipeTime(item.recipe),
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
    if (!familyId) return;

    if (plan.items.length === 0) {
      setMessage(`В "${plan.title}" нет выбранных блюд.`);
      return;
    }

    if (addMissing && plan.missingIds.length > 0) {
      for (const ingredientId of plan.missingIds) {
        const ingredient = getIngredientInfo(ingredientId);
        const name = makeLabel(ingredient.icon, ingredient.name);

        await addDoc(collection(db, "families", familyId, "shopping"), {
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
        });

        await addActivity({
          familyId,
          userId: appUser?.uid || "unknown",
          userName: appUser?.displayName || "Без имени",
          type: "ai_meal_add_to_shopping",
          title: "AI добавил для меню",
          message: `${name} для набора ${plan.title}`,
          emoji: "🍽",
          itemName: name,
        });
      }
    }

    for (const item of plan.items) {
      await setDoc(
        doc(db, "families", familyId, "cookingNow", `${plan.id}_${item.recipe.id}`),
        {
          recipeId: item.recipe.id,
          title: item.recipe.title,
          category: item.recipe.category || "Рецепт",
          cookingTime: getRecipeTime(item.recipe),
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
        ? `🛒 Недостающее для "${plan.title}" добавлено в покупки, а меню добавлено в “Будем готовить”.`
        : `👨‍🍳 "${plan.title}" добавлен в “Будем готовить”.`,
    );
    setAddedAnimation(addMissing && plan.missingIds.length > 0);
    setCookingAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
    setTimeout(() => setCookingAnimation(false), 2000);
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
            disabled={plan.items.length === 0}
            className="w-full rounded-2xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            👨‍🍳 Будем готовить
          </button>

          {plan.missingIds.length > 0 ? (
            <button
              type="button"
              onClick={() => addMealMissingToShopping(plan)}
              disabled={plan.items.length === 0}
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
                🔍 {recipe.title}
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
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleFavoriteRecipe(recipe);
          }}
          className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-lg shadow-sm"
        >
          {favorite ? "⭐" : "☆"}
        </button>
      </div>
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
            Меню на сегодня из продуктов дома
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
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base outline-none focus:border-blue-400"
          />

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="rounded-2xl bg-blue-50 p-3 text-sm font-medium text-blue-700"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {addedAnimation && (
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="rounded-2xl bg-green-100 p-3 text-center text-sm font-medium text-green-700"
              >
                ✅ Добавлено в покупки и в “Будем готовить”
              </motion.div>
            )}

            {cookingAnimation && (
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="rounded-2xl bg-blue-100 p-3 text-center text-sm font-medium text-blue-700"
              >
                👨‍🍳 Блюдо отмечено как “Будем готовить”
              </motion.div>
            )}
          </AnimatePresence>

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

          {!isSearching && (
            <ToggleBlock
              title="🍽 Меню на сегодня"
              count={mealPlans.length}
              open={showMealPlan}
              onToggle={() => setShowMealPlan((prev) => !prev)}
            >
              {loadingSuggested ? (
                <p className="text-sm text-slate-500">Собираю меню...</p>
              ) : mealPlans.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Пока не получилось собрать завтрак, обед или ужин. Добавь
                  больше продуктов в холодильник.
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

          <ToggleBlock
            title="👨‍🍳 Будем готовить"
            count={cookingRecipes.length}
            open={showCooking}
            onToggle={() => setShowCooking((prev) => !prev)}
          >
            {cookingRecipes.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока нет выбранных блюд. Добавь недостающее из завтрака, обеда
                или ужина — весь набор появится здесь отдельной группой.
              </p>
            ) : (
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

                          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${style.badge}`}>
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
                                {recipe.cookingTime ? ` · ${recipe.cookingTime}` : ""}
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
            )}
          </ToggleBlock>

          {!isSearching && (
            <>
              <ToggleBlock
                title="⭐ Избранные рецепты"
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
                count={fridgeItems.length}
                open={showFridge}
                onToggle={() => setShowFridge((prev) => !prev)}
              >
                {loadingFridge ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : fridgeItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Добавь продукты в холодильник, и AI подберёт блюда.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {fridgeItems.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                      >
                        {item.icon || "🥛"} {item.productName || item.name}
                      </span>
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
              className="fixed inset-0 z-50 bg-black/40 px-4 py-6"
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
                        {getRecipeTime(selectedRecipe.recipe)
                          ? ` · ${getRecipeTime(selectedRecipe.recipe)}`
                          : ""}
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
                    type="button"
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
                        className="mb-5 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
                      >
                        🛒 Добавить недостающее в покупки
                      </motion.button>
                    </>
                  )}

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
