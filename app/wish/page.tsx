"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  setDoc,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type WishItem = {
  id: string;
  title: string;
  price: string;
  link: string;
  imageBase64: string;
  section: string;
  priority: string;
  ownerName: string;
  ownerPhoto: string;
  ownerUid: string;
  createdAt?: {
    seconds: number;
  };
};

type SectionOption = {
  id: string;
  label: string;
  emoji: string;
};

type PriorityOption = {
  id: string;
  label: string;
  emoji: string;
  badgeClass: string;
  cardClass: string;
};

type WishNames = {
  maleName: string;
  femaleName: string;
  childName: string;
};

const priorities: PriorityOption[] = [
  {
    id: "very",
    label: "Очень хочу",
    emoji: "🔥",
    badgeClass: "bg-red-100 text-red-700",
    cardClass: "from-red-50 to-orange-50 border-red-100",
  },
  {
    id: "normal",
    label: "Хочу",
    emoji: "⭐",
    badgeClass: "bg-yellow-100 text-yellow-800",
    cardClass: "from-yellow-50 to-amber-50 border-yellow-100",
  },
  {
    id: "later",
    label: "Когда-нибудь",
    emoji: "💡",
    badgeClass: "bg-blue-100 text-blue-700",
    cardClass: "from-blue-50 to-sky-50 border-blue-100",
  },
];

function parsePrice(value: string) {
  const clean = String(value || "").replace(/[^\d]/g, "");
  return clean ? Number(clean) : 0;
}

function formatPrice(value: string) {
  const number = parsePrice(value);

  if (!number) return "Цена не указана";

  return new Intl.NumberFormat("ru-RU").format(number) + " ₸";
}

function formatDate(createdAt?: { seconds: number }) {
  if (!createdAt?.seconds) return "";

  return new Date(createdAt.seconds * 1000).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}

function getPriority(priorityId: string) {
  return priorities.find((priority) => priority.id === priorityId) || priorities[1];
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WishPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [names, setNames] = useState<WishNames>({
    maleName: "",
    femaleName: "",
    childName: "",
  });

  const [draftNames, setDraftNames] = useState<WishNames>({
    maleName: "",
    femaleName: "",
    childName: "",
  });

  const [showNameSettings, setShowNameSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [openedImage, setOpenedImage] = useState<string | null>(null);
  const [section, setSection] = useState("👨 Он");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  const sections = useMemo<SectionOption[]>(() => {
    return [
      { id: "all", label: "Все", emoji: "⭐" },
      { id: "👨 Он", label: names.maleName.trim() || "Он", emoji: "👨" },
      { id: "👩 Она", label: names.femaleName.trim() || "Она", emoji: "👩" },
      { id: "👧 Дети", label: names.childName.trim() || "Дети", emoji: "👧" },
      { id: "🏠 Дом", label: "Дом", emoji: "🏠" },
    ];
  }, [names]);

  const formSections = useMemo(() => {
    return sections.filter((item) => item.id !== "all");
  }, [sections]);

  const [activeSection, setActiveSection] = useState("all");

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(doc(db, "families", familyId), (snapshot) => {
      const data = snapshot.data();

      const nextNames = {
        maleName: data?.wishMaleName || "",
        femaleName: data?.wishFemaleName || "",
        childName: data?.wishChildName || "",
      };

      setNames(nextNames);
      setDraftNames(nextNames);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "wish"),
      (snapshot) => {
        const items: WishItem[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          items.push({
            id: document.id,
            title: data.title || "Без названия",
            price: data.price || "",
            link: data.link || "",
            imageBase64: data.imageBase64 || data.imageUrl || "",
            section: data.section || "🏠 Дом",
            priority: data.priority || "normal",
            ownerName: data.ownerName || "Пользователь",
            ownerPhoto: data.ownerPhoto || "",
            ownerUid: data.ownerUid || "",
            createdAt: data.createdAt,
          });
        });

        items.sort((a, b) => {
          const priorityOrder: Record<string, number> = {
            very: 1,
            normal: 2,
            later: 3,
          };

          const byPriority =
            (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);

          if (byPriority !== 0) return byPriority;

          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        setWishItems(items);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  const filteredItems = useMemo(() => {
    if (activeSection === "all") return wishItems;

    return wishItems.filter((item) => item.section === activeSection);
  }, [activeSection, wishItems]);

  const totalSum = useMemo(() => {
    return wishItems.reduce((sum, item) => sum + parsePrice(item.price), 0);
  }, [wishItems]);

  const veryWantedCount = useMemo(() => {
    return wishItems.filter((item) => item.priority === "very").length;
  }, [wishItems]);

  function resetForm() {
    setTitle("");
    setPrice("");
    setLink("");
    setImageBase64("");
    setSection("👨 Он");
    setPriority("normal");
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setImageBase64(base64);
    } catch (error) {
      console.error(error);
      setMessage("Не получилось загрузить фото.");
    }
  }

  async function saveNames() {
    if (!familyId) return;

    await setDoc(
      doc(db, "families", familyId),
      {
        wishMaleName: draftNames.maleName.trim(),
        wishFemaleName: draftNames.femaleName.trim(),
        wishChildName: draftNames.childName.trim(),
        wishNamesUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setShowNameSettings(false);
    setMessage("Имена разделов сохранены.");
    setTimeout(() => setMessage(""), 2500);
  }

  async function addWishItem() {
    if (!familyId) return;

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setMessage("Напиши название желания.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await addDoc(collection(db, "families", familyId, "wish"), {
        title: cleanTitle,
        price: price.trim(),
        link: link.trim(),
        imageBase64,
        section,
        priority,
        ownerUid: appUser?.uid || "unknown",
        ownerName: appUser?.displayName || "Без имени",
        ownerPhoto: appUser?.photoBase64 || "",
        createdAt: serverTimestamp(),
      });

      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "wish_add",
        title: "Добавил желание",
        message: cleanTitle,
        emoji: "⭐",
        itemName: cleanTitle,
      });

      resetForm();
      setShowAddForm(false);
      setMessage("⭐ Желание добавлено.");
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      console.error(error);
      setMessage("Не получилось добавить желание.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWishItem(item: WishItem) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "wish", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "wish_delete",
      title: "Удалил желание",
      message: item.title,
      emoji: "🗑️",
      itemName: item.title,
    });
  }

  function getSectionLabel(sectionId: string) {
    return sections.find((item) => item.id === sectionId);
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

          <div className="mt-1 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Wish List ⭐</h1>
              <p className="mt-1 text-sm text-slate-500">
                Желания семьи, подарки и крупные покупки
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNameSettings((current) => !current)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
            >
              ✏️ Имена
            </button>
          </div>
        </motion.header>

        <section className="space-y-5 px-5">
          <AnimatePresence>
            {message ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="rounded-2xl bg-blue-50 p-3 text-sm font-medium text-blue-700"
              >
                {message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showNameSettings ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold">Названия разделов</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Просто замени “Он”, “Она” и “Дети” на имена.
                </p>

                <div className="mt-4 space-y-3">
                  <input
                    value={draftNames.maleName}
                    onChange={(event) =>
                      setDraftNames((current) => ({
                        ...current,
                        maleName: event.target.value,
                      }))
                    }
                    placeholder="👨 Например: Адильхан"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400"
                  />

                  <input
                    value={draftNames.femaleName}
                    onChange={(event) =>
                      setDraftNames((current) => ({
                        ...current,
                        femaleName: event.target.value,
                      }))
                    }
                    placeholder="👩 Например: Дамира"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400"
                  />

                  <input
                    value={draftNames.childName}
                    onChange={(event) =>
                      setDraftNames((current) => ({
                        ...current,
                        childName: event.target.value,
                      }))
                    }
                    placeholder="👧 Например: Амелия"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={saveNames}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white"
                >
                  Сохранить имена
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-2xl">⭐</p>
              <p className="mt-2 text-sm text-slate-500">Желаний</p>
              <p className="text-2xl font-bold">{wishItems.length}</p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-2xl">🔥</p>
              <p className="mt-2 text-sm text-slate-500">Очень хочу</p>
              <p className="text-2xl font-bold">{veryWantedCount}</p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-2xl">💰</p>
              <p className="mt-2 text-sm text-slate-500">Сумма</p>
              <p className="text-lg font-bold">
                {totalSum > 0
                  ? new Intl.NumberFormat("ru-RU", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(totalSum)
                  : "0"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {sections.map((item) => {
              const active = activeSection === item.id;
              const count =
                item.id === "all"
                  ? wishItems.length
                  : wishItems.filter((wish) => wish.section === item.id).length;

              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);

                    if (item.id !== "all") {
                      setSection(item.id);
                    }
                  }}
                  className={`rounded-3xl p-4 text-left shadow-sm transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </div>

                  <p className="mt-3 truncate text-lg font-bold">
                    {item.label}
                  </p>
                </motion.button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-base font-semibold text-white shadow-sm"
          >
            {showAddForm ? "Скрыть форму" : "➕ Добавить желание"}
          </button>

          <AnimatePresence>
            {showAddForm ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold">Новое желание</h2>

                <div className="mt-4 space-y-3">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Название: телефон, платье, игрушка..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400"
                  />

                  <input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    inputMode="numeric"
                    placeholder="Цена, например 35000"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400"
                  />

                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="Ссылка на товар"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400"
                  />

                  <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-medium text-slate-600">
                    📸 Выбрать фото из галереи
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {imageBase64 ? (
                    <div className="overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={imageBase64}
                        alt="Фото желания"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      Для кого
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {formSections.map((item) => {
                        const active = section === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSection(item.id)}
                            className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                              active
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.emoji} {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-600">
                      Приоритет
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {priorities.map((item) => {
                        const active = priority === item.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPriority(item.id)}
                            className={`rounded-2xl px-3 py-3 text-xs font-semibold ${
                              active
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.emoji}
                            <br />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addWishItem}
                    disabled={saving}
                    className="w-full rounded-2xl bg-green-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Добавляю..." : "Добавить желание"}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-3xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                Загрузка...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
                <div className="text-4xl">⭐</div>
                <h2 className="mt-3 text-lg font-bold">Пока пусто</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Добавь первое желание — подарок, покупку для дома или вещь для
                  ребёнка.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => {
                  const itemPriority = getPriority(item.priority);
                  const itemSection = getSectionLabel(item.section);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className={`overflow-hidden rounded-3xl border bg-gradient-to-br shadow-sm ${itemPriority.cardClass}`}
                    >
                      {item.imageBase64 ? (
                        <button
                          type="button"
                          onClick={() => setOpenedImage(item.imageBase64)}
                          className="block h-52 w-full overflow-hidden bg-slate-100"
                        >
                          <img
                            src={item.imageBase64}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-32 items-center justify-center bg-white/60 text-5xl">
                          {itemSection?.emoji || "⭐"}
                        </div>
                      )}

                      <div className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${itemPriority.badgeClass}`}
                          >
                            {itemPriority.emoji} {itemPriority.label}
                          </span>

                          {item.createdAt ? (
                            <span className="text-xs text-slate-500">
                              {formatDate(item.createdAt)}
                            </span>
                          ) : null}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-lg font-semibold text-slate-700">
                          {formatPrice(item.price)}
                        </p>

                        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-500">
                            {item.ownerPhoto ? (
                              <img
                                src={item.ownerPhoto}
                                alt={item.ownerName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>
                                {(item.ownerName || "П").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {itemSection?.emoji || "⭐"}{" "}
                              {itemSection?.label || item.section}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              Добавил: {item.ownerName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                            >
                              🔗 Открыть
                            </a>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => deleteWishItem(item)}
                            className="flex-1 rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700"
                          >
                            🗑️ Удалить
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        <AnimatePresence>
          {openedImage ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenedImage(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenedImage(null);
                }}
                className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-bold text-slate-900 shadow-lg"
              >
                ✕
              </button>

              <motion.img
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                src={openedImage}
                alt="Фото желания"
                onClick={(event) => event.stopPropagation()}
                className="max-h-[88vh] max-w-full rounded-3xl object-contain shadow-2xl"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <BottomNav current="wish" />
      </div>
    </main>
  );
}
