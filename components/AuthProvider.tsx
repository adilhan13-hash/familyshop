"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  ApplicationVerifier,
  ConfirmationResult,
  User,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import ProfileSetup from "./ProfileSetup";

type AuthProviderProps = {
  children: ReactNode;
};

type FamilyShopUser = {
  uid: string;
  phone: string;
  familyId: string;
  displayName?: string;
};

type AuthContextType = {
  user: User | null;
  appUser: FamilyShopUser | null;
  familyId: string | null;
  logout: () => Promise<void>;
};

declare global {
  interface Window {
    recaptchaVerifier?: ApplicationVerifier;
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  familyId: null,
  logout: async () => {},
});

export function useFamilyAuth() {
  return useContext(AuthContext);
}

function createFamilyId() {
  return `family_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<FamilyShopUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const preparedUser = await prepareUser(currentUser);
        setAppUser(preparedUser);
      } else {
        setAppUser(null);
      }

      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  async function prepareUser(currentUser: User) {
    const phoneNumber = currentUser.phoneNumber || "";
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();

      return {
        uid: currentUser.uid,
        phone: data.phone || phoneNumber,
        familyId: data.familyId,
        displayName: data.displayName || "",
      };
    }

    const oldFamilyQuery = query(
      collection(db, "families"),
      where("allowedPhones", "array-contains", phoneNumber),
      limit(1)
    );

    const oldFamilySnapshot = await getDocs(oldFamilyQuery);

    if (!oldFamilySnapshot.empty) {
      const oldFamily = oldFamilySnapshot.docs[0];
      const oldFamilyId = oldFamily.id;

      await setDoc(userRef, {
        phone: phoneNumber,
        familyId: oldFamilyId,
        displayName: "",
        createdAt: new Date(),
      });

      return {
        uid: currentUser.uid,
        phone: phoneNumber,
        familyId: oldFamilyId,
        displayName: "",
      };
    }

    const familyId = createFamilyId();
    const familyRef = doc(db, "families", familyId);

    await setDoc(familyRef, {
      ownerUid: currentUser.uid,
      ownerPhone: phoneNumber,
      members: [phoneNumber],
      allowedPhones: [phoneNumber],
      createdAt: new Date(),
    });

    await setDoc(userRef, {
      phone: phoneNumber,
      familyId,
      displayName: "",
      createdAt: new Date(),
    });

    return {
      uid: currentUser.uid,
      phone: phoneNumber,
      familyId,
      displayName: "",
    };
  }

  async function saveDisplayName(displayName: string) {
    if (!user || !appUser) return;

    const cleanName = displayName.trim();

    if (!cleanName) return;

    await updateDoc(doc(db, "users", user.uid), {
      displayName: cleanName,
    });

    setAppUser({
      ...appUser,
      displayName: cleanName,
    });
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

      const result = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );

      setConfirmation(result);
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

      if (!confirmation) {
        setMessage("Сначала отправь SMS-код.");
        return;
      }

      await confirmation.confirm(code);
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
    setConfirmation(null);
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

  if (!user || !appUser) {
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

  if (!appUser.displayName) {
    return <ProfileSetup onSave={saveDisplayName} />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        familyId: appUser.familyId,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
