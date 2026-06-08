"use client";

import { useEffect, useState } from "react";
import BottomNav from "../../components/BottomNav";
import { db } from "../../lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

type ShoppingItem = {
  id: string;
  name: string;
};

const quickProducts = [
  "🥛 Молоко",
  "🥚 Яйца",
  "🍞 Хлеб",
  "🧈 Масло",
  "🧀 Сыр",
  "🍗 Курица",
  "🥔 Картофель",
  "🍅 Помидоры",
];

const categories = [
  "🥛 Молочка",
  "🥩 Мясо",
  "🥦 Овощи",
  "🍎 Фрукты",
  "🍚 Бакалея",
  "🧴 Бытовое",
];

export default function ShoppingPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "shopping"), (snapshot) => {
      const items: ShoppingItem[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        if (data.name) {
          items.push({
            id: document.id,
            name: data.name,
          });
        }
      });

      setShoppingList(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function addProduct(product: string) {
    const alreadyExists = shoppingList.some((item) => item.name === product);

    if (alreadyExists) return;

    await addDoc(collection(db, "shopping"), {
      name: product,
      createdAt: new Date(),
    });
  }

  async function removeProduct(id: string) {
    await deleteDoc(doc(db, "shopping", id));
  }

  async function markAsBought(item: ShoppingItem) {
    await addDoc(collection(db, "fridge"), {
      name: item.name,
      createdAt: new Date(),
    });

    await deleteDoc(doc(db, "shopping", item.id));
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Покупки 🛒</h1>
        </header>

        <section className="px-5 space-y-5">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            placeholder="🔍 Поиск товара"
          />

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Часто покупаем</h2>

            <div className="grid grid-cols-4 gap-3">
              {quickProducts.map((product) => {
                const isAdded = shoppingList.some(
                  (item) => item.name === product
                );

                return (
                  <button
                    key={product}
                    onClick={() => addProduct(product)}
                    className={`rounded-2xl p-3 text-center text-sm transition ${
                      isAdded
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <div className="text-2xl">{product.split(" ")[0]}</div>
                    <div className="mt-1">{product.split(" ")[1]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Категории</h2>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  className="rounded-2xl bg-slate-100 px-4 py-4 text-left"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Список покупок</h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {shoppingList.length}
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : shoppingList.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока товары не добавлены. Нажми на иконку товара выше.
              </p>
            ) : (
              <div className="space-y-3">
                {shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="h-5 w-5 rounded-full border border-slate-300" />
                      <span>{item.name}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => markAsBought(item)}
                        className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                      >
                        Куплено
                      </button>

                      <button
                        onClick={() => removeProduct(item.id)}
                        className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        Убрать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <BottomNav current="shopping" />
      </div>
    </main>
  );
}