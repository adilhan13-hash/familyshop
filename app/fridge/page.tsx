"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type FridgeItem = {
  id: string;
  name: string;
  productId?: string;
};

type Product = {
  id: string;
  icon: string;
  name: string;
  category: string;
  popular: boolean;
};

export default function FridgePage() {
  const { familyId, appUser } = useFamilyAuth();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loadingFridge, setLoadingFridge] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
          });
        }
      });

      setFridgeItems(items);
      setLoadingFridge(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const items: Product[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        if (data.name && data.icon && data.category) {
          items.push({
            id: document.id,
            icon: data.icon,
            name: data.name,
            category: data.category,
            popular: Boolean(data.popular),
          });
        }
      });

      items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

      setProducts(items);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleProducts = useMemo(() => {
    if (!search.trim()) return [];

    const query = search.trim().toLowerCase();

    return products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, search]);

  async function addToFridge(product: Product) {
    if (!familyId) return;

    const fullName = `${product.icon} ${product.name}`;

    const alreadyExists = fridgeItems.some(
      (item) => item.productId === product.id
    );

    if (alreadyExists) return;

    await addDoc(collection(db, "families", familyId, "fridge"), {
      name: fullName,
      productId: product.id,
      category: product.category,
      createdAt: new Date(),
    });

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "fridge_add",
      title: "Добавил в холодильник",
      message: fullName,
      emoji: "🥛",
      itemName: fullName,
    });

    setSearch("");
  }

  async function markAsFinished(item: FridgeItem) {
    if (!familyId) return;

    const shoppingData: {
      name: string;
      createdAt: Date;
      productId?: string;
    } = {
      name: item.name,
      createdAt: new Date(),
    };

    if (item.productId) {
      shoppingData.productId = item.productId;
    }

    await addDoc(collection(db, "families", familyId, "shopping"), shoppingData);

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
        </motion.header>

        <section className="px-5 space-y-5">
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
                Пока холодильник пуст. Найди продукт ниже и добавь его.
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

          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            placeholder="🔍 Найти продукт и добавить"
          />

          <AnimatePresence mode="wait">
            {search.trim() && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.2 }}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Результаты поиска</h2>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                    {visibleProducts.length}
                  </span>
                </div>

                {loadingProducts ? (
                  <p className="text-sm text-slate-500">Загрузка товаров...</p>
                ) : visibleProducts.length === 0 ? (
                  <p className="text-sm text-slate-500">Ничего не найдено.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {visibleProducts.map((product) => {
                      const isAdded = fridgeItems.some(
                        (item) => item.productId === product.id
                      );

                      return (
                        <motion.button
                          key={product.id}
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.04 }}
                          onClick={() => addToFridge(product)}
                          className={`rounded-2xl p-3 text-center text-sm transition ${
                            isAdded
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="text-2xl">{product.icon}</div>
                          <div className="mt-1 line-clamp-2 text-xs">
                            {product.name}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <BottomNav current="fridge" />
      </div>
    </main>
  );
}