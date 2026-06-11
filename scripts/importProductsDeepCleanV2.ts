import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import products from "../data/products_deep_clean_v2.json";

type Product = { id: string; name: string; icon: string; category: string; aliases?: string[]; search?: string[]; popular?: boolean; recipeIngredient?: boolean; fridgeAllowed?: boolean; shoppingAllowed?: boolean; };

async function importProductsDeepCleanV2() {
  const list = products as Product[];
  console.log(`Начинаю импорт products: ${list.length}`);
  let count = 0;
  for (const product of list) {
    await setDoc(doc(db, "products", product.id), { ...product, updatedAt: serverTimestamp() }, { merge: true });
    count++;
    if (count % 100 === 0) console.log(`products: ${count}/${list.length}`);
  }
  console.log(`Готово. Загружено products: ${count}`);
}
importProductsDeepCleanV2().catch((error) => { console.error("Ошибка импорта products:", error); process.exit(1); });
