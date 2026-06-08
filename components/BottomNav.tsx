import Link from "next/link";

type BottomNavProps = {
  current: "shopping" | "fridge" | "wish" | "ai";
};

export default function BottomNav({ current }: BottomNavProps) {
  const items = [
    {
      key: "shopping",
      href: "/shopping",
      icon: "🛒",
      label: "Покупки",
    },
    {
      key: "fridge",
      href: "/fridge",
      icon: "🥛",
      label: "Холодильник",
    },
    {
      key: "wish",
      href: "/wish",
      icon: "⭐",
      label: "Wish",
    },
    {
      key: "ai",
      href: "/ai",
      icon: "🤖",
      label: "AI Cook",
    },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-slate-200 bg-white px-2 py-3 text-xs text-slate-500">
      {items.map((item) => {
        const isActive = current === item.key;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={isActive ? "font-semibold text-green-600" : ""}
          >
            <span>{item.icon}</span>
            <br />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}