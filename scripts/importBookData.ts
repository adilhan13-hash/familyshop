import fs from "fs";
import path from "path";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";

type Ingredient = {
  id: string;
  name: string;
  slug?: string;
  aliases?: string[];
  category?: string;
  icon?: string;
  popular?: boolean;
  rating?: number;
  recipeIngredient?: boolean;
  fridgeAllowed?: boolean;
  shoppingAllowed?: boolean;
  search?: string[];
};

type Recipe = {
  id: string;
  title: string;
  category?: string;
  categorySlug?: string;
  cuisine?: string;
  cuisineSlug?: string;
  difficulty?: string;
  cookingTimeText?: string | null;
  cookingTime?: number | null;
  prepareTimeText?: string | null;
  description?: string;
  note?: string;
  poster?: string | null;
  video?: string | null;
  vegan?: boolean;
  ingredientIds: string[];
  rawIngredients: unknown[];
  steps: string[];
  stepImages?: string[];
  tags?: string[];
  source?: string;
  popular?: boolean;
  familyFriendly?: boolean;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

async function writeInBatches<T extends { id: string }>(
  collectionName: string,
  items: T[],
  chunkSize = 450
) {
  const ref = collection(db, collectionName);
  let batch = writeBatch(db);
  let count = 0;
  let chunk = 1;

  for (const item of items) {
    batch.set(
      doc(ref, item.id),
      {
        ...item,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    count++;

    if (count % chunkSize === 0) {
      await batch.commit();
      console.log(`✅ ${collectionName}: пачка ${chunk}, всего ${count}`);
      batch = writeBatch(db);
      chunk++;
    }
  }

  await batch.commit();
  console.log(`Готово ${collectionName}: ${count}`);
}

async function main() {
  const ingredientsPath = path.join(process.cwd(), "data", "ingredients_book_all.json");
  const recipesPath = path.join(process.cwd(), "data", "recipes_all.json");

  const ingredients = readJson<Ingredient[]>(ingredientsPath);
  const recipes = readJson<Recipe[]>(recipesPath);

  console.log(`Ингредиентов из книги: ${ingredients.length}`);
  console.log(`Рецептов из книги: ${recipes.length}`);

  await writeInBatches("ingredients", ingredients);
  await writeInBatches("recipes", recipes);

  console.log("🔥 Импорт кулинарной книги завершён");
}

main().catch((error) => {
  console.error("Ошибка импорта:", error);
  process.exit(1);
});
