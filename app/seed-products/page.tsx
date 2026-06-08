"use client";

import { addDoc, collection, deleteDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

const products = [
  // Молочка
  { icon: "🥛", name: "Молоко", category: "Молочка", popular: true },
  { icon: "🥛", name: "Кефир", category: "Молочка", popular: true },
  { icon: "🥛", name: "Айран", category: "Молочка", popular: true },
  { icon: "🥛", name: "Тан", category: "Молочка", popular: false },
  { icon: "🥛", name: "Ряженка", category: "Молочка", popular: false },
  { icon: "🥛", name: "Сливки", category: "Молочка", popular: false },
  { icon: "🍦", name: "Йогурт", category: "Молочка", popular: true },
  { icon: "🍦", name: "Творог", category: "Молочка", popular: true },
  { icon: "🍦", name: "Сметана", category: "Молочка", popular: true },
  { icon: "🧀", name: "Сыр", category: "Молочка", popular: true },
  { icon: "🧀", name: "Плавленый сыр", category: "Молочка", popular: false },
  { icon: "🧀", name: "Сыр косичка", category: "Молочка", popular: false },
  { icon: "🧈", name: "Масло сливочное", category: "Молочка", popular: true },
  { icon: "🥚", name: "Яйца", category: "Молочка", popular: true },
  { icon: "🍦", name: "Мороженое", category: "Молочка", popular: false },
  { icon: "🧀", name: "Курт", category: "Молочка", popular: false },

  // Мясо и птица
  { icon: "🍗", name: "Курица", category: "Мясо", popular: true },
  { icon: "🍗", name: "Куриное филе", category: "Мясо", popular: true },
  { icon: "🍗", name: "Куриные бедра", category: "Мясо", popular: false },
  { icon: "🍗", name: "Куриные крылья", category: "Мясо", popular: false },
  { icon: "🥩", name: "Говядина", category: "Мясо", popular: true },
  { icon: "🥩", name: "Баранина", category: "Мясо", popular: false },
  { icon: "🥩", name: "Фарш", category: "Мясо", popular: true },
  { icon: "🥩", name: "Конина", category: "Мясо", popular: false },
  { icon: "🥩", name: "Казы", category: "Мясо", popular: false },
  { icon: "🥩", name: "Шужык", category: "Мясо", popular: false },
  { icon: "🌭", name: "Сосиски", category: "Мясо", popular: true },
  { icon: "🌭", name: "Колбаса", category: "Мясо", popular: false },
  { icon: "🥟", name: "Пельмени", category: "Мясо", popular: true },
  { icon: "🥟", name: "Манты", category: "Мясо", popular: false },

  // Рыба
  { icon: "🐟", name: "Рыба", category: "Рыба", popular: false },
  { icon: "🐟", name: "Семга", category: "Рыба", popular: false },
  { icon: "🐟", name: "Форель", category: "Рыба", popular: false },
  { icon: "🐟", name: "Скумбрия", category: "Рыба", popular: false },
  { icon: "🐟", name: "Сельдь", category: "Рыба", popular: false },
  { icon: "🐟", name: "Минтай", category: "Рыба", popular: false },
  { icon: "🐟", name: "Морской окунь", category: "Рыба", popular: false },
  { icon: "🦐", name: "Креветки", category: "Рыба", popular: false },
  { icon: "🐟", name: "Икра", category: "Рыба", popular: false },

  // Овощи
  { icon: "🥔", name: "Картофель", category: "Овощи", popular: true },
  { icon: "🧅", name: "Лук", category: "Овощи", popular: true },
  { icon: "🥕", name: "Морковь", category: "Овощи", popular: true },
  { icon: "🍅", name: "Помидоры", category: "Овощи", popular: true },
  { icon: "🥒", name: "Огурцы", category: "Овощи", popular: true },
  { icon: "🥬", name: "Капуста", category: "Овощи", popular: false },
  { icon: "🥬", name: "Пекинская капуста", category: "Овощи", popular: false },
  { icon: "🫑", name: "Перец", category: "Овощи", popular: false },
  { icon: "🌶️", name: "Острый перец", category: "Овощи", popular: false },
  { icon: "🥦", name: "Брокколи", category: "Овощи", popular: false },
  { icon: "🥬", name: "Салат", category: "Овощи", popular: false },
  { icon: "🧄", name: "Чеснок", category: "Овощи", popular: true },
  { icon: "🌿", name: "Укроп", category: "Овощи", popular: false },
  { icon: "🌿", name: "Петрушка", category: "Овощи", popular: false },
  { icon: "🌿", name: "Кинза", category: "Овощи", popular: false },
  { icon: "🍆", name: "Баклажан", category: "Овощи", popular: false },
  { icon: "🥒", name: "Кабачок", category: "Овощи", popular: false },
  { icon: "🌽", name: "Кукуруза", category: "Овощи", popular: false },
  { icon: "🍄", name: "Грибы", category: "Овощи", popular: false },

  // Фрукты
  { icon: "🍎", name: "Яблоки", category: "Фрукты", popular: true },
  { icon: "🍌", name: "Бананы", category: "Фрукты", popular: true },
  { icon: "🍊", name: "Апельсины", category: "Фрукты", popular: false },
  { icon: "🍊", name: "Мандарины", category: "Фрукты", popular: false },
  { icon: "🍋", name: "Лимон", category: "Фрукты", popular: true },
  { icon: "🍐", name: "Груши", category: "Фрукты", popular: false },
  { icon: "🍇", name: "Виноград", category: "Фрукты", popular: false },
  { icon: "🍓", name: "Клубника", category: "Фрукты", popular: false },
  { icon: "🍉", name: "Арбуз", category: "Фрукты", popular: false },
  { icon: "🍈", name: "Дыня", category: "Фрукты", popular: false },
  { icon: "🥝", name: "Киви", category: "Фрукты", popular: false },
  { icon: "🥭", name: "Манго", category: "Фрукты", popular: false },
  { icon: "🍍", name: "Ананас", category: "Фрукты", popular: false },

  // Бакалея
  { icon: "🍚", name: "Рис", category: "Бакалея", popular: true },
  { icon: "🍝", name: "Макароны", category: "Бакалея", popular: true },
  { icon: "🥣", name: "Гречка", category: "Бакалея", popular: true },
  { icon: "🥣", name: "Овсянка", category: "Бакалея", popular: false },
  { icon: "🥣", name: "Манка", category: "Бакалея", popular: false },
  { icon: "🥣", name: "Перловка", category: "Бакалея", popular: false },
  { icon: "🫘", name: "Фасоль", category: "Бакалея", popular: false },
  { icon: "🫘", name: "Горох", category: "Бакалея", popular: false },
  { icon: "🌾", name: "Мука", category: "Бакалея", popular: true },
  { icon: "🧂", name: "Соль", category: "Бакалея", popular: true },
  { icon: "🍬", name: "Сахар", category: "Бакалея", popular: true },
  { icon: "🫙", name: "Масло подсолнечное", category: "Бакалея", popular: true },
  { icon: "🫙", name: "Оливковое масло", category: "Бакалея", popular: false },
  { icon: "🍅", name: "Томатная паста", category: "Бакалея", popular: false },
  { icon: "🥫", name: "Консервы", category: "Бакалея", popular: false },
  { icon: "🥫", name: "Тушенка", category: "Бакалея", popular: false },
  { icon: "🥒", name: "Соленые огурцы", category: "Бакалея", popular: false },
  { icon: "🫙", name: "Майонез", category: "Бакалея", popular: true },
  { icon: "🫙", name: "Кетчуп", category: "Бакалея", popular: true },
  { icon: "🫙", name: "Соевый соус", category: "Бакалея", popular: false },

  // Хлеб и выпечка
  { icon: "🍞", name: "Хлеб", category: "Хлеб", popular: true },
  { icon: "🥖", name: "Батон", category: "Хлеб", popular: true },
  { icon: "🫓", name: "Лаваш", category: "Хлеб", popular: true },
  { icon: "🥐", name: "Булочки", category: "Хлеб", popular: false },
  { icon: "🥯", name: "Бублики", category: "Хлеб", popular: false },
  { icon: "🥟", name: "Самса", category: "Хлеб", popular: false },
  { icon: "🍞", name: "Баурсаки", category: "Хлеб", popular: false },

  // Напитки
  { icon: "💧", name: "Вода", category: "Напитки", popular: true },
  { icon: "🧃", name: "Сок", category: "Напитки", popular: true },
  { icon: "🥤", name: "Газировка", category: "Напитки", popular: false },
  { icon: "🫖", name: "Чай", category: "Напитки", popular: true },
  { icon: "☕", name: "Кофе", category: "Напитки", popular: true },
  { icon: "🍫", name: "Какао", category: "Напитки", popular: false },
  { icon: "⚡", name: "Энергетик", category: "Напитки", popular: false },
  { icon: "🧃", name: "Компот", category: "Напитки", popular: false },

  // Сладости и снеки
  { icon: "🍫", name: "Шоколад", category: "Сладости", popular: false },
  { icon: "🍪", name: "Печенье", category: "Сладости", popular: true },
  { icon: "🍬", name: "Конфеты", category: "Сладости", popular: false },
  { icon: "🍰", name: "Торт", category: "Сладости", popular: false },
  { icon: "🧁", name: "Кекс", category: "Сладости", popular: false },
  { icon: "🍩", name: "Пончики", category: "Сладости", popular: false },
  { icon: "🍯", name: "Мед", category: "Сладости", popular: false },
  { icon: "🥜", name: "Орехи", category: "Сладости", popular: false },
  { icon: "🍿", name: "Попкорн", category: "Сладости", popular: false },
  { icon: "🥨", name: "Чипсы", category: "Сладости", popular: false },
  { icon: "🥨", name: "Сухарики", category: "Сладости", popular: false },

  // Заморозка
  { icon: "🥟", name: "Вареники", category: "Заморозка", popular: false },
  { icon: "🥟", name: "Хинкали", category: "Заморозка", popular: false },
  { icon: "🍕", name: "Пицца замороженная", category: "Заморозка", popular: false },
  { icon: "🥦", name: "Овощная смесь", category: "Заморозка", popular: false },
  { icon: "🍟", name: "Картофель фри", category: "Заморозка", popular: false },

  // Детское
  { icon: "👶", name: "Детское пюре", category: "Детское", popular: false },
  { icon: "👶", name: "Детская каша", category: "Детское", popular: false },
  { icon: "🍼", name: "Детская смесь", category: "Детское", popular: false },
  { icon: "🧃", name: "Детский сок", category: "Детское", popular: false },
  { icon: "🍪", name: "Детское печенье", category: "Детское", popular: false },
  { icon: "🧷", name: "Подгузники", category: "Детское", popular: false },
  { icon: "🧻", name: "Влажные салфетки", category: "Детское", popular: true },

  // Бытовое
  { icon: "🧻", name: "Туалетная бумага", category: "Бытовое", popular: true },
  { icon: "🧻", name: "Бумажные полотенца", category: "Бытовое", popular: false },
  { icon: "🧼", name: "Мыло", category: "Бытовое", popular: true },
  { icon: "🧴", name: "Шампунь", category: "Бытовое", popular: true },
  { icon: "🧴", name: "Гель для душа", category: "Бытовое", popular: true },
  { icon: "🪥", name: "Зубная паста", category: "Бытовое", popular: true },
  { icon: "🪥", name: "Зубная щетка", category: "Бытовое", popular: false },
  { icon: "🧽", name: "Губки", category: "Бытовое", popular: true },
  { icon: "🧴", name: "Средство для посуды", category: "Бытовое", popular: true },
  { icon: "🧺", name: "Стиральный порошок", category: "Бытовое", popular: true },
  { icon: "🧴", name: "Кондиционер для белья", category: "Бытовое", popular: false },
  { icon: "🗑️", name: "Мусорные пакеты", category: "Бытовое", popular: true },
  { icon: "🧼", name: "Чистящее средство", category: "Бытовое", popular: false },
  { icon: "🧴", name: "Средство для стекол", category: "Бытовое", popular: false },
  { icon: "🧻", name: "Салфетки", category: "Бытовое", popular: false },
];

export default function SeedProductsPage() {
  async function seedProducts() {
    const snapshot = await getDocs(collection(db, "products"));

    for (const document of snapshot.docs) {
      await deleteDoc(doc(db, "products", document.id));
    }

    for (const product of products) {
      await addDoc(collection(db, "products"), product);
    }

    alert(`Каталог обновлен. Загружено товаров: ${products.length}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Каталог продуктов</h1>

        <p className="mt-3 text-sm text-slate-500">
          Нажми кнопку один раз. Старый каталог удалится, новый загрузится в Firebase.
        </p>

        <button
          onClick={seedProducts}
          className="mt-6 w-full rounded-2xl bg-green-500 px-4 py-3 font-medium text-white"
        >
          Обновить каталог продуктов
        </button>
      </div>
    </main>
  );
}