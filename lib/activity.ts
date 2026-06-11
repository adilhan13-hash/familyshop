import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
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

async function getUserPhotoFromUsers(userId: string) {
  try {
    if (!userId || userId === "unknown") return "";

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return "";

    const data = userSnap.data();

    return (
      data.photoURL ||
      data.userPhoto ||
      data.photoBase64 ||
      data.avatarUrl ||
      data.avatar ||
      ""
    );
  } catch (error) {
    console.error("PHOTO LOAD ERROR", error);
    return "";
  }
}

export async function addActivity(data: ActivityInput) {
  try {
    const currentUser = auth.currentUser;

    const realUserId =
      data.userId ||
      currentUser?.uid ||
      "unknown";

    const realUserName =
      data.userName ||
      currentUser?.displayName ||
      currentUser?.email ||
      "Без имени";

    const photoFromUsers =
      await getUserPhotoFromUsers(realUserId);

    const realUserPhoto =
      data.userPhoto ||
      currentUser?.photoURL ||
      photoFromUsers ||
      "";

    await addDoc(
      collection(
        db,
        "families",
        data.familyId,
        "activity"
      ),
      {
        familyId: data.familyId,

        userId: realUserId,
        userName: realUserName,
        userPhoto: realUserPhoto,

        type: data.type,
        title: data.title,
        message: data.message,

        emoji: data.emoji || "🏡",
        itemName: data.itemName || data.message,

        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("ACTIVITY ERROR", error);
  }
}