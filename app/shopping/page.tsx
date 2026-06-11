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
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type ShoppingItem = {
  id: string;
  name: string;
  productId?: string;
};

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

export default function ShoppingPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [fridgeList, setFridgeList] = useState<FridgeItem[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  const [loadingShopping, setLoadingShopping] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);

  function normalizeName(name: string) {
    return name.trim().toLowerCase();
  }

  function productFromDoc(document: any): Product | null {
    const data = document.data();

    if (!data.name) return null;

    return {
      id: document.id,
      icon: data.icon || "🛒",
      name: data.name,
      category: data.category || "Другое",
      popular: Boolean(data.popular),
    };
  }

  useEffect(() => {
    if (!familyId) return;

    const shoppingCollection = collection(db, "families", familyId, "shopping");

    const unsubscribe = onSnapshot(shoppingCollection, (snapshot) => {
      const items: ShoppingItem[] = [];

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

      setShoppingList(items);
      setLoadingShopping(false);
    });

    return () => unsubscribe();
  }, [familyId]);

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

      setFridgeList(items);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    async function loadPopularProducts() {
      try {
        setLoadingProducts(true);

        const productsQuery = query(
          collection(db, "products"),
          where("popular", "==", true),
          limit(24)
        );

        const snapshot = await getDocs(productsQuery);

        const items: Product[] = [];

        snapshot.forEach((document) => {
          const product = productFromDoc(document);
          if (product) items.push(product);
        });

        items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setPopularProducts(items);
      } catch (error) {
        console.error("POPULAR PRODUCTS LOAD ERROR", error);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadPopularProducts();
  }, []);

  useEffect(() => {
    const searchText = normalizeName(search);

    if (searchText.length < 2) {
      setSearchProducts([]);
      setLoadingSearch(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoadingSearch(true);

        const productsQuery = query(
          collection(db, "products"),
          where("search", "array-contains", searchText),
          limit(24)
        );

        const snapshot = await getDocs(productsQuery);

        const items: Product[] = [];

        snapshot.forEach((document) => {
          const product = productFromDoc(document);
          if (product) items.push(product);
        });

        items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setSearchProducts(items);
      } catch (error) {
        console.error("PRODUCT SEARCH ERROR", error);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  function isProductInFridge(productId?: string, name?: string) {
    return fridgeList.some((fridgeItem) => {
      if (productId && fridgeItem.productId) {
        return fridgeItem.productId === productId;
      }

      if (name) {
        return normalizeName(fridgeItem.name) === normalizeName(name);
      }

      return false;
    });
  }

  async function addProduct(product: Product) {
    if (!familyId) return;

    const fullName = `${product.icon} ${product.name}`;

    const alreadyExists = shoppingList.some((item) => {
      if (item.productId) {
        return item.productId === product.id;
      }

      return normalizeName(item.name) === normalizeName(fullName);
    });

    if (alreadyExists) return;

    const existsInFridge = isProductInFridge(product.id, fullName);

    if (existsInFridge) {
      const confirmed = window.confirm(
        `⚠️ ${fullName} уже есть в холодильнике.\n\nДобавить в список покупок всё равно?`
      );

      if (!confirmed) return;
    }

    await addDoc(collection(db, "families", familyId, "shopping"), {
      name: fullName,
      productId: product.id,
      category: product.category,
      createdAt: serverTimestamp(),
    });

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_add",
      title: "Добавил в покупки",
      message: fullName,
      emoji: "🛒",
      itemName: fullName,
    });

    setSearch("");
  }

  async function removeProduct(item: ShoppingItem) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "shopping", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_remove",
      title: "Убрал из покупок",
      message: item.name,
      emoji: "🗑️",
      itemName: item.name,
    });
  }

  async function markAsBought(item: ShoppingItem) {
    if (!familyId) return;

    const alreadyInFridge = isProductInFridge(item.productId, item.name);

    if (!alreadyInFridge) {
      const fridgeData: {
        name: string;
        createdAt: any;
        productId?: string;
      } = {
        name: item.name,
        createdAt: serverTimestamp(),
      };

      if (item.productId) {
        fridgeData.productId = item.productId;
      }

      await addDoc(collection(db, "families", familyId, "fridge"), fridgeData);
    }

    await deleteDoc(doc(db, "families", familyId, "shopping", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_buy",
      title: "Купил товар",
      message: item.name,
      emoji: "✅",
      itemName: item.name,
    });
  }

  function ProductGrid({
    items,
    loading,
  }: {
    items: Product[];
    loading: boolean;
  }) {
    if (loading) {
      return <p className="text-sm text-slate-500">Загрузка товаров...</p>;
    }

    if (items.length === 0) {
      return <p className="text-sm text-slate-500">Ничего не найдено.</p>;
    }

    return (
      <div className="grid grid-cols-4 gap-3">
        {items.map((product) => {
          const fullName = `${product.icon} ${product.name}`;

          const isAdded = shoppingList.some((item) => {
            if (item.productId) {
              return item.productId === product.id;
            }

            return normalizeName(item.name) === normalizeName(fullName);
          });

          const existsInFridge = isProductInFridge(product.id, fullName);

          return (
            <motion.button
              key={product.id}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => addProduct(product)}
              className={`rounded-2xl p-3 text-center text-sm transition ${
                isAdded
                  ? "bg-green-100 text-green-700"
                  : existsInFridge
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              <div className="text-2xl">{product.icon}</div>
              <div className="mt-1 line-clamp-2 text-xs">{product.name}</div>

              {existsInFridge && !isAdded && (
                <div className="mt-1 text-[10px] font-medium">
                  Есть в холодильнике
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  const isSearching = search.trim().length >= 2;

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
          <h1 className="text-3xl font-bold">Покупки 🛒</h1>
        </motion.header>

        <section className="space-y-5 px-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Список покупок</h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {shoppingList.length}
              </span>
            </div>

            {loadingShopping ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : shoppingList.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока список пуст. Добавь товары ниже.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {shoppingList.map((item) => {
                    const existsInFridge = isProductInFridge(
                      item.productId,
                      item.name
                    );

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <span className="mt-1 h-5 w-5 rounded-full border border-slate-300" />

                          <div>
                            <span className="font-medium">{item.name}</span>

                            {existsInFridge && (
                              <div className="mt-1 text-xs font-medium text-amber-600">
                                ⚠️ Уже есть в холодильнике
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => markAsBought(item)}
                            className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                          >
                            Куплено
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => removeProduct(item)}
                            className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            Убрать
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
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
            placeholder="🔍 Поиск товара"
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {isSearching ? "Результаты поиска" : "Популярные товары"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isSearching
                    ? "Показываем до 24 найденных товаров"
                    : "Показываем только 24 популярных товара"}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                {isSearching ? searchProducts.length : popularProducts.length}
              </span>
            </div>

            {search.trim().length > 0 && search.trim().length < 2 ? (
              <p className="text-sm text-slate-500">
                Введи минимум 2 буквы для поиска.
              </p>
            ) : isSearching ? (
              <ProductGrid items={searchProducts} loading={loadingSearch} />
            ) : (
              <ProductGrid items={popularProducts} loading={loadingProducts} />
            )}
          </motion.div>
        </section>

        <BottomNav current="shopping" />
      </div>
    </main>
  );
}