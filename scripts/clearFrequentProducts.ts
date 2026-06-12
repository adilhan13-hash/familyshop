import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

async function clearFrequentProducts() {
  const familyId = "family_i9f3193k";

  const snapshot = await getDocs(
    collection(db, "families", familyId, "frequentProducts")
  );

  console.log(`Найдено: ${snapshot.size}`);

  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
    console.log(`Удалён: ${docSnap.id}`);
  }

  console.log("Готово");
}

clearFrequentProducts().catch(console.error);