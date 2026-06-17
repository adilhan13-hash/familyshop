"use client";

import { useEffect } from "react";
import { enableNetwork } from "firebase/firestore";
import { db } from "./firebase";

export function useFirestoreResumeKey() {
  useEffect(() => {
    let wakeTimer: ReturnType<typeof setTimeout> | null = null;

    function wakeFirestore() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      if (wakeTimer) {
        clearTimeout(wakeTimer);
      }

      wakeTimer = setTimeout(() => {
        void enableNetwork(db).catch((error) => {
          console.warn("Firestore wake warning", error);
        });
      }, 500);
    }

    window.addEventListener("online", wakeFirestore);
    window.addEventListener("focus", wakeFirestore);
    document.addEventListener("visibilitychange", wakeFirestore);

    return () => {
      if (wakeTimer) {
        clearTimeout(wakeTimer);
      }

      window.removeEventListener("online", wakeFirestore);
      window.removeEventListener("focus", wakeFirestore);
      document.removeEventListener("visibilitychange", wakeFirestore);
    };
  }, []);

  return 0;
}