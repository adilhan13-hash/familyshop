"use client";

import { useEffect, useState } from "react";
import BottomNav from "../../components/BottomNav";
import { auth, db } from "../../lib/firebase";
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

type FamilyData = {
  ownerUid: string;
  ownerPhone: string;
  allowedPhones: string[];
};

const familyId = "main";

export default function FamilyPage() {
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [newPhone, setNewPhone] = useState("+7");
  const [message, setMessage] = useState("");

  const currentUser = auth.currentUser;
  const currentPhone = currentUser?.phoneNumber || "";
  const isOwner = currentUser?.uid === family?.ownerUid;

  useEffect(() => {
    const familyRef = doc(db, "families", familyId);

    const unsubscribe = onSnapshot(familyRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      setFamily({
        ownerUid: data.ownerUid || "",
        ownerPhone: data.ownerPhone || "",
        allowedPhones: data.allowedPhones || [],
      });
    });

    return () => unsubscribe();
  }, []);

  async function addMember() {
    setMessage("");

    const phone = newPhone.trim();

    if (!phone.startsWith("+7") || phone.length < 12) {
      setMessage("Введите номер в формате +77001234567");
      return;
    }

    const familyRef = doc(db, "families", familyId);

    await updateDoc(familyRef, {
      allowedPhones: arrayUnion(phone),
    });

    setNewPhone("+7");
    setMessage("Участник добавлен.");
  }

  async function removeMember(phone: string) {
    if (phone === family?.ownerPhone) {
      setMessage("Нельзя удалить владельца семьи.");
      return;
    }

    const familyRef = doc(db, "families", familyId);

    await updateDoc(familyRef, {
      allowedPhones: arrayRemove(phone),
    });

    setMessage("Участник удалён.");
  }

  async function logout() {
    await signOut(auth);
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
            <h2 className="text-lg font-semibold">Мой номер</h2>

            <p className="mt-2 text-slate-600">
              {currentPhone || "Номер не найден"}
            </p>

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
                {family?.allowedPhones?.length || 0}
              </span>
            </div>

            {!family ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : (
              <div className="space-y-3">
                {family.allowedPhones.map((phone) => (
                  <div
                    key={phone}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <div className="font-medium">{phone}</div>

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
                ))}
              </div>
            )}
          </div>

          {isOwner && (
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">
                Пригласить супругу
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

              {message && (
                <p className="mt-3 text-sm text-green-600">{message}</p>
              )}
            </div>
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