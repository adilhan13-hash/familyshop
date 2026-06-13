import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import recipes from "../data/recipes_all.json";

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
  steps?: string[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function importRecipesOnly() {
  const list = recipes as Recipe[];

  console.log(`Начинаю импорт recipes: ${list.length}`);

  let count = 0;

  for (const recipe of list) {
    const searchTitle = normalizeText(recipe.title || "");

    const searchText = normalizeText(
      [
        recipe.title,
        recipe.category,
        recipe.cuisine,
        recipe.description,
        ...(recipe.ingredientIds || []),
      ]
        .filter(Boolean)
        .join(" ")
    );

    await setDoc(
      doc(db, "recipes", recipe.id),
      {
        ...recipe,
        searchTitle,
        searchText,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    count++;

    if (count % 100 === 0) {
      console.log(`recipes: ${count}/${list.length}`);
    }
  }

  console.log(`Готово. Загружено recipes: ${count}`);
}

importRecipesOnly().catch((error) => {
  console.error("Ошибка импорта recipes:", error);
  process.exit(1);
});