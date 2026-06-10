"use client";

import { ChangeEvent, useEffect, useState } from "react";
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

type WishItem = {
  id: string;
  title: string;
  price: string;
  link: string;
  imageUrl: string;
  imageBase64: string;
  section: string;
};

const sections = ["👨 Он", "👩 Она", "👧 Дети", "🏠 Дом"];

export default function WishPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [section, setSection] = useState("🏠 Дом");
  const [loading, setLoading] = useState(true);
  const [imageMessage, setImageMessage] = useState("");

  useEffect(() => {
    if (!familyId) return;

    const wishCollection = collection(db, "families", familyId, "wish");

    const unsubscribe = onSnapshot(wishCollection, (snapshot) => {
      const items: WishItem[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        items.push({
          id: document.id,
          title: data.title || "",
          price: data.price || "",
          link: data.link || "",
          imageUrl: data.imageUrl || "",
          imageBase64: data.imageBase64 || "",
          section: data.section || "🏠 Дом",
        });
      });

      setWishItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  async function resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const maxSize = 800;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Не удалось обработать фото."));
            return;
          }

          let width = image.width;
          let height = image.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }

          if (height >= width && height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          context.drawImage(image, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };

        image.onerror = () => reject(new Error("Не удалось загрузить фото."));
        image.src = String(reader.result);
      };

      reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageMessage("");

    if (!file.type.startsWith("image/")) {
      setImageMessage("Выберите файл изображения.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageMessage("Фото слишком большое. Выберите файл до 8 МБ.");
      return;
    }

    try {
      const compressedImage = await resizeImage(file);

      setImageBase64(compressedImage);
      setImageUrl("");
      setImageMessage("Фото добавлено.");
    } catch (error) {
      console.error(error);
      setImageMessage("Не удалось обработать фото.");
    }
  }

  function removeSelectedImage() {
    setImageBase64("");
    setImageMessage("");
  }

  async function addWishItem() {
    if (!familyId) return;
    if (!title.trim()) return;

    const cleanTitle = title.trim();

    await addDoc(collection(db, "families", familyId, "wish"), {
      title: cleanTitle,
      price: price.trim(),
      link: link.trim(),
      imageUrl: imageUrl.trim(),
      imageBase64,
      section,
      createdAt: new Date(),
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

    setTitle("");
    setPrice("");
    setLink("");
    setImageUrl("");
    setImageBase64("");
    setImageMessage("");
    setSection("🏠 Дом");
  }

  async function removeWishItem(item: WishItem) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "wish", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "wish_remove",
      title: "Убрал желание",
      message: item.title,
      emoji: "🗑️",
      itemName: item.title,
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
          <h1 className="text-3xl font-bold">Wish List ⭐</h1>
        </motion.header>

        <section className="px-5 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold">Добавить желание</h2>

            <div className="space-y-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Название, например: Робот-пылесос"
              />

              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Цена, например: 70000"
              />

              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Ссылка на товар"
              />

              <motion.label
                whileTap={{ scale: 0.97 }}
                className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
              >
                📷 Выбрать фото из галереи
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </motion.label>

              <AnimatePresence>
                {imageBase64 && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl bg-slate-50 p-3"
                  >
                    <img
                      src={imageBase64}
                      alt="Выбранное фото"
                      className="w-full rounded-2xl"
                    />

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={removeSelectedImage}
                      className="mt-3 w-full rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Убрать фото
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {imageMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="text-sm text-slate-500"
                  >
                    {imageMessage}
                  </motion.p>
                )}
              </AnimatePresence>

              <input
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  if (event.target.value.trim()) {
                    setImageBase64("");
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Или ссылка на картинку"
              />

              <select
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              >
                {sections.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={addWishItem}
                className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
              >
                Добавить
              </motion.button>
            </div>
          </motion.div>

          {sections.map((currentSection, index) => {
            const sectionItems = wishItems.filter(
              (item) => item.section === currentSection
            );

            return (
              <motion.div
                key={currentSection}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{currentSection}</h2>

                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                    {sectionItems.length}
                  </span>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : sectionItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Пока ничего не добавлено.
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {sectionItems.map((item) => {
                        const imageSource = item.imageBase64 || item.imageUrl;

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-2xl bg-slate-50 p-3"
                          >
                            {imageSource && (
                              <img
                                src={imageSource}
                                alt={item.title}
                                className="mb-3 w-full rounded-2xl"
                              />
                            )}

                            <div className="font-semibold">{item.title}</div>

                            {item.price && (
                              <div className="mt-1 text-sm text-slate-500">
                                {item.price} ₸
                              </div>
                            )}

                            <div className="mt-3 flex gap-2">
                              {item.link && (
                                <motion.a
                                  whileTap={{ scale: 0.95 }}
                                  whileHover={{ scale: 1.02 }}
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 rounded-xl bg-blue-500 px-3 py-2 text-center text-sm font-medium text-white"
                                >
                                  Открыть
                                </motion.a>
                              )}

                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => removeWishItem(item)}
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
            );
          })}
        </section>

        <BottomNav current="wish" />
      </div>
    </main>
  );
}