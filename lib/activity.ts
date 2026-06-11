import { addDoc, collection } from "firebase/firestore";
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

    const realUserId = data.userId || currentUser?.uid || "unknown";
    const realUserName =
      data.userName ||
      currentUser?.displayName ||
      currentUser?.email ||
      "Без имени";

    const realUserPhoto =
      data.userPhoto ||
      currentUser?.photoURL ||
      "";

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

    await addDoc(
      collection(db, "families", data.familyId, "activity"),
      activityData
    );
  } catch (error) {
    console.error("ACTIVITY ERROR", error);
  }
}