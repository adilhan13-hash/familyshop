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

type FridgeItem = {
  id: string;
  name: string;
};

export default function FridgePage() {
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "fridge"), (snapshot) => {
      const items: FridgeItem[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        if (data.name) {
          items.push({
            id: document.id,
            name: data.name,
          });
        }
      });

      setFridgeItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function addToFridge() {
    const product = newItem.trim();

    if (!product) return;

    const alreadyExists = fridgeItems.some((item) => item.name === product);

    if (alreadyExists) return;

    await addDoc(collection(db, "fridge"), {
      name: product,
      createdAt: new Date(),
    });

    setNewItem("");
  }

  async function markAsFinished(item: FridgeItem) {
    await addDoc(collection(db, "shopping"), {
      name: item.name,
      createdAt: new Date(),
    });

    await deleteDoc(doc(db, "fridge", item.id));
  }

  async function removeFromFridge(id: string) {
    await deleteDoc(doc(db, "fridge", id));
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Холодильник 🥛</h1>
        </header>

        <section className="px-5 space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Добавить вручную</h2>

            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Например: 🍚 Рис"
              />

              <button
                onClick={addToFridge}
                className="rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Есть дома</h2>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                {fridgeItems.length}
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : fridgeItems.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока холодильник пуст. Купленные товары появятся здесь.
              </p>
            ) : (
              <div className="space-y-3">
                {fridgeItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div className="mb-3 font-medium">{item.name}</div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => markAsFinished(item)}
                        className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                      >
                        Закончилось
                      </button>

                      <button
                        onClick={() => removeFromFridge(item.id)}
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

        <BottomNav current="fridge" />
      </div>
    </main>
  );
}