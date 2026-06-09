"use client";

import { useState } from "react";

type ProfileSetupProps = {
  onSave: (displayName: string) => Promise<void>;
};

export default function ProfileSetup({ onSave }: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    const cleanName = displayName.trim();

    if (cleanName.length < 2) {
      setMessage("Введите имя минимум из 2 символов.");
      return;
    }

    setSaving(true);
    setMessage("");

    await onSave(cleanName);

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Добро пожаловать 👋</h1>

        <p className="mt-2 text-sm text-slate-500">
          Как вас зовут? Имя будет видно участникам вашей семьи.
        </p>

        <div className="mt-6 space-y-3">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            placeholder="Например: Адильхан"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-red-500">{message}</p>}
      </div>
    </main>
  );
}
