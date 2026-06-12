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
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type ShoppingItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
  productName?: string;
  icon?: string;
  category?: string;
};

type FridgeItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
};

type Product = {
  id: string;
  icon: string;
  name: string;
  category: string;
  ingredientId?: string;
  search?: string[];
  purchaseCount?: number;
};

export default function ShoppingPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [fridgeList, setFridgeList] = useState<FridgeItem[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showFrequent, setShowFrequent] = useState(false);
  const [frequentVisibleCount, setFrequentVisibleCount] = useState(12);

  const [loadingShopping, setLoadingShopping] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingFrequent, setLoadingFrequent] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  function normalizeName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanProductName(value: string) {
    return value
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function makeSafeId(value: string) {
    return normalizeName(value)
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function productFromDoc(document: any): Product | null {
    const data = document.data();

    if (!data.name) return null;

    return {
      id: document.id,
      icon: data.icon || "🛒",
      name: cleanProductName(data.name),
      category: data.category || "Другое",
      ingredientId: data.ingredientId || document.id,
      search: Array.isArray(data.search) ? data.search : [],
      purchaseCount: data.purchaseCount || 0,
    };
  }

  function findCatalogProduct(product: Product | ShoppingItem) {
    const productId = "productId" in product ? product.productId : product.id;
    const ingredientId = product.ingredientId;
    const cleanName =
      "productName" in product && product.productName
        ? cleanProductName(product.productName)
        : cleanProductName(product.name || "");

    return allProducts.find((catalogProduct) => {
      if (productId && catalogProduct.id === productId) return true;
      if (ingredientId && catalogProduct.ingredientId === ingredientId) {
        return true;
      }
      if (ingredientId && catalogProduct.id === ingredientId) return true;

      return normalizeName(catalogProduct.name) === normalizeName(cleanName);
    });
  }

  function getResolvedProduct(product: Product): Product {
    const catalogProduct = findCatalogProduct(product);

    if (!catalogProduct) return product;

    return {
      ...product,
      icon:
        !product.icon || product.icon === "🛒"
          ? catalogProduct.icon
          : product.icon,
      name: cleanProductName(product.name || catalogProduct.name),
      category: product.category || catalogProduct.category,
      ingredientId:
        product.ingredientId ||
        catalogProduct.ingredientId ||
        catalogProduct.id,
    };
  }

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "shopping"),
      (snapshot) => {
        const items: ShoppingItem[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.name) {
            items.push({
              id: document.id,
              name: data.name,
              productId: data.productId,
              ingredientId: data.ingredientId,
              productName: data.productName,
              icon: data.icon,
              category: data.category,
            });
          }
        });

        setShoppingList(items);
        setLoadingShopping(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "fridge"),
      (snapshot) => {
        const items: FridgeItem[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.name) {
            items.push({
              id: document.id,
              name: data.name,
              productId: data.productId,
              ingredientId: data.ingredientId,
            });
          }
        });

        setFridgeList(items);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "favoriteProducts"),
      (snapshot) => {
        const items: Product[] = [];

        snapshot.forEach((document) => {
          const product = productFromDoc(document);
          if (product) items.push(product);
        });

        items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setFavoriteProducts(items);
        setLoadingFavorites(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const frequentQuery = query(
      collection(db, "families", familyId, "frequentProducts"),
      orderBy("purchaseCount", "desc"),
      limit(24),
    );

    const unsubscribe = onSnapshot(frequentQuery, (snapshot) => {
      const items: Product[] = [];

      snapshot.forEach((document) => {
        const product = productFromDoc(document);
        if (product) items.push(product);
      });

      setFrequentProducts(items);
      setLoadingFrequent(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const productsQuery = query(
      collection(db, "products"),
      orderBy("name"),
      limit(3000),
    );

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const items: Product[] = [];

      snapshot.forEach((document) => {
        const product = productFromDoc(document);
        if (product) items.push(product);
      });

      setAllProducts(items);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleSearchProducts = useMemo(() => {
    const text = normalizeName(search);

    if (text.length < 2) return [];

    const filtered = allProducts.filter((product) => {
      const name = normalizeName(product.name);
      const category = normalizeName(product.category || "");
      const searchText = (product.search || [])
        .map((item) => normalizeName(item))
        .join(" ");

      return (
        name.includes(text) ||
        category.includes(text) ||
        searchText.includes(text)
      );
    });

    const uniqueProducts = new Map<string, Product>();

    filtered.forEach((product) => {
      const key = normalizeName(product.name);

      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, product);
      }
    });

    return Array.from(uniqueProducts.values()).slice(0, 24);
  }, [allProducts, search]);

  function isFavorite(product: Product) {
    return favoriteProducts.some((item) => item.id === product.id);
  }

  function isProductInFridge(
    productId?: string,
    name?: string,
    ingredientId?: string,
  ) {
    return fridgeList.some((fridgeItem) => {
      if (ingredientId && fridgeItem.ingredientId) {
        return fridgeItem.ingredientId === ingredientId;
      }

      if (productId && fridgeItem.productId) {
        return fridgeItem.productId === productId;
      }

      if (name) {
        return normalizeName(fridgeItem.name) === normalizeName(name);
      }

      return false;
    });
  }

  async function toggleFavorite(product: Product) {
    if (!familyId) return;

    const resolvedProduct = getResolvedProduct(product);
    const exists = isFavorite(resolvedProduct);
    const cleanName = cleanProductName(resolvedProduct.name);
    const ingredientId = resolvedProduct.ingredientId || resolvedProduct.id;

    if (exists) {
      await deleteDoc(
        doc(db, "families", familyId, "favoriteProducts", resolvedProduct.id),
      );

      return;
    }

    await setDoc(
      doc(db, "families", familyId, "favoriteProducts", resolvedProduct.id),
      {
        name: cleanName,
        icon: resolvedProduct.icon || "🛒",
        category: resolvedProduct.category || "Другое",
        productId: resolvedProduct.id,
        ingredientId,
        search: resolvedProduct.search || [],
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function addProduct(product: Product) {
    if (!familyId) return;

    const resolvedProduct = getResolvedProduct(product);
    const cleanName = cleanProductName(resolvedProduct.name);
    const fullName = `${resolvedProduct.icon} ${cleanName}`;
    const ingredientId = resolvedProduct.ingredientId || resolvedProduct.id;

    const alreadyExists = shoppingList.some((item) => {
      if (item.ingredientId && item.ingredientId === ingredientId) return true;
      if (item.productId && item.productId === resolvedProduct.id) return true;

      return normalizeName(item.name) === normalizeName(fullName);
    });

    if (alreadyExists) return;

    const existsInFridge = isProductInFridge(
      resolvedProduct.id,
      fullName,
      ingredientId,
    );

    if (existsInFridge) {
      const confirmed = window.confirm(
        `⚠️ ${fullName} уже есть в холодильнике.\n\nДобавить в список покупок всё равно?`,
      );

      if (!confirmed) return;
    }

    await addDoc(collection(db, "families", familyId, "shopping"), {
      name: fullName,
      productName: cleanName,
      icon: resolvedProduct.icon,
      productId: resolvedProduct.id,
      ingredientId,
      category: resolvedProduct.category,
      createdAt: serverTimestamp(),
    });

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_add",
      title: "Добавил в покупки",
      message: fullName,
      emoji: resolvedProduct.icon || "🛒",
      itemName: fullName,
    });

    setSearch("");
  }

  async function saveFrequentProduct(item: ShoppingItem) {
    if (!familyId) return;

    const catalogProduct = findCatalogProduct(item);

    const productId =
      item.productId ||
      catalogProduct?.id ||
      makeSafeId(item.productName || item.name);

    const cleanName = cleanProductName(
      item.productName ||
        catalogProduct?.name ||
        item.name.replace(item.icon || "", ""),
    );

    const icon =
      item.icon && item.icon !== "🛒"
        ? item.icon
        : catalogProduct?.icon || "🛒";

    await setDoc(
      doc(db, "families", familyId, "frequentProducts", productId),
      {
        name: cleanName,
        icon,
        category: item.category || catalogProduct?.category || "Другое",
        productId,
        ingredientId:
          item.ingredientId ||
          catalogProduct?.ingredientId ||
          catalogProduct?.id ||
          productId,
        purchaseCount: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function markAsBought(item: ShoppingItem) {
    if (!familyId) return;

    const productId = item.productId || undefined;
    const ingredientId = item.ingredientId || item.productId || undefined;

    const alreadyInFridge = isProductInFridge(
      productId,
      item.name,
      ingredientId,
    );

    if (!alreadyInFridge) {
      await addDoc(collection(db, "families", familyId, "fridge"), {
        name: item.name,
        productId: item.productId || null,
        ingredientId: ingredientId || null,
        productName: item.productName || cleanProductName(item.name),
        icon: item.icon || "🛒",
        category: item.category || null,
        createdAt: serverTimestamp(),
      });
    }

    await saveFrequentProduct(item);

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

  async function removeFromShopping(item: ShoppingItem) {
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

  function ProductGrid({
    items,
    loading,
    emptyText,
  }: {
    items: Product[];
    loading: boolean;
    emptyText: string;
  }) {
    if (loading) {
      return <p className="text-sm text-slate-500">Загрузка товаров...</p>;
    }

    if (items.length === 0) {
      return <p className="text-sm text-slate-500">{emptyText}</p>;
    }

    return (
      <div className="grid grid-cols-4 gap-3">
        {items.map((originalProduct) => {
          const product = getResolvedProduct(originalProduct);
          const cleanName = cleanProductName(product.name);
          const fullName = `${product.icon} ${cleanName}`;
          const ingredientId = product.ingredientId || product.id;

          const isAdded = shoppingList.some((item) => {
            if (item.ingredientId && item.ingredientId === ingredientId) {
              return true;
            }

            if (item.productId && item.productId === product.id) {
              return true;
            }

            return normalizeName(item.name) === normalizeName(fullName);
          });

          const existsInFridge = isProductInFridge(
            product.id,
            fullName,
            ingredientId,
          );

          const favorite = isFavorite(product);

          return (
            <div key={product.id} className="relative">
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => addProduct(product)}
                className={`min-h-[112px] w-full rounded-2xl p-3 text-center text-sm transition ${
                  isAdded
                    ? "bg-green-100 text-green-700"
                    : existsInFridge
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="text-2xl">{product.icon}</div>
                <div
                  className="mt-1 text-xs leading-4"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {cleanName}
                </div>

                {product.purchaseCount ? (
                  <div className="mt-1 text-[10px] text-slate-400">
                    {product.purchaseCount} раз
                  </div>
                ) : null}

                {existsInFridge && !isAdded && (
                  <div className="mt-1 text-[10px] font-medium">Есть дома</div>
                )}
              </motion.button>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(product);
                }}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-1 text-lg shadow-sm"
                aria-label="Добавить в избранное"
              >
                {favorite ? "⭐" : "☆"}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const isSearching = normalizeName(search).length >= 2;

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
                Пока список пуст. Добавь товары через поиск, избранные или часто
                покупаемые.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {shoppingList.map((item) => {
                    const existsInFridge = isProductInFridge(
                      item.productId,
                      item.name,
                      item.ingredientId,
                    );

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-2xl px-4 py-3 ${
                          existsInFridge ? "bg-amber-50" : "bg-slate-50"
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-2 font-medium">
                          <span
                            className={`h-4 w-4 rounded-full border ${
                              existsInFridge
                                ? "border-amber-400 bg-amber-100"
                                : "border-slate-300"
                            }`}
                          />

                          <span>{item.name}</span>
                        </div>

                        {existsInFridge && (
                          <p className="mb-3 text-xs text-amber-700">
                            Уже есть в холодильнике
                          </p>
                        )}

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
                            onClick={() => removeFromShopping(item)}
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
            placeholder="🔍 Найти товар от 2 букв"
          />

          {isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Результаты поиска</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Поиск работает с 2 символов
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {visibleSearchProducts.length}
                </span>
              </div>

              <ProductGrid
                items={visibleSearchProducts}
                loading={loadingProducts}
                emptyText="Ничего не найдено."
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">⭐ Избранные</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Товары, которые семья отметила звездой
                </p>
              </div>

              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">
                {favoriteProducts.length}
              </span>
            </div>

            <ProductGrid
              items={favoriteProducts}
              loading={loadingFavorites}
              emptyText="Пока нет избранных. Нажми ☆ на товаре."
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setShowFrequent((prev) => !prev)}
              className="mb-1 flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold">🔁 Часто покупаемые</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Появляются автоматически после покупок
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {frequentProducts.length}
                </span>
                <span className="text-lg text-slate-400">
                  {showFrequent ? "▲" : "▼"}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {showFrequent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pt-4"
                >
                  <ProductGrid
                    items={frequentProducts.slice(0, frequentVisibleCount)}
                    loading={loadingFrequent}
                    emptyText="Пока пусто. Купленные товары будут появляться здесь автоматически."
                  />

                  {frequentProducts.length > frequentVisibleCount && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setFrequentVisibleCount((prev) => prev + 12)}
                      className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      Показать ещё
                    </motion.button>
                  )}

                  {frequentProducts.length > 12 && frequentVisibleCount > 12 && (
                    <button
                      onClick={() => setFrequentVisibleCount(12)}
                      className="mt-3 w-full text-sm text-slate-500"
                    >
                      Свернуть до 12
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        <BottomNav current="shopping" />
      </div>
    </main>
  );
}
