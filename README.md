# FamilyShop Home Activity v1

## Что внутри

- components/BottomNav.tsx
- app/home/page.tsx
- lib/activity.ts

## Что появится

- новая вкладка 🏡 Дом
- лента последних действий
- быстрые карточки: покупки, холодильник, AI, желания
- helper addActivity для будущего логирования

## Важно

В этом ZIP создана лента и база для логирования.
Чтобы реальные действия начали появляться в ленте, нужно следующим шагом добавить вызовы addActivity в страницы:
- app/shopping/page.tsx
- app/fridge/page.tsx
- app/wish/page.tsx
- app/ai/page.tsx

Пример:

import { addActivity } from "../../lib/activity";

await addActivity({
  familyId,
  userId: user.uid,
  userName: appUser?.displayName || "Пользователь",
  userPhoto: appUser?.photoBase64 || "",
  type: "shopping_add",
  title: "Добавил в покупки",
  message: "Молоко",
  emoji: "🛒",
  itemName: "Молоко",
});
