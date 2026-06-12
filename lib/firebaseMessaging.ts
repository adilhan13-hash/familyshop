import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app, db } from "./firebase";

const VAPID_KEY =
  "BGt5Rv2q2z-7kniVYy4rti1i3Nt_7hwfXny6uN6IQCNSdvQnX6SRe1xpLr1TEpHz1YSQ3ecOGjaTa_1j4p07rwo";

export async function enablePushNotifications(userId: string) {
  try {
    if (typeof window === "undefined") {
      return { ok: false, message: "Браузер недоступен" };
    }

    const supported = await isSupported();

    if (!supported) {
      return {
        ok: false,
        message: "Этот браузер не поддерживает push-уведомления",
      };
    }

    if (!("Notification" in window)) {
      return {
        ok: false,
        message: "Уведомления недоступны на этом устройстве",
      };
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return {
        ok: false,
        message: "Разрешение на уведомления не выдано",
      };
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return {
        ok: false,
        message: "Не удалось получить push token",
      };
    }

    await setDoc(
      doc(db, "users", userId),
      {
        pushToken: token,
        pushEnabled: true,
        pushUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      ok: true,
      message: "Уведомления включены",
      token,
    };
  } catch (error) {
    console.error("Push notification error:", error);

    return {
      ok: false,
      message: "Ошибка при включении уведомлений",
    };
  }
}