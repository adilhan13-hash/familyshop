import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

type Ingredient = {
  id: string;
  name: string;
  aliases?: string[];
  search?: string[];
};

type Product = {
  id: string;
  name?: string;
  ingredientId?: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function syncProductIngredientIds() {
  console.log("Читаю ingredients...");
  const ingredientsSnap = await getDocs(collection(db, "ingredients"));

  const ingredientByText = new Map<string, string>();

  ingredientsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() as Ingredient;
    const ingredientId = docSnap.id;

    const texts = [
      data.name,
      ...(data.aliases || []),
      ...(data.search || []),
      ingredientId,
    ].filter(Boolean) as string[];

    texts.forEach((text) => {
      ingredientByText.set(normalizeText(text), ingredientId);
    });
  });

  console.log(`Ингредиентов в справочнике: ${ingredientsSnap.size}`);

  console.log("Читаю products...");
  const productsSnap = await getDocs(collection(db, "products"));

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const productDoc of productsSnap.docs) {
    const product = {
      id: productDoc.id,
      ...(productDoc.data() as Omit<Product, "id">),
    };

    if (product.ingredientId) {
      skipped++;
      continue;
    }

    const cleanName = normalizeText(product.name || "");
    const ingredientId = ingredientByText.get(cleanName);

    if (!ingredientId) {
      notFound++;
      console.log(`❌ Не найдено совпадение: ${product.name}`);
      continue;
    }

    await updateDoc(doc(db, "products", product.id), {
      ingredientId,
    });

    updated++;
    console.log(`✅ ${product.name} → ${ingredientId}`);
  }

  console.log("Готово.");
  console.log(`Обновлено: ${updated}`);
  console.log(`Уже было ingredientId: ${skipped}`);
  console.log(`Не найдено: ${notFound}`);
}

syncProductIngredientIds().catch((error) => {
  console.error("Ошибка синхронизации:", error);
  process.exit(1);
});