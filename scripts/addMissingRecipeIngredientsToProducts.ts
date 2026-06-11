import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const missingItems: Record<string, { name: string; icon: string; category: string }> = {
  mayoran_susheniy: {
    name: "Майоран сушеный",
    icon: "🌿",
    category: "Специи",
  },
  testo_drojjevoe: {
    name: "Тесто дрожжевое",
    icon: "🥐",
    category: "Тесто и выпечка",
  },
  uksusnaya_essenciya_70: {
    name: "Уксусная эссенция 70%",
    icon: "🍶",
    category: "Соусы и добавки",
  },
  jir_kurdyuchniy: {
    name: "Курдючный жир",
    icon: "🥩",
    category: "Мясо",
  },
  slivki_dlya_vzbivaniya: {
    name: "Сливки для взбивания",
    icon: "🥛",
    category: "Молочные продукты",
  },
  protein_shokoladniy: {
    name: "Шоколадный протеин",
    icon: "🥤",
    category: "Спортпит",
  },
  suhin_drojjei: {
    name: "Сухие дрожжи",
    icon: "🧫",
    category: "Тесто и выпечка",
  },
  ogurcov: {
    name: "Огурцы",
    icon: "🥒",
    category: "Овощи",
  },
  izyum_beliy: {
    name: "Белый изюм",
    icon: "🍇",
    category: "Сухофрукты",
  },
  rozmarin_susheniy: {
    name: "Розмарин сушеный",
    icon: "🌿",
    category: "Специи",
  },
  krasitel_pishevoy: {
    name: "Пищевой краситель",
    icon: "🎨",
    category: "Кондитерские добавки",
  },
  ris_dlya_sushi: {
    name: "Рис для суши",
    icon: "🍚",
    category: "Крупы и макароны",
  },
  margarin_maslo_slivochnoe: {
    name: "Маргарин или сливочное масло",
    icon: "🧈",
    category: "Молочные продукты",
  },
  govyajya_myakot: {
    name: "Говяжья мякоть",
    icon: "🥩",
    category: "Мясо",
  },
  tvorojnaya_massa: {
    name: "Творожная масса",
    icon: "🥛",
    category: "Молочные продукты",
  },
  tvorog_2: {
    name: "Творог 2%",
    icon: "🥛",
    category: "Молочные продукты",
  },
  kardamon_molotiy: {
    name: "Кардамон молотый",
    icon: "🧂",
    category: "Специи",
  },
  griby_svejie: {
    name: "Грибы свежие",
    icon: "🍄",
    category: "Овощи",
  },
  voda_mineralnaya_s_gazom: {
    name: "Минеральная вода с газом",
    icon: "💧",
    category: "Напитки",
  },
  bulocki_dlya_gamburgerov: {
    name: "Булочки для гамбургеров",
    icon: "🍔",
    category: "Хлеб и выпечка",
  },
  govyajiy_yazyk: {
    name: "Говяжий язык",
    icon: "🥩",
    category: "Мясо",
  },
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function addMissingRecipeIngredientsToProducts() {
  const entries = Object.entries(missingItems);

  console.log(`Добавляю недостающие products: ${entries.length}`);

  let count = 0;

  for (const [id, item] of entries) {
    const search = Array.from(
      new Set([
        normalizeText(item.name),
        id,
        id.replace(/_/g, " "),
        item.category.toLowerCase(),
      ])
    );

    await setDoc(
      doc(db, "products", id),
      {
        id,
        name: item.name,
        icon: item.icon,
        category: item.category,
        ingredientId: id,
        aliases: [id.replace(/_/g, " ")],
        search,
        recipeIngredient: true,
        fridgeAllowed: true,
        shoppingAllowed: true,
        popular: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    count++;
    console.log(`✅ ${id} → ${item.icon} ${item.name}`);
  }

  console.log(`Готово. Добавлено/обновлено: ${count}`);
}

addMissingRecipeIngredientsToProducts().catch((error) => {
  console.error("Ошибка:", error);
  process.exit(1);
});