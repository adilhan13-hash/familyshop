"use client";

import { motion } from "framer-motion";

type CookDeckMode = "ready" | "kids" | "categories" | "favorites";

type DeckModeLauncherProps = {
  readyCount: number;
  kidsCount: number;
  categoriesCount: number;
  favoritesCount: number;
  onOpenMode: (mode: CookDeckMode) => void;
};

export function DeckModeLauncher({
  readyCount,
  kidsCount,
  categoriesCount,
  favoritesCount,
  onOpenMode,
}: DeckModeLauncherProps) {
  const tiles: Array<{
    id: CookDeckMode;
    icon: string;
    label: string;
    count: number | string;
    hint: string;
    iconClass: string;
  }> = [
    {
      id: "ready",
      icon: "✅",
      label: "Можно",
      count: readyCount || "—",
      hint: "готовить сейчас",
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "kids",
      icon: "👶",
      label: "Детское",
      count: kidsCount,
      hint: "для семьи",
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      id: "categories",
      icon: "▦",
      label: "Категории",
      count: categoriesCount || "—",
      hint: "супы, второе...",
      iconClass: "bg-violet-100 text-violet-700",
    },
    {
      id: "favorites",
      icon: "⭐",
      label: "Избранное",
      count: favoritesCount,
      hint: "любимые блюда",
      iconClass: "bg-yellow-100 text-yellow-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <motion.button
          key={tile.id}
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onOpenMode(tile.id)}
          className="min-h-[122px] rounded-[28px] bg-white p-4 text-left shadow-sm ring-1 ring-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${tile.iconClass}`}
            >
              {tile.icon}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
              {tile.count}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-black leading-tight text-slate-950">
            {tile.label}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {tile.hint}
          </p>
        </motion.button>
      ))}
    </div>
  );
}
