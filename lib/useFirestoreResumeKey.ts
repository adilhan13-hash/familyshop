"use client";

import { useEffect, useState } from "react";
import { enableNetwork } from "firebase/firestore";
import { db } from "./firebase";

export function useFirestoreResumeKey() {
  const [resumeKey, setResumeKey] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function wakeFirestore() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void enableNetwork(db).catch((error) => {
        console.warn("Firestore wake warning", error);
      });

      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        setResumeKey((key) => key + 1);
      }, 150);
    }

    window.addEventListener("online", wakeFirestore);
    window.addEventListener("focus", wakeFirestore);
    document.addEventListener("visibilitychange", wakeFirestore);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", wakeFirestore);
      window.removeEventListener("focus", wakeFirestore);
      document.removeEventListener("visibilitychange", wakeFirestore);
    };
  }, []);

  return resumeKey;
}
