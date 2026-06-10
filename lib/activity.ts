import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export type ActivityInput = {
  familyId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type: string;
  title: string;
  message: string;
  emoji?: string;
  itemName?: string;
};

export async function addActivity(data: ActivityInput) {
  console.log("ACTIVITY START", data);

  try {
    const result = await addDoc(
      collection(db, "families", data.familyId, "activity"),
      {
        ...data,
        createdAt: new Date(),
      }
    );

    console.log("ACTIVITY OK", result.id);
  } catch (error) {
    console.error("ACTIVITY ERROR", error);
  }
}