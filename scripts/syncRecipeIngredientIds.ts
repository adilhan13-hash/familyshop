import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import recipes from "../data/recipes_all.json";
import products from "../data/products_deep_clean_v2.json";

const DRY_RUN = false; // сначала проверка. Для записи поменять на false

type Product = {
  id: string;
  name: string;
  icon?: string;
  category?: string;
  aliases?: string[];
  search?: string[];
};

type Recipe = {
  id: string;
  title: string;
  category?: string;
  cuisine?: string;
  description?: string;
  ingredientIds?: string[];
  optionalIngredientIds?: string[];
  steps?: string[];
  [key: string]: any;
};

const manualMap: Record<string, string> = {
  // базовые
  sol: "sol",
  soli: "sol",
  sahar: "sahar",
  sahara: "sahar",
  voda: "voda",
  vody: "voda",
  teplaya_voda: "voda",
  goryachaya_voda: "voda",
  kipyachenaya_voda: "voda",

  // молочка / яйца
  moloko: "moloko",
  moloka: "moloko",
  yayco: "yayca",
  yayca: "yayca",
  yayco_kurinoe: "yayca",
  smetana: "smetana",
  smetany: "smetana",
  smetana_20: "smetana",
  slivki: "slivki",
  slivok: "slivki",
  slivki_jirnye: "slivki",
  tvorog: "tvorog",
  tvoroga: "tvorog",
  tvorog_obezirenniy: "tvorog",
  syr: "syr",
  syra: "syr",
  syr_tverdyy: "syr",
  maslo_slivochnoe: "maslo-slivochnoe",
  slivochnoe_maslo: "maslo-slivochnoe",

  // масла
  maslo_rastitelnoe: "maslo-rastitelnoe",
  rastitelnoe_maslo: "maslo-rastitelnoe",
  rastitelnogo_masla: "maslo-rastitelnoe",
  maslo_podsolnechnoe: "maslo-rastitelnoe",
  podsolnechnoe_maslo: "maslo-rastitelnoe",
  olivkovoe_maslo: "olivkovoe-maslo",

  // овощи / зелень
  luk: "luk-repchatyy",
  luka: "luk-repchatyy",
  luk_repchatiy: "luk-repchatyy",
  luk_repchatyy: "luk-repchatyy",
  chesnok: "chesnok",
  chesnoka: "chesnok",
  morkov: "morkov",
  morkovi: "morkov",
  kartofel: "kartofel",
  kartofelya: "kartofel",
  pomidor: "pomidor",
  pomidory: "pomidor",
  tomat: "pomidor",
  tomaty: "pomidor",
  ogurec: "ogurec",
  ogurcy: "ogurec",
  kapusta: "kapusta",
  kapusty: "kapusta",
  kapusta_belokochannaya: "kapusta",
  zelen: "zelen",
  zeleni: "zelen",
  ukrop: "ukrop",
  ukropa: "ukrop",
  petrushka: "petrushka",
  petrushki: "petrushka",
  kinza: "kinza",
  bazilik: "bazilik",
  shpinat: "shpinat",
  griby: "griby",
  gribov: "griby",
  shampinony: "shampinony",
  shampinonov: "shampinony",
  kukuruza: "kukuruza",
  kukuruznyy_krahmal: "krahmal",
  kukuruzniy_krahmal: "krahmal",

  // мясо / птица / фарш
  govyadina: "govyadina",
  govyadiny: "govyadina",
  govyajiy_farsh: "farsh-govyazhiy",
  govyazhiy_farsh: "farsh-govyazhiy",
  farsh_govyazhiy: "farsh-govyazhiy",
  kurica: "kurica",
  kuricy: "kurica",
  kurinoe_file: "kurinoe-file",
  kurinaya_grudka: "kurinaya-grudka",
  kuriniy_farsh: "farsh-kurinyy",
  kurinyy_farsh: "farsh-kurinyy",
  farsh_kurinyy: "farsh-kurinyy",
  svinina: "svinina",
  svininy: "svinina",
  baranina: "baranina",
  myaso: "myaso",
  myasa: "myaso",
  kolbasa: "kolbasa",
  sosisku: "sosiski",
  sosiski: "sosiski",
  vetcina: "vetchina",
  bekon: "bekon",

  // рыба
  ryba: "ryba",
  ryby: "ryba",
  file_ryby: "ryba",
  semga: "semga",
  losos: "losos",
  forel: "forel",
  mintay: "mintay",
  treska: "treska",
  tuna: "tunec",
  tunec: "tunec",
  krevetki: "krevetki",
  kalmary: "kalmary",

  // крупы / мука / хлеб
  ris: "ris",
  risa: "ris",
  grechka: "grechka",
  grechnevaya_krupa: "grechka",
  grechnevoy_krupy: "grechka",
  perlovaya_krupa: "perlovka",
  perlovoy_krupy: "perlovka",
  manka: "manka",
  mannaya_krupa: "manka",
  mannoy_krupy: "manka",
  psheno: "psheno",
  ovsyanka: "ovsyanka",
  muka: "muka",
  muki: "muka",
  muka_pshenichnaya: "muka",
  hleb: "hleb",
  hleba: "hleb",
  hleb_beliy: "hleb",
  hleb_belyy: "hleb",
  baton: "baton",
  lavash: "lavash",
  makarony: "makarony",
  spagetti: "spagetti",
  lapsha: "lapsha",

  // специи
  zira: "zira",
  koriandr: "koriandr",
  kurkuma: "kurkuma",
  paprika: "paprika",
  perec: "perec",
  perec_chernyy: "perec-chernyy",
  perec_chili: "perec-chili",
  perec_chili_susheniy: "perec-chili",
  lavrovyy_list: "lavrovyy-list",
  muskatniy_oreh: "muskatnyy-oreh",
  muskatnyy_oreh: "muskatnyy-oreh",
  muskatniy_oreh_molotiy: "muskatnyy-oreh",
  oregano: "oregano",
  timyan: "timyan",
  rozmarin: "rozmarin",
  hmelisuneli: "hmeli-suneli",
  hmeli_suneli: "hmeli-suneli",

  // соусы / пасты
  tomatnaya_pasta: "tomatnaya-pasta",
  mayonez: "mayonez",
  ketchup: "ketchup",
  soevyy_sous: "soevyy-sous",
  gorcica: "gorchica",
  uksus: "uksus",

  // сладкое / добавки
  med: "med",
  meda: "med",
  shokolad: "shokolad",
  kakao: "kakao",
  izyum: "izyum",
  orehi: "orehi",
  kokosovaya_struzhka: "kokosovaya-struzhka",
  drojji: "drozhzhi",
  drozzi: "drozhzhi",
  razryhlitel: "razryhlitel",
  vanilin: "vanilin",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeId(value: string) {
  return normalize(value).replace(/\s+/g, "-");
}

function buildProductMap() {
  const map = new Map<string, string>();

  for (const product of products as Product[]) {
    const values = [
      product.id,
      product.name,
      ...(product.aliases || []),
      ...(product.search || []),
    ].filter(Boolean);

    for (const value of values) {
      map.set(normalize(String(value)), product.id);
      map.set(normalizeId(String(value)), product.id);
    }
  }

  for (const [oldId, newId] of Object.entries(manualMap)) {
    map.set(normalize(oldId), newId);
    map.set(normalizeId(oldId), newId);
  }

  return map;
}

function remapId(id: string, productMap: Map<string, string>) {
  return (
    productMap.get(normalize(id)) ||
    productMap.get(normalizeId(id)) ||
    id
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function syncRecipeIngredientIds() {
  const productMap = buildProductMap();
  const list = recipes as Recipe[];

  let changedRecipes = 0;
  let unchangedRecipes = 0;
  let totalOldIds = 0;
  let totalChangedIds = 0;

  const notFound = new Map<string, number>();

  console.log(`Рецептов в файле: ${list.length}`);
  console.log(`Products mapping keys: ${productMap.size}`);
  console.log(
    `DRY_RUN: ${DRY_RUN ? "да, только проверка" : "нет, будет запись в Firestore"}`
  );

  for (const recipe of list) {
    const oldRequired = recipe.ingredientIds || [];
    const oldOptional = recipe.optionalIngredientIds || [];

    const newRequired = unique(oldRequired.map((id) => remapId(id, productMap)));
    const newOptional = unique(oldOptional.map((id) => remapId(id, productMap)));

    totalOldIds += oldRequired.length + oldOptional.length;

    oldRequired.forEach((oldId, index) => {
      if (oldId !== newRequired[index]) totalChangedIds++;

      const mapped = remapId(oldId, productMap);
      if (mapped === oldId && !productMap.has(normalize(oldId))) {
        notFound.set(oldId, (notFound.get(oldId) || 0) + 1);
      }
    });

    oldOptional.forEach((oldId, index) => {
      if (oldId !== newOptional[index]) totalChangedIds++;

      const mapped = remapId(oldId, productMap);
      if (mapped === oldId && !productMap.has(normalize(oldId))) {
        notFound.set(oldId, (notFound.get(oldId) || 0) + 1);
      }
    });

    const changed =
      JSON.stringify(oldRequired) !== JSON.stringify(newRequired) ||
      JSON.stringify(oldOptional) !== JSON.stringify(newOptional);

    if (!changed) {
      unchangedRecipes++;
      continue;
    }

    changedRecipes++;

    const searchTitle = normalizeText(recipe.title || "");

    const searchText = normalizeText(
      [
        recipe.title,
        recipe.category,
        recipe.cuisine,
        recipe.description,
        ...newRequired,
        ...newOptional,
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (!DRY_RUN) {
      await setDoc(
        doc(db, "recipes", recipe.id),
        {
          ...recipe,
          ingredientIds: newRequired,
          optionalIngredientIds: newOptional,
          searchTitle,
          searchText,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (changedRecipes % 100 === 0) {
      console.log(
        `Обработано изменений: ${changedRecipes}, режим: ${
          DRY_RUN ? "проверка" : "запись"
        }`
      );
    }
  }

  console.log("Готово.");
  console.log(`Всего рецептов: ${list.length}`);
  console.log(`Изменятся рецепты: ${changedRecipes}`);
  console.log(`Без изменений: ${unchangedRecipes}`);
  console.log(`Всего ingredientIds: ${totalOldIds}`);
  console.log(`Замен ingredientIds: ${totalChangedIds}`);
  console.log(`Не найдено уникальных старых id: ${notFound.size}`);

  console.log("Топ не найденных:");
  Array.from(notFound.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .forEach(([id, count]) => {
      console.log(`${id}: ${count}`);
    });

  if (DRY_RUN) {
    console.log("");
    console.log("Это была проверка.");
    console.log("Если результат лучше, поменяй:");
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