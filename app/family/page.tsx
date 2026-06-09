"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

type FamilyData = {
  ownerUid: string;
  ownerPhone: string;
  members: string[];
};

type FamilyMemberProfile = {
  id: string;
  phone: string;
  displayName: string;
};

export default function FamilyPage() {
  const { user, appUser, familyId, logout } = useFamilyAuth();

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [profiles, setProfiles] = useState<FamilyMemberProfile[]>([]);
  const [newPhone, setNewPhone] = useState("+7");
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const currentPhone = appUser?.phone || user?.phoneNumber || "";
  const isOwner = Boolean(user?.uid && family?.ownerUid === user.uid);

  useEffect(() => {
    if (!familyId) return;

    const familyRef = doc(db, "families", familyId);

    const unsubscribe = onSnapshot(familyRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      setFamily({
        ownerUid: data.ownerUid || "",
        ownerPhone: data.ownerPhone || "",
        members: data.members || data.allowedPhones || [],
      });
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const usersQuery = query(
      collection(db, "users"),
      where("familyId", "==", familyId)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const items: FamilyMemberProfile[] = [];

      snapshot.forEach((document) => {
        const data = document.data();

        items.push({
          id: document.id,
          phone: data.phone || "",
          displayName: data.displayName || "",
        });
      });

      setProfiles(items);
    });

    return () => unsubscribe();
  }, [familyId]);

  const profileByPhone = useMemo(() => {
    const map = new Map<string, FamilyMemberProfile>();

    profiles.forEach((profile) => {
      if (profile.phone) {
        map.set(profile.phone, profile);
      }
    });

    return map;
  }, [profiles]);

  function createInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "FS-";

    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }

  async function createInvite() {
    if (!user || !familyId || !isOwner) return;

    setMessage("");
    setInviteLink("");
    setCreatingInvite(true);

    const code = createInviteCode();

    await setDoc(doc(db, "invites", code), {
      code,
      familyId,
      createdBy: user.uid,
      createdByPhone: currentPhone,
      createdByName: appUser?.displayName || "",
      used: false,
      usedBy: "",
      createdAt: new Date(),
    });

    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://familyshop-kz.netlify.app";

    setInviteLink(`${origin}/invite/${code}`);
    setMessage("Одноразовая ссылка приглашения создана.");
    setCreatingInvite(false);
  }

  async function copyInviteLink() {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
    setMessage("Ссылка скопирована.");
  }

  async function addMember() {
    if (!familyId) return;

    setMessage("");

    const phone = newPhone.trim();

    if (!phone.startsWith("+7") || phone.length < 12) {
      setMessage("Введите номер в формате +77001234567");
      return;
    }

    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      setMessage("Семья не найдена.");
      return;
    }

    await updateDoc(familyRef, {
      members: arrayUnion(phone),
      allowedPhones: arrayUnion(phone),
    });

    setNewPhone("+7");
    setMessage("Участник добавлен. Теперь он может войти по SMS.");
  }

  async function removeMember(phone: string) {
    if (!familyId) return;

    if (phone === family?.ownerPhone) {
      setMessage("Нельзя удалить владельца семьи.");
      return;
    }

    const familyRef = doc(db, "families", familyId);

    await updateDoc(familyRef, {
      members: arrayRemove(phone),
      allowedPhones: arrayRemove(phone),
    });

    setMessage("Участник удалён.");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <header className="px-5 pt-8 pb-4">
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Семья 👨‍👩‍👧</h1>
        </header>

        <section className="px-5 space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Мой профиль</h2>

            <p className="mt-2 text-xl font-semibold">
              {appUser?.displayName || "Имя не указано"}
            </p>

            <p className="mt-1 text-slate-600">
              {currentPhone || "Номер не найден"}
            </p>

            {familyId && (
              <p className="mt-2 text-xs text-slate-400">
                ID семьи: {familyId}
              </p>
            )}

            {isOwner ? (
              <p className="mt-2 text-sm text-green-600">
                Вы владелец семьи
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Вы участник семьи
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Участники</h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {family?.members?.length || 0}
              </span>
            </div>

            {!family ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : (
              <div className="space-y-3">
                {family.members.map((phone) => {
                  const profile = profileByPhone.get(phone);

                  return (
                    <div
                      key={phone}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <div className="font-medium">
                          {profile?.displayName || "Пока не вошёл"}
                        </div>

                        <div className="text-sm text-slate-500">{phone}</div>

                        {phone === family.ownerPhone && (
                          <div className="text-xs text-green-600">
                            Владелец
                          </div>
                        )}
                      </div>

                      {isOwner && phone !== family.ownerPhone && (
                        <button
                          onClick={() => removeMember(phone)}
                          className="text-sm text-red-500"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isOwner && (
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Пригласить по ссылке
              </h2>

              <button
                onClick={createInvite}
                disabled={creatingInvite}
                className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white disabled:opacity-60"
              >
                {creatingInvite ? "Создаём..." : "Создать одноразовую ссылку"}
              </button>

              {inviteLink && (
                <div className="mt-4 space-y-3">
                  <div className="break-all rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                    {inviteLink}
                  </div>

                  <button
                    onClick={copyInviteLink}
                    className="w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
                  >
                    Скопировать ссылку
                  </button>
                </div>
              )}

              <p className="mt-3 text-sm text-slate-500">
                Ссылка сработает только один раз. После использования она
                станет недействительной.
              </p>
            </div>
          )}

          {isOwner && (
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Добавить участника по номеру
              </h2>

              <div className="space-y-3">
                <input
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  placeholder="+77001234567"
                />

                <button
                  onClick={addMember}
                  className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
                >
                  Добавить участника
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                После добавления этот номер сможет войти через SMS и увидеть
                общие покупки, холодильник и Wish List.
              </p>
            </div>
          )}

          {message && (
            <p className="rounded-2xl bg-white p-4 text-sm text-green-600 shadow-sm">
              {message}
            </p>
          )}

          <button
            onClick={logout}
            className="w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
          >
            Выйти из аккаунта
          </button>
        </section>

        <BottomNav current="family" />
      </div>
    </main>
  );
}
