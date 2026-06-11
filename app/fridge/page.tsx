"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type FridgeItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
  category?: string;
};

export default function FridgePage() {
  const { familyId, appUser } = useFamilyAuth();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [loadingFridge, setLoadingFridge] = useState(true);

  useEffect(() => {
    if (!familyId) return;

    const fridgeCollection = collection(db, "families", familyId, "fridge");

    const unsubscribe = onSnapshot(fridgeCollection, (snapshot) => {
      const items: FridgeItem[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        if (data.name) {
          items.push({
            id: document.id,
            name: data.name,
            productId: data.productId,
            ingredientId: data.ingredientId,
            category: data.category,
          });
        }
      });

      items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

      setFridgeItems(items);
      setLoadingFridge(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  async function markAsFinished(item: FridgeItem) {
    if (!familyId) return;

    await addDoc(collection(db, "families", familyId, "shopping"), {
      name: item.name,
      productId: item.productId || null,
      ingredientId: item.ingredientId || null,
      category: item.category || null,
      createdAt: serverTimestamp(),
    });

    await deleteDoc(doc(db, "families", familyId, "fridge", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "fridge_finished",
      title: "Закончилось",
      message: item.name,
      emoji: "⚠️",
      itemName: item.name,
    });
  }

  async function removeFromFridge(item: FridgeItem) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "fridge", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "fridge_remove",
      title: "Убрал из холодильника",
      message: item.name,
      emoji: "🗑️",
      itemName: item.name,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-5 pt-8 pb-4"
        >
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Холодильник 🥛</h1>
          <p className="mt-1 text-sm text-slate-500">
            Здесь только продукты, которые реально есть дома.
          </p>
        </motion.header>

        <section className="px-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Есть дома</h2>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                {fridgeItems.length}
              </span>
            </div>

            {loadingFridge ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : fridgeItems.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока холодильник пуст. Купленные товары будут появляться здесь.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {fridgeItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="mb-3 font-medium">{item.name}</div>

                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => markAsFinished(item)}
                          className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                        >
                          Закончилось
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => removeFromFridge(item)}
                          className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          Убрать
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </motion.div>
        </section>

        <BottomNav current="fridge" />
      </div>
    </main>
  );
}