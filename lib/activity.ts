import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

type ActivityInput = {
  familyId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type:
    | "shopping_add"
    | "shopping_buy"
    | "shopping_delete"
    | "fridge_add"
    | "fridge_delete"
    | "wish_add"
    | "wish_delete"
    | "ai_start_cooking"
    | "ai_finish_cooking"
    | "family_join"
    | "family_invite";
  title: string;
  message: string;
  emoji?: string;
  itemName?: string;
};

export async function addActivity({
  familyId,
  userId,
  userName,
  userPhoto = "",
  type,
  title,
  message,
  emoji = "🏡",
  itemName = "",
}: ActivityInput) {
  if (!familyId || !userId) return;

  await addDoc(collection(db, "families", familyId, "activity"), {
    familyId,
    userId,
    userName: userName || "Пользователь",
    userPhoto,
    type,
    title,
    message,
    emoji,
    itemName,
    createdAt: new Date(),
  });
}
