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

type WishItem = {
  id: string;
  title: string;
  price: string;
  link: string;
  imageUrl: string;
  section: string;
};

const familyId = "main";
const sections = ["👨 Он", "👩 Она", "👧 Дети", "🏠 Дом"];

export default function WishPage() {
  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [section, setSection] = useState("🏠 Дом");
  const [loading, setLoading] = useState(true);

  const wishCollection = collection(db, "families", familyId, "wish");

  useEffect(() => {
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
          section: data.section || "🏠 Дом",
        });
      });

      setWishItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function addWishItem() {
    if (!title.trim()) return;

    await addDoc(wishCollection, {
      title: title.trim(),
      price: price.trim(),
      link: link.trim(),
      imageUrl: imageUrl.trim(),
      section,
      createdAt: new Date(),
    });

    setTitle("");
    setPrice("");
    setLink("");
    setImageUrl("");
    setSection("🏠 Дом");
  }

  async function removeWishItem(id: string) {
    await deleteDoc(doc(db, "families", familyId, "wish", id));
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Wish List ⭐</h1>
        </header>

        <section className="px-5 space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
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

              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                placeholder="Ссылка на картинку"
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

              <button
                onClick={addWishItem}
                className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
              >
                Добавить
              </button>
            </div>
          </div>

          {sections.map((currentSection) => {
            const sectionItems = wishItems.filter(
              (item) => item.section === currentSection
            );

            return (
              <div
                key={currentSection}
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
                  <div className="space-y-3">
                    {sectionItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-slate-50 p-3"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="mb-3 h-36 w-full rounded-2xl object-cover"
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
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 rounded-xl bg-blue-500 px-3 py-2 text-center text-sm font-medium text-white"
                            >
                              Открыть
                            </a>
                          )}

                          <button
                            onClick={() => removeWishItem(item.id)}
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
            );
          })}
        </section>

        <BottomNav current="wish" />
      </div>
    </main>
  );
}