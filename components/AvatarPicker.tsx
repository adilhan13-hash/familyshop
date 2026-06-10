"use client";

import { ChangeEvent, useEffect, useState } from "react";

type AvatarPickerProps = {
  currentPhoto?: string;
  userName?: string;
  onSave: (photoBase64: string) => Promise<void>;
};

function getInitials(name?: string) {
  const cleanName = (name || "").trim();

  if (!cleanName) return "👤";

  return cleanName.slice(0, 1).toUpperCase();
}

async function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const size = 400;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Не удалось обработать фото."));
          return;
        }

        const side = Math.min(image.width, image.height);
        const startX = (image.width - side) / 2;
        const startY = (image.height - side) / 2;

        canvas.width = size;
        canvas.height = size;

        context.drawImage(image, startX, startY, side, side, 0, 0, size, size);

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      image.onerror = () => reject(new Error("Не удалось загрузить фото."));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

export default function AvatarPicker({
  currentPhoto,
  userName,
  onSave,
}: AvatarPickerProps) {
  const [preview, setPreview] = useState(currentPhoto || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreview(currentPhoto || "");
  }, [currentPhoto]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");

    if (!file.type.startsWith("image/")) {
      setMessage("Выберите изображение.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Фото слишком большое. Выберите файл до 8 МБ.");
      return;
    }

    try {
      setSaving(true);

      const photoBase64 = await resizeAvatar(file);

      setPreview(photoBase64);
      await onSave(photoBase64);
      setMessage("Аватар обновлён.");
    } catch (error) {
      console.error(error);
      setMessage("Не удалось сохранить фото.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-3xl font-bold text-slate-500">
        {preview ? (
          <img
            src={preview}
            alt="Аватар"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitials(userName)}</span>
        )}
      </div>

      <div className="flex-1">
        <label className="inline-flex cursor-pointer rounded-2xl bg-green-500 px-4 py-3 text-sm font-medium text-white">
          {saving ? "Сохраняю..." : "Изменить фото"}
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={saving}
          />
        </label>

        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
      </div>
    </div>
  );
}
