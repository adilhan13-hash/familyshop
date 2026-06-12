import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import products from "../data/products_v6_ready_for_firebase_icons_clean.json";
import canonicalMapRaw from "../data/ingredient_to_product_canonical_map_v6.json";

// true  = только проверка, ничего не пишет в Firebase
// false = будет обновлять рецепты в Firestore
const DRY_RUN = true;

const WRITE_PAUSE_MS = 80;
const WRITE_LOG_EVERY = 50;

type Product = {
  id: string;
  name: string;
  icon?: string;
  category?: string;
  aliases?: string[];
  search?: string[];
  mergedIds?: string[];
};

type Recipe = {
  id: string;
  title?: string;
  category?: string;
  cuisine?: string;
  description?: string;
  ingredientIds?: string[];
  optionalIngredientIds?: string[];
  [key: string]: any;
};

type CanonicalItem = {
  canonicalId: string;
  canonicalName: string;
};

const canonicalMap = canonicalMapRaw as Record<string, CanonicalItem>;

const manualMap: Record<string, string> = {
  yayca_kurinye: "yayca",
  yayco_kurinoe: "yayca",
  yayca: "yayca",
  yayco: "yayca",

  muka_pshenichnaya: "muka",
  muki: "muka",

  luk_repchatiy: "luk_repchatyy",
  luk_repchatyy: "luk_repchatyy",
  luka: "luk_repchatyy",

  chesnoka: "chesnok",

  lavroviy_list: "lavrovyy_list",
  lavrovyy_list: "lavrovyy_list",

  maslo_rastitelnoe: "maslo_rastitelnoe",
  rastitelnoe_maslo: "maslo_rastitelnoe",
  rastitelnogo_masla: "maslo_rastitelnoe",

  pomidor: "pomidory",
  pomidory: "pomidory",
  pomidorov: "pomidory",

  tomatniy_sok: "tomatnyy_sok",
  tomatnyy_sok: "tomatnyy_sok",

  ogurcy: "ogurcy",
  ogurtsy: "ogurcy",

  perec_chenniy_molotiy: "perec_chernyy_molotyy",
  perec_chernyy_molotyy: "perec_chernyy_molotyy",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: string) {
  return normalize(value).replace(/\s+/g, "_");
}

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildProductLookup() {
  const lookup = new Map<string, Product>();

  for (const product of products as Product[]) {
    const values = [
      product.id,
      product.name,
      ...(product.aliases || []),
      ...(product.search || []),
      ...(product.mergedIds || []),
    ].filter(Boolean);

    for (const value of values) {
      const text = String(value);
      lookup.set(text, product);
      lookup.set(normalize(text), product);
      lookup.set(normalizeKey(text), product);
      lookup.set(text.replace(/-/g, "_"), product);
      lookup.set(text.replace(/_/g, "-"), product);
    }
  }

  return lookup;
}

function buildCanonicalLookup() {
  const lookup = new Map<string, CanonicalItem>();

  for (const [key, value] of Object.entries(canonicalMap)) {
    if (!value?.canonicalId) continue;

    const values = [
      key,
      value.canonicalId,
      value.canonicalName,
    ].filter(Boolean);

    for (const raw of values) {
      const text = String(raw);
      lookup.set(text, value);
      lookup.set(normalize(text), value);
      lookup.set(normalizeKey(text), value);
      lookup.set(text.replace(/-/g, "_"), value);
      lookup.set(text.replace(/_/g, "-"), value);
    }
  }

  return lookup;
}

function getProductByAnyValue(value: string, productLookup: Map<string, Product>) {
  return (
    productLookup.get(value) ||
    productLookup.get(normalize(value)) ||
    productLookup.get(normalizeKey(value)) ||
    productLookup.get(value.replace(/-/g, "_")) ||
    productLookup.get(value.replace(/_/g, "-"))
  );
}

function remapId(
  oldId: string,
  productLookup: Map<string, Product>,
  canonicalLookup: Map<string, CanonicalItem>
) {
  const cleanId = String(oldId || "").trim();

  if (!cleanId) {
    return { newId: "", reason: "empty", productName: "" };
  }

  const directProduct = getProductByAnyValue(cleanId, productLookup);

  if (directProduct) {
    return {
      newId: directProduct.id,
      reason: directProduct.id === cleanId ? "already_product" : "product_lookup",
      productName: directProduct.name,
    };
  }

  const canonical =
    canonicalLookup.get(cleanId) ||
    canonicalLookup.get(normalize(cleanId)) ||
    canonicalLookup.get(normalizeKey(cleanId));

  if (canonical) {
    const product =
      getProductByAnyValue(canonical.canonicalId, productLookup) ||
      getProductByAnyValue(canonical.canonicalName, productLookup);

    if (product) {
      return {
        newId: product.id,
        reason: "canonical_map",
        productName: product.name,
      };
    }

    return {
      newId: cleanId,
      reason: "canonical_without_product_keep_old",
      productName: canonical.canonicalName || "",
    };
  }

  const manualTarget =
    manualMap[cleanId] || manualMap[normalizeKey(cleanId)] || manualMap[normalize(cleanId)];

  if (manualTarget) {
    const product = getProductByAnyValue(manualTarget, productLookup);

    if (product) {
      return {
        newId: product.id,
        reason: "manual_map",
        productName: product.name,
      };
    }

    return {
      newId: cleanId,
      reason: "manual_without_product_keep_old",
      productName: "",
    };
  }

  return { newId: cleanId, reason: "not_found", productName: "" };
}

function buildSearchText(recipe: Recipe, ingredientIds: string[], optionalIngredientIds: string[]) {
  return normalizeText(
    [
      recipe.title,
      recipe.category,
      recipe.cuisine,
      recipe.description,
      ...ingredientIds,
      ...optionalIngredientIds,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

async function loadRecipesFromFirestore() {
  const snapshot = await getDocs(collection(db, "recipes"));
  const list: Recipe[] = [];

  snapshot.forEach((document) => {
    const data = document.data() as Omit<Recipe, "id">;
    list.push({ id: document.id, ...data });
  });

  return list;
}

async function syncRecipeIngredientIds() {
  const productLookup = buildProductLookup();
  const canonicalLookup = buildCanonicalLookup();
  const list = await loadRecipesFromFirestore();

  let changedRecipes = 0;
  let unchangedRecipes = 0;
  let totalOldIds = 0;
  let totalChangedIds = 0;
  let writtenRecipes = 0;

  const reasons = new Map<string, number>();
  const notFound = new Map<string, number>();
  const samples: string[] = [];

  console.log("====================================");
  console.log("FamilyShop recipe ingredient sync V8");
  console.log("====================================");
  console.log(`Рецептов из Firestore: ${list.length}`);
  console.log(`Products lookup keys: ${productLookup.size}`);
  console.log(`Canonical lookup keys: ${canonicalLookup.size}`);
  console.log(`DRY_RUN: ${DRY_RUN ? "да, только проверка" : "нет, будет запись в Firestore"}`);
  console.log("");

  for (const recipe of list) {
    const oldRequired = recipe.ingredientIds || [];
    const oldOptional = recipe.optionalIngredientIds || [];

    totalOldIds += oldRequired.length + oldOptional.length;

    const remapList = (ids: string[]) =>
      ids.map((id) => {
        const result = remapId(id, productLookup, canonicalLookup);
        reasons.set(result.reason, (reasons.get(result.reason) || 0) + 1);

        if (result.newId !== id) totalChangedIds++;

        if (result.reason === "not_found") {
          notFound.set(id, (notFound.get(id) || 0) + 1);
        }

        if (result.newId !== id && samples.length < 80) {
          samples.push(`${id} -> ${result.newId}${result.productName ? ` (${result.productName})` : ""}`);
        }

        return result.newId;
      });

    const newRequired = unique(remapList(oldRequired));
    const requiredSet = new Set(newRequired);
    const newOptional = unique(remapList(oldOptional)).filter((id) => !requiredSet.has(id));

    const changed =
      JSON.stringify(oldRequired) !== JSON.stringify(newRequired) ||
      JSON.stringify(oldOptional) !== JSON.stringify(newOptional);

    if (!changed) {
      unchangedRecipes++;
      continue;
    }

    changedRecipes++;

    if (!DRY_RUN) {
      await setDoc(
        doc(db, "recipes", recipe.id),
        {
          ingredientIds: newRequired,
          optionalIngredientIds: newOptional,
          searchTitle: normalizeText(recipe.title || ""),
          searchText: buildSearchText(recipe, newRequired, newOptional),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      writtenRecipes++;

      if (writtenRecipes % WRITE_LOG_EVERY === 0) {
        console.log(`Записано рецептов: ${writtenRecipes}`);
        await sleep(WRITE_PAUSE_MS);
      }
    }
  }

  console.log("Готово.");
  console.log(`Всего рецептов: ${list.length}`);
  console.log(`Изменятся рецепты: ${changedRecipes}`);
  console.log(`Без изменений: ${unchangedRecipes}`);
  console.log(`Всего ingredientIds: ${totalOldIds}`);
  console.log(`Замен ingredientIds: ${totalChangedIds}`);
  console.log(`Записано в Firebase: ${DRY_RUN ? 0 : writtenRecipes}`);
  console.log("");

  console.log("Причины сопоставления:");
  Array.from(reasons.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => console.log(`${reason}: ${count}`));
  console.log("");

  console.log(`Не найдено уникальных старых id: ${notFound.size}`);
  Array.from(notFound.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 120)
    .forEach(([id, count]) => console.log(`${id}: ${count}`));
  console.log("");

  console.log("Примеры замен:");
  samples.forEach((item) => console.log(item));
  console.log("");

  if (DRY_RUN) {
    console.log("Это была проверка. Если цифры нормальные, поменяй в файле:");
    console.log("const DRY_RUN = true;");
    console.log("на:");
    console.log("const DRY_RUN = false;");
    console.log("и запусти ещё раз.");
  }
}

syncRecipeIngredientIds().catch((error) => {
  console.error("Ошибка:", error);
  process.exit(1);
});
