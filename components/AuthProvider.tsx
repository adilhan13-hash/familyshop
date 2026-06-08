"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  ApplicationVerifier,
  ConfirmationResult,
  User,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type AuthProviderProps = {
  children: ReactNode;
};

declare global {
  interface Window {
    recaptchaVerifier?: ApplicationVerifier;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
    };
  }
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [message, setMessage] = useState("");

  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await checkFamilyAccess(currentUser);
      } else {
        setHasAccess(false);
      }

      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  async function checkFamilyAccess(currentUser: User) {
    const familyRef = doc(db, "families", "main");
    const familySnap = await getDoc(familyRef);

    const userPhone = currentUser.phoneNumber || "";

    if (!familySnap.exists()) {
      await setDoc(familyRef, {
        ownerUid: currentUser.uid,
        ownerPhone: userPhone,
        allowedPhones: [userPhone],
        createdAt: new Date(),
      });

      setHasAccess(true);
      return;
    }

    const family = familySnap.data();
    const allowedPhones: string[] = family.allowedPhones || [];

    if (family.ownerUid === currentUser.uid || allowedPhones.includes(userPhone)) {
      setHasAccess(true);
    } else {
      setHasAccess(false);
    }
  }

  async function sendCode() {
    try {
      setMessage("");

      const { RecaptchaVerifier } = await import("firebase/auth");

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          {
            size: "invisible",
          }
        );
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );

      confirmationRef.current = confirmation;
      setStep("code");
      setMessage("SMS-код отправлен.");
    } catch (error) {
      console.error(error);
      setMessage("Не удалось отправить SMS. Проверь номер и попробуй ещё раз.");
    }
  }

  async function confirmCode() {
    try {
      setMessage("");

      if (!confirmationRef.current) {
        setMessage("Сначала отправь SMS-код.");
        return;
      }

      await confirmationRef.current.confirm(code);
      setMessage("Вход выполнен.");
    } catch (error) {
      console.error(error);
      setMessage("Неверный код. Попробуй ещё раз.");
    }
  }

  async function logout() {
    await signOut(auth);
    setStep("phone");
    setCode("");
    setMessage("");
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          Загрузка...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">FamilyShop 🛒</h1>

          <p className="mt-2 text-sm text-slate-500">
            Войдите по номеру телефона, чтобы открыть семейное приложение.
          </p>

          {step === "phone" && (
            <div className="mt-6 space-y-3">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                placeholder="+77001234567"
              />

              <button
                onClick={sendCode}
                className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
              >
                Получить SMS-код
              </button>
            </div>
          )}

          {step === "code" && (
            <div className="mt-6 space-y-3">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                placeholder="Код из SMS"
              />

              <button
                onClick={confirmCode}
                className="w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
              >
                Войти
              </button>

              <button
                onClick={() => setStep("phone")}
                className="w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
              >
                Изменить номер
              </button>
            </div>
          )}

          {message && <p className="mt-4 text-sm text-slate-500">{message}</p>}

          <div id="recaptcha-container" />
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Доступ закрыт</h1>

          <p className="mt-2 text-sm text-slate-500">
            Этот номер пока не добавлен в семью FamilyShop.
          </p>

          <button
            onClick={logout}
            className="mt-6 w-full rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-700"
          >
            Выйти
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}