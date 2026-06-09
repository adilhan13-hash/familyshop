"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFamilyAuth } from "../../../components/AuthProvider";
import { db } from "../../../lib/firebase";
import {
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

type InviteData = {
  code: string;
  familyId: string;
  createdBy: string;
  createdByPhone: string;
  createdByName: string;
  used: boolean;
  usedBy: string;
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, appUser } = useFamilyAuth();

  const code = String(params.code || "");

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadInvite() {
      setLoading(true);

      const inviteRef = doc(db, "invites", code);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        setInvite(null);
        setLoading(false);
        return;
      }

      const data = inviteSnap.data();

      setInvite({
        code: data.code || code,
        familyId: data.familyId || "",
        createdBy: data.createdBy || "",
        createdByPhone: data.createdByPhone || "",
        createdByName: data.createdByName || "",
        used: Boolean(data.used),
        usedBy: data.usedBy || "",
      });

      setLoading(false);
    }

    if (code) {
      loadInvite();
    }
  }, [code]);

  async function joinFamily() {
    if (!user || !appUser || !invite) return;

    setJoining(true);
    setMessage("");

    const inviteRef = doc(db, "invites", code);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      setMessage("Приглашение не найдено.");
      setJoining(false);
      return;
    }

    const currentInvite = inviteSnap.data();

    if (currentInvite.used) {
      setMessage("Это приглашение уже использовано.");
      setJoining(false);
      return;
    }

    const targetFamilyId = currentInvite.familyId;
    const userPhone = appUser.phone || user.phoneNumber || "";

    await updateDoc(doc(db, "users", user.uid), {
      familyId: targetFamilyId,
    });

    await updateDoc(doc(db, "families", targetFamilyId), {
      members: arrayUnion(userPhone),
      allowedPhones: arrayUnion(userPhone),
    });

    await updateDoc(inviteRef, {
      used: true,
      usedBy: user.uid,
      usedByPhone: userPhone,
      usedAt: new Date(),
    });

    setMessage("Вы присоединились к семье. Сейчас откроем приложение.");

    setTimeout(() => {
      window.location.href = "/shopping";
    }, 1200);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          Загрузка приглашения...
        </div>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Приглашение не найдено</h1>

          <p className="mt-2 text-sm text-slate-500">
            Возможно, ссылка введена неправильно.
          </p>

          <button
            onClick={() => router.push("/shopping")}
            className="mt-6 w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
          >
            Перейти в приложение
          </button>
        </div>
      </main>
    );
  }

  if (invite.used) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Ссылка уже использована</h1>

          <p className="mt-2 text-sm text-slate-500">
            Одноразовое приглашение больше недействительно.
          </p>

          <button
            onClick={() => router.push("/shopping")}
            className="mt-6 w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
          >
            Перейти в приложение
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Приглашение 👨‍👩‍👧</h1>

        <p className="mt-3 text-sm text-slate-500">
          Вас приглашают присоединиться к семье в FamilyShop.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Пригласил</p>

          <p className="mt-1 font-semibold">
            {invite.createdByName || invite.createdByPhone || "Владелец семьи"}
          </p>
        </div>

        <button
          onClick={joinFamily}
          disabled={joining}
          className="mt-6 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {joining ? "Подключаем..." : "Присоединиться к семье"}
        </button>

        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      </div>
    </main>
  );
}
