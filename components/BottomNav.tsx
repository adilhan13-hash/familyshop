"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type BottomNavProps = {
  current: "shopping" | "fridge" | "wish" | "ai" | "family" | "home";
};

export default function BottomNav({ current }: BottomNavProps) {
  const items = [
    { key: "shopping", href: "/shopping", icon: "🛒", label: "Покупки" },
    { key: "fridge", href: "/fridge", icon: "🥛", label: "Холодильник" },
    { key: "wish", href: "/wish", icon: "⭐", label: "Wish" },
    { key: "ai", href: "/ai", icon: "🤖", label: "AI" },
    { key: "home", href: "/home", icon: "🏡", label: "Дом" },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/90 px-2 py-2 text-xs text-slate-500 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex justify-around">
        {items.map((item) => {
          const isActive = current === item.key;

          return (
            <Link key={item.key} href={item.href} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`relative mx-1 flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition ${
                  isActive ? "text-green-600" : "text-slate-500"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-2xl bg-green-100"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                <span className="relative z-10 text-xl">{item.icon}</span>

                <span
                  className={`relative z-10 mt-1 text-[11px] ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}