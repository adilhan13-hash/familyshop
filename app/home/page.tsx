"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

type ActivityItem = {
  id: string;
  userName: string;
  userPhoto: string;
  title: string;
  message: string;
  emoji: string;
  type: string;
  createdAt?: {
    seconds: number;
  };
};

type CountState = {
  shopping: number;
  fridge: number;
  wish: number;
  activity: number;
};

function getInitials(name?: string) {
  const cleanName = (name || "").trim();

  if (!cleanName) return "👤";

  return cleanName.slice(0, 1).toUpperCase();
}

function formatTime(createdAt?: { seconds: number }) {
  if (!createdAt?.seconds) return "только что";

  const date = new Date(createdAt.seconds * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "только что";
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}

export default function HomePage() {
  const { familyId, user, appUser } = useFamilyAuth();

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [counts, setCounts] = useState<CountState>({
    shopping: 0,
    fridge: 0,
    wish: 0,
    activity: 0,
  });

  useEffect(() => {
    if (!familyId) return;

    const activityQuery = query(
      collection(db, "families", familyId, "activity"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const items: ActivityItem[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        items.push({
          id: document.id,
          userName: data.userName || "Пользователь",
          userPhoto: data.userPhoto || "",
          title: data.title || "",
          message: data.message || "",
          emoji: data.emoji || "🏡",
          type: data.type || "",
          createdAt: data.createdAt,
        });
      });

      setActivity(items);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribers = [
      onSnapshot(collection(db, "families", familyId, "shopping"), (snapshot) => {
        setCounts((current) => ({
          ...current,
          shopping: snapshot.size,
        }));
      }),

      onSnapshot(collection(db, "families", familyId, "fridge"), (snapshot) => {
        setCounts((current) => ({
          ...current,
          fridge: snapshot.size,
        }));
      }),

      onSnapshot(collection(db, "families", familyId, "wish"), (snapshot) => {
        setCounts((current) => ({
          ...current,
          wish: snapshot.size,
        }));
      }),

      onSnapshot(collection(db, "families", familyId, "activity"), (snapshot) => {
        setCounts((current) => ({
          ...current,
          activity: snapshot.size,
        }));
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [familyId]);

  const todayActivity = useMemo(() => {
    return activity.filter((item) => {
      if (!item.createdAt?.seconds) return true;

      const date = new Date(item.createdAt.seconds * 1000);
      const now = new Date();

      return date.toDateString() === now.toDateString();
    });
  }, [activity]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">FamilyShop</p>
              <h1 className="text-3xl font-bold">Дом 🏡</h1>
            </div>

            <Link
              href="/family"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm"
            >
              Семья
            </Link>
          </div>
        </header>

        <section className="px-5 space-y-5">
          <div className="rounded-2xl bg-red-50 p-4 text-xs text-red-700">
            <p className="font-bold">DEBUG USER</p>
            <p>uid: {user?.uid || "нет"}</p>
            <p>appUser uid: {appUser?.uid || "нет"}</p>
            <p>name: {appUser?.displayName || "нет"}</p>
            <p>phone: {appUser?.phone || "нет"}</p>
            <p>familyId: {familyId || "нет"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/shopping"
              className="rounded-3xl bg-white p-4 shadow-sm"
            >
              <p className="text-2xl">🛒</p>
              <p className="mt-2 text-sm text-slate-500">Покупки</p>
              <p className="text-2xl font-bold">{counts.shopping}</p>
            </Link>

            <Link href="/fridge" className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-2xl">🥛</p>
              <p className="mt-2 text-sm text-slate-500">Холодильник</p>
              <p className="text-2xl font-bold">{counts.fridge}</p>
            </Link>

            <Link href="/ai" className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-2xl">🤖</p>
              <p className="mt-2 text-sm text-slate-500">AI Cook</p>
              <p className="text-2xl font-bold">AI</p>
            </Link>

            <Link href="/wish" className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-2xl">⭐</p>
              <p className="mt-2 text-sm text-slate-500">Желания</p>
              <p className="text-2xl font-bold">{counts.wish}</p>
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Сегодня</h2>
                <p className="text-sm text-slate-500">
                  Последние действия семьи
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {todayActivity.length}
              </span>
            </div>

            {activity.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Пока действий нет. Когда семья начнёт добавлять покупки,
                желания и рецепты — они появятся здесь.
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-lg font-bold text-slate-500">
                      {item.userPhoto ? (
                        <img
                          src={item.userPhoto}
                          alt={item.userName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(item.userName)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{item.userName}</p>
                        <p className="shrink-0 text-xs text-slate-400">
                          {formatTime(item.createdAt)}
                        </p>
                      </div>

                      <p className="mt-1 text-sm font-medium">
                        {item.emoji} {item.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <BottomNav current="home" />
      </div>
    </main>
  );
}