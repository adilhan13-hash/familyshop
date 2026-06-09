"use client";

import { useEffect, useMemo, useState } from "react";
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

type FridgeItem = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  icon: string;
  name: string;
  category: string;
  popular: boolean;
};

const familyId = "main";

export default function ShoppingPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [fridgeList, setFridgeList] = useState<FridgeItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Популярные");
  const [search, setSearch] = useState("");
  const [loadingShopping, setLoadingShopping] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const shoppingCollection = collection(db, "families", familyId, "shopping");
  const fridgeCollection = collection(db, "families", familyId, "fridge");

  useEffect(() => {
    const unsubscribe = onSnapshot(shoppingCollection, (snapshot) => {
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
      setLoadingShopping(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(fridgeCollection, (snapshot) => {
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

      setFridgeList(items);
    });

    return () => unsubscribe();
  }, []);

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

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category))
    ).sort((a, b) => a.localeCompare(b, "ru"));

    return ["Популярные", ...uniqueCategories];
  }, [products]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];

    const query = search.trim().toLowerCase();

    return products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, search]);

  const categoryProducts = useMemo(() => {
    if (selectedCategory === "Популярные") {
      return products.filter((product) => product.popular);
    }

    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  async function addProduct(product: Product) {
    const fullName = `${product.icon} ${product.name}`;

    const alreadyExists = shoppingList.some((item) => item.name === fullName);

    if (alreadyExists) return;

    await addDoc(shoppingCollection, {
      name: fullName,
      productId: product.id,
      category: product.category,
      createdAt: new Date(),
    });

    setSearch("");
  }

  async function removeProduct(id: string) {
    await deleteDoc(doc(db, "families", familyId, "shopping", id));
  }

  async function markAsBought(item: ShoppingItem) {
    const alreadyInFridge = fridgeList.some(
      (fridgeItem) => fridgeItem.name === item.name
    );

    if (!alreadyInFridge) {
      await addDoc(fridgeCollection, {
        name: item.name,
        createdAt: new Date(),
      });
    }

    await deleteDoc(doc(db, "families", familyId, "shopping", item.id));
  }

  function ProductGrid({ items }: { items: Product[] }) {
    if (loadingProducts) {
      return <p className="text-sm text-slate-500">Загрузка товаров...</p>;
    }

    if (items.length === 0) {
      return <p className="text-sm text-slate-500">Ничего не найдено.</p>;
    }

    return (
      <div className="grid grid-cols-4 gap-3">
        {items.map((product) => {
          const fullName = `${product.icon} ${product.name}`;
          const isAdded = shoppingList.some((item) => item.name === fullName);

          return (
            <button
              key={product.id}
              onClick={() => addProduct(product)}
              className={`rounded-2xl p-3 text-center text-sm transition ${
                isAdded
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              <div className="text-2xl">{product.icon}</div>
              <div className="mt-1 line-clamp-2 text-xs">{product.name}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Покупки 🛒</h1>
        </header>

        <section className="px-5 space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
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
              <div className="space-y-3">
                {shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="h-5 w-5 rounded-full border border-slate-300" />
                      <span className="font-medium">{item.name}</span>
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

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            placeholder="🔍 Поиск товара"
          />

          {search.trim() && (
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Результаты поиска</h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {searchResults.length}
                </span>
              </div>

              <ProductGrid items={searchResults} />
            </div>
          )}

          {!search.trim() && (
            <>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Категории</h2>

                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => {
                    const isActive = selectedCategory === category;

                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`rounded-2xl px-4 py-3 text-left text-sm ${
                          isActive
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{selectedCategory}</h2>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                    {categoryProducts.length}
                  </span>
                </div>

                <ProductGrid items={categoryProducts} />
              </div>
            </>
          )}
        </section>

        <BottomNav current="shopping" />
      </div>
    </main>
  );
}