"use client";

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

type Ingredient = {
  id?: string;
  name: string;
  aliases?: string[];
  category: string;
  icon?: string;
  popular?: boolean;
  recipeIngredient?: boolean;
  fridgeAllowed?: boolean;
  shoppingAllowed?: boolean;
  search?: string[];
};

function normalizeSearch(values: string[]) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => value.toLowerCase().trim())
        .filter(Boolean)
    )
  );
}

async function syncIngredientsToProducts() {
  console.log("Читаю ingredients...");

  const ingredientsSnap = await getDocs(collection(db, "ingredients"));

  let createdOrUpdated = 0;
  let skipped = 0;

  for (const ingredientDoc of ingredientsSnap.docs) {
    const ingredient = ingredientDoc.data() as Ingredient;
    const ingredientId = ingredientDoc.id;

    if (!ingredient.name || !ingredient.category) {
      skipped++;
      console.log(`⚠️ Пропущено: ${ingredientId}`);
      continue;
    }

    const productData = {
      name: ingredient.name,
      icon: ingredient.icon || "🛒",
      category: ingredient.category,
      popular: Boolean(ingredient.popular),
      type: ingredient.recipeIngredient === false ? "other" : "food",

      ingredientId,
      aliases: ingredient.aliases || [],
      search: normalizeSearch([
        ingredient.name,
        ingredientId,
        ...(ingredient.aliases || []),
        ...(ingredient.search || []),
      ]),

      recipeIngredient: ingredient.recipeIngredient !== false,
      fridgeAllowed: ingredient.fridgeAllowed !== false,
      shoppingAllowed: ingredient.shoppingAllowed !== false,

      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "products", ingredientId), productData, {
      merge: true,
    });

    createdOrUpdated++;
    console.log(`✅ ${ingredient.name} → products/${ingredientId}`);
  }

  console.log("Готово.");
  console.log(`Создано/обновлено products: ${createdOrUpdated}`);
  console.log(`Пропущено: ${skipped}`);
}

syncIngredientsToProducts().catch((error) => {
  console.error("Ошибка синхронизации ingredients → products:", error);
  process.exit(1);
});
