import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import products from "./data/products_v6_ready_for_firebase_icons_clean.json";

type Product = {
  id: string;
  name: string;
  icon: string;
  category: string;
  aliases?: string[];
  search?: string[];
  popular?: boolean;
  recipeIngredient?: boolean;
  fridgeAllowed?: boolean;
  shoppingAllowed?: boolean;
  mergedIds?: string[];
};

async function importProductsV6() {
  const list = products as Product[];

  console.log(`Начинаю импорт products V6: ${list.length}`);

  let count = 0;

  for (const product of list) {
    if (!product.id || !product.name || !product.icon || !product.category) {
      console.warn("Пропущен товар с ошибкой:", product);
      continue;
    }

    await setDoc(
      doc(db, "products", product.id),
      {
        ...product,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    count++;

    if (count % 100 === 0) {
      console.log(`products V6: ${count}/${list.length}`);
    }
  }

  console.log(`Готово. Загружено products V6: ${count}`);
}

importProductsV6().catch((error) => {
  console.error("Ошибка импорта products V6:", error);
  process.exit(1);
});