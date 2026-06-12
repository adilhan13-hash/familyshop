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

type FilterKey = "all" | "food" | "cleaning" | "kids" | "home" | "other";

const filters: { key: FilterKey; label: string; emoji: string }[] = [
  { key: "all", label: "Все", emoji: "🏠" },
  { key: "food", label: "Продукты", emoji: "🥛" },
  { key: "cleaning", label: "Химия", emoji: "🧴" },
  { key: "kids", label: "Детское", emoji: "👶" },
  { key: "home", label: "Дом", emoji: "🧻" },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getItemEmoji(item: FridgeItem) {
  const name = item.name || "";
  const first = name.trim().split(" ")[0];

  if (/\p{Emoji}/u.test(first)) return first;

  const category = normalizeText(item.category || "");
  const title = normalizeText(item.name || "");

  if (category.includes("мол") || title.includes("молоко")) return "🥛";
  if (category.includes("мяс") || title.includes("кур")) return "🍗";
  if (category.includes("овощ") || title.includes("карто")) return "🥔";
  if (category.includes("фрукт")) return "🍎";
  if (category.includes("хим") || title.includes("порошок")) return "🧴";
  if (title.includes("пампер") || title.includes("подгуз")) return "👶";
  if (title.includes("бумага") || title.includes("салфет")) return "🧻";

  return "📦";
}

function cleanItemName(name: string) {
  return name.replace(/^\p{Emoji_Presentation}\s*/u, "").trim();
}

function getFilterKey(item: FridgeItem): FilterKey {
  const text = normalizeText(`${item.name} ${item.category || ""}`);

  if (
    /(молоко|кефир|сыр|творог|йогурт|мясо|курица|фарш|рыба|яйц|хлеб|рис|макарон|карто|лук|морков|овощ|фрукт|круп|масло|соль|сахар|чай|кофе|еда|продукт)/.test(
      text
    )
  ) {
    return "food";
  }

  if (
    /(хим|порошок|гель|мыло|шампун|зубн|паста|чист|моющ|кондиционер|средство|доместос|фейри|fairy|салфетк)/.test(
      text
    )
  ) {
    return "cleaning";
  }

  if (/(дет|пампер|подгуз|салфетки дет|смесь|пюре|игруш|ребен)/.test(text)) {
    return "kids";
  }

  if (/(бумага|пакет|фольга|пергамент|лампоч|батарей|губк|тряпк|дом)/.test(text)) {
    return "home";
  }

  return "other";
}

function getFilterLabel(key: FilterKey) {
  if (key === "food") return "🥛 Продукты";
  if (key === "cleaning") return "🧴 Бытовая химия";
  if (key === "kids") return "👶 Детское";
  if (key === "home") return "🧻 Для дома";
  if (key === "other") return "📦 Другое";
  return "🏠 Все";
}

export default function FridgePage() {
  const { familyId, appUser } = useFamilyAuth();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [loadingFridge, setLoadingFridge] = useState(true);
  const [fridgeSearch, setFridgeSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

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
              category: data.category,
            });
          }
        });

        items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setFridgeItems(items);
        setLoadingFridge(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  const filteredItems = useMemo(() => {
    const searchText = normalizeText(fridgeSearch);

    return fridgeItems.filter((item) => {
      const itemFilter = getFilterKey(item);

      if (activeFilter !== "all" && itemFilter !== activeFilter) {
        return false;
      }

      if (searchText.length < 2) return true;

      const name = normalizeText(item.name);
      const category = normalizeText(item.category || "");
      const productId = normalizeText(item.productId || "");
      const ingredientId = normalizeText(item.ingredientId || "");

      return (
        name.includes(searchText) ||
        category.includes(searchText) ||
        productId.includes(searchText) ||
        ingredientId.includes(searchText)
      );
    });
  }, [fridgeItems, fridgeSearch, activeFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map<FilterKey, FridgeItem[]>();

    filteredItems.forEach((item) => {
      const key = getFilterKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(item);
    });

    const order: FilterKey[] = ["food", "cleaning", "kids", "home", "other"];

    return order
      .map((key) => ({
        key,
        title: getFilterLabel(key),
        items: groups.get(key) || [],
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredItems]);

  function getFilterCount(key: FilterKey) {
    if (key === "all") return fridgeItems.length;
    return fridgeItems.filter((item) => getFilterKey(item) === key).length;
  }

  async function moveToShopping(item: FridgeItem) {
    if (!familyId) return;

    await addDoc(collection(db, "families", familyId, "shopping"), {
      name: item.name,
      productId: item.productId || null,
      ingredientId: item.ingredientId || null,
      category: item.category || null,
      source: "Есть дома",
      createdAt: serverTimestamp(),
    });

    await deleteDoc(doc(db, "families", familyId, "fridge", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "home_stock_to_shopping",
      title: "Добавил в покупки",
      message: item.name,
      emoji: "🛒",
      itemName: item.name,
    });
  }

  async function removeFromStock(item: FridgeItem) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "fridge", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "home_stock_remove",
      title: "Убрал из запасов",
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
          <h1 className="text-3xl font-bold">Есть дома 🏠</h1>
          <p className="mt-1 text-sm text-slate-500">
            Всё, что есть дома: продукты, бытовые товары, детские вещи и запасы
            для семьи.
          </p>
        </motion.header>

        <section className="space-y-4 px-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Всего</p>
              <p className="mt-1 text-2xl font-bold">{fridgeItems.length}</p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Продукты</p>
              <p className="mt-1 text-2xl font-bold">
                {getFilterCount("food")}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Дом</p>
              <p className="mt-1 text-2xl font-bold">
                {fridgeItems.length - getFilterCount("food")}
              </p>
            </div>
          </motion.div>

          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            value={fridgeSearch}
            onChange={(event) => setFridgeSearch(event.target.value)}
            placeholder="🔍 Найти дома от 2 букв"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400"
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-4 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-2">
              {filters.map((filter) => {
                const active = activeFilter === filter.key;
                const count = getFilterCount(filter.key);

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {filter.emoji} {filter.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {activeFilter === "all"
                    ? "Все запасы"
                    : getFilterLabel(activeFilter)}
                </h2>

                {normalizeText(fridgeSearch).length >= 2 ? (
                  <p className="mt-1 text-sm text-slate-500">
                    Найдено: {filteredItems.length} из {fridgeItems.length}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    Показываем то, что сейчас есть дома.
                  </p>
                )}
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                {filteredItems.length}
              </span>
            </div>

            {loadingFridge ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : fridgeItems.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Пока дома ничего не отмечено. Купленные товары будут появляться
                здесь.
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Ничего не найдено. Попробуй другой поиск или фильтр.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-5">
                  {groupedItems.map((group) => (
                    <div key={group.key}>
                      {activeFilter === "all" && (
                        <h3 className="mb-2 text-sm font-semibold text-slate-500">
                          {group.title}
                        </h3>
                      )}

                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                {getItemEmoji(item)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-bold text-slate-900">
                                  {cleanItemName(item.name)}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {item.category || getFilterLabel(getFilterKey(item))}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => moveToShopping(item)}
                                className="flex-1 rounded-2xl bg-green-500 px-3 py-3 text-sm font-semibold text-white"
                              >
                                🛒 В покупки
                              </motion.button>

                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => removeFromStock(item)}
                                className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                              >
                                🗑
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
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