import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import products from "../data/products_v8_ready_for_firebase.json";

type Product = {
  id: string;
  name: string;
  icon: string;
  category: string;
  aliases?: string[];
  search?: string[];
  mergedIds?: string[];
  popular?: boolean;
  recipeIngredient?: boolean;
  fridgeAllowed?: boolean;
  shoppingAllowed?: boolean;
};

async function deleteOldProducts() {
  console.log("🗑 Удаляем старую коллекцию products...");

  const snapshot = await getDocs(collection(db, "products"));

  let deleted = 0;

  for (const documentItem of snapshot.docs) {
    await deleteDoc(doc(db, "products", documentItem.id));
    deleted++;

    if (deleted % 100 === 0) {
      console.log(`Удалено: ${deleted}`);
    }
  }

  console.log(`✅ Удалено товаров: ${deleted}`);
}

async function uploadProducts() {
  console.log("🚀 Начинаем загрузку новой базы...");

  let uploaded = 0;

  for (const product of products as Product[]) {
    await setDoc(doc(db, "products", product.id), {
      ...product,
      updatedAt: serverTimestamp(),
    });

    uploaded++;

    if (uploaded % 100 === 0) {
      console.log(`Загружено: ${uploaded}/${products.length}`);
    }
  }

  console.log(`✅ Загружено товаров: ${uploaded}`);
}

async function main() {
  try {
    console.log("=================================");
    console.log("FamilyShop Products V8 Upload");
    console.log("=================================");

    await deleteOldProducts();

    console.log("⏳ Пауза 3 секунды...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await uploadProducts();

    console.log("🎉 ГОТОВО");
  } catch (error) {
    console.error("❌ Ошибка:", error);
  }
}

main();