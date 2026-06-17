"use client";

import { useEffect } from "react";
import { enableNetwork } from "firebase/firestore";
import { db } from "./firebase";

export function useFirestoreResumeKey() {
  useEffect(() => {
    function wakeFirestore() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void enableNetwork(db).catch((error) => {
        console.warn("Firestore wake warning", error);
      });
    }

    window.addEventListener("online", wakeFirestore);
    window.addEventListener("focus", wakeFirestore);
    document.addEventListener("visibilitychange", wakeFirestore);

    return () => {
      window.removeEventListener("online", wakeFirestore);
      window.removeEventListener("focus", wakeFirestore);
      document.removeEventListener("visibilitychange", wakeFirestore);
    };
  }, []);

  return 0;
}
