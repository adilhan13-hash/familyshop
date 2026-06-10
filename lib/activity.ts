import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type ActivityInput = {
  familyId: string;
  userId?: string;
  userName?: string;
  userPhoto?: string;
  type: string;
  title: string;
  message: string;
  emoji?: string;
  itemName?: string;
};

export async function addActivity(data: ActivityInput) {
  try {
    const currentUser = auth.currentUser;

    let realUserId = data.userId || "unknown";
    let realUserName = data.userName || "Без имени";
    let realUserPhoto = data.userPhoto || "";

    if (currentUser) {
      realUserId = currentUser.uid;

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));

      if (userSnap.exists()) {
        const userData = userSnap.data();

        realUserName = userData.displayName || "Без имени";
        realUserPhoto = userData.photoBase64 || "";
      }
    }

    const activityData = {
      familyId: data.familyId,
      userId: realUserId,
      userName: realUserName,
      userPhoto: realUserPhoto,
      type: data.type,
      title: data.title,
      message: data.message,
      emoji: data.emoji || "🏡",
      itemName: data.itemName || data.message,
      createdAt: new Date(),
    };

    console.log("ACTIVITY SAVE", activityData);

    await addDoc(
      collection(db, "families", data.familyId, "activity"),
      activityData
    );
  } catch (error) {
    console.error("ACTIVITY ERROR", error);
  }
}