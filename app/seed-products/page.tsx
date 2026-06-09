"use client";

import { addDoc, collection, deleteDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

const products = [
  // Молочка
  { icon: "🥛", name: "Молоко", category: "Молочка", popular: true, type: "food" },
  { icon: "🥛", name: "Кефир", category: "Молочка", popular: true, type: "food" },
  { icon: "🥛", name: "Айран", category: "Молочка", popular: true, type: "food" },
  { icon: "🥛", name: "Тан", category: "Молочка", popular: false, type: "food" },
  { icon: "🥛", name: "Ряженка", category: "Молочка", popular: false, type: "food" },
  { icon: "🥛", name: "Сливки", category: "Молочка", popular: false, type: "food" },
  { icon: "🍦", name: "Йогурт", category: "Молочка", popular: true, type: "food" },
  { icon: "🍦", name: "Творог", category: "Молочка", popular: true, type: "food" },
  { icon: "🍦", name: "Сметана", category: "Молочка", popular: true, type: "food" },
  { icon: "🧀", name: "Сыр", category: "Молочка", popular: true, type: "food" },
  { icon: "🧀", name: "Плавленый сыр", category: "Молочка", popular: false, type: "food" },
  { icon: "🧀", name: "Сыр косичка", category: "Молочка", popular: false, type: "food" },
  { icon: "🧈", name: "Масло сливочное", category: "Молочка", popular: true, type: "food" },
  { icon: "🥚", name: "Яйца", category: "Молочка", popular: true, type: "food" },
  { icon: "🍦", name: "Мороженое", category: "Молочка", popular: false, type: "food" },
  { icon: "🧀", name: "Курт", category: "Молочка", popular: false, type: "food" },

  // Мясо и птица
  { icon: "🍗", name: "Курица", category: "Мясо", popular: true, type: "food" },
  { icon: "🍗", name: "Куриное филе", category: "Мясо", popular: true, type: "food" },
  { icon: "🍗", name: "Куриные бедра", category: "Мясо", popular: false, type: "food" },
  { icon: "🍗", name: "Куриные крылья", category: "Мясо", popular: false, type: "food" },
  { icon: "🍗", name: "Индейка", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Говядина", category: "Мясо", popular: true, type: "food" },
  { icon: "🥩", name: "Гуляш говяжий", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Баранина", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Свинина", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Ребрышки", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Фарш", category: "Мясо", popular: true, type: "food" },
  { icon: "🥩", name: "Конина", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Казы", category: "Мясо", popular: false, type: "food" },
  { icon: "🥩", name: "Шужык", category: "Мясо", popular: false, type: "food" },
  { icon: "🌭", name: "Сосиски", category: "Мясо", popular: true, type: "food" },
  { icon: "🌭", name: "Колбаса", category: "Мясо", popular: false, type: "food" },
  { icon: "🥟", name: "Пельмени", category: "Мясо", popular: true, type: "food" },
  { icon: "🥟", name: "Манты", category: "Мясо", popular: false, type: "food" },

  // Рыба
  { icon: "🐟", name: "Рыба", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Семга", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Форель", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Скумбрия", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Сельдь", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Минтай", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Морской окунь", category: "Рыба", popular: false, type: "food" },
  { icon: "🦐", name: "Креветки", category: "Рыба", popular: false, type: "food" },
  { icon: "🐟", name: "Икра", category: "Рыба", popular: false, type: "food" },

  // Овощи
  { icon: "🥔", name: "Картофель", category: "Овощи", popular: true, type: "food" },
  { icon: "🧅", name: "Лук", category: "Овощи", popular: true, type: "food" },
  { icon: "🧅", name: "Зеленый лук", category: "Овощи", popular: false, type: "food" },
  { icon: "🥕", name: "Морковь", category: "Овощи", popular: true, type: "food" },
  { icon: "🍅", name: "Помидоры", category: "Овощи", popular: true, type: "food" },
  { icon: "🥒", name: "Огурцы", category: "Овощи", popular: true, type: "food" },
  { icon: "🥬", name: "Капуста", category: "Овощи", popular: false, type: "food" },
  { icon: "🥬", name: "Пекинская капуста", category: "Овощи", popular: false, type: "food" },
  { icon: "🫑", name: "Сладкий перец", category: "Овощи", popular: false, type: "food" },
  { icon: "🌶️", name: "Острый перец", category: "Овощи", popular: false, type: "food" },
  { icon: "🥦", name: "Брокколи", category: "Овощи", popular: false, type: "food" },
  { icon: "🥬", name: "Салат", category: "Овощи", popular: false, type: "food" },
  { icon: "🥬", name: "Шпинат", category: "Овощи", popular: false, type: "food" },
  { icon: "🧄", name: "Чеснок", category: "Овощи", popular: true, type: "food" },
  { icon: "🌿", name: "Укроп", category: "Овощи", popular: false, type: "food" },
  { icon: "🌿", name: "Петрушка", category: "Овощи", popular: false, type: "food" },
  { icon: "🌿", name: "Кинза", category: "Овощи", popular: false, type: "food" },
  { icon: "🍆", name: "Баклажан", category: "Овощи", popular: false, type: "food" },
  { icon: "🥒", name: "Кабачок", category: "Овощи", popular: false, type: "food" },
  { icon: "🌽", name: "Кукуруза", category: "Овощи", popular: false, type: "food" },
  { icon: "🍄", name: "Грибы", category: "Овощи", popular: false, type: "food" },
  { icon: "🫛", name: "Зеленый горошек", category: "Овощи", popular: false, type: "food" },
  { icon: "🫒", name: "Маслины", category: "Овощи", popular: false, type: "food" },
  { icon: "🫒", name: "Оливки", category: "Овощи", popular: false, type: "food" },

  // Фрукты
  { icon: "🍎", name: "Яблоки", category: "Фрукты", popular: true, type: "food" },
  { icon: "🍌", name: "Бананы", category: "Фрукты", popular: true, type: "food" },
  { icon: "🍊", name: "Апельсины", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍊", name: "Мандарины", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍋", name: "Лимон", category: "Фрукты", popular: true, type: "food" },
  { icon: "🍐", name: "Груши", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍇", name: "Виноград", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍓", name: "Клубника", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍉", name: "Арбуз", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍈", name: "Дыня", category: "Фрукты", popular: false, type: "food" },
  { icon: "🥝", name: "Киви", category: "Фрукты", popular: false, type: "food" },
  { icon: "🥭", name: "Манго", category: "Фрукты", popular: false, type: "food" },
  { icon: "🍍", name: "Ананас", category: "Фрукты", popular: false, type: "food" },

  // Бакалея
  { icon: "🍚", name: "Рис", category: "Бакалея", popular: true, type: "food" },
  { icon: "🍝", name: "Макароны", category: "Бакалея", popular: true, type: "food" },
  { icon: "🍝", name: "Спагетти", category: "Бакалея", popular: false, type: "food" },
  { icon: "🍜", name: "Вермишель", category: "Бакалея", popular: false, type: "food" },
  { icon: "🍜", name: "Лапша", category: "Бакалея", popular: false, type: "food" },
  { icon: "🥣", name: "Гречка", category: "Бакалея", popular: true, type: "food" },
  { icon: "🥣", name: "Овсянка", category: "Бакалея", popular: false, type: "food" },
  { icon: "🥣", name: "Манка", category: "Бакалея", popular: false, type: "food" },
  { icon: "🥣", name: "Перловка", category: "Бакалея", popular: false, type: "food" },
  { icon: "🍚", name: "Булгур", category: "Бакалея", popular: false, type: "food" },
  { icon: "🍚", name: "Кускус", category: "Бакалея", popular: false, type: "food" },
  { icon: "🍚", name: "Пшено", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫘", name: "Фасоль", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫘", name: "Горох", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫘", name: "Чечевица", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫘", name: "Нут", category: "Бакалея", popular: false, type: "food" },
  { icon: "🌾", name: "Мука", category: "Бакалея", popular: true, type: "food" },
  { icon: "🧂", name: "Соль", category: "Бакалея", popular: true, type: "food" },
  { icon: "🍬", name: "Сахар", category: "Бакалея", popular: true, type: "food" },
  { icon: "🫙", name: "Масло подсолнечное", category: "Бакалея", popular: true, type: "food" },
  { icon: "🫙", name: "Оливковое масло", category: "Бакалея", popular: false, type: "food" },
  { icon: "🍅", name: "Томатная паста", category: "Бакалея", popular: false, type: "food" },
  { icon: "🥫", name: "Консервы", category: "Бакалея", popular: false, type: "food" },
  { icon: "🥫", name: "Тушенка", category: "Бакалея", popular: false, type: "food" },
  { icon: "🥒", name: "Соленые огурцы", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫙", name: "Майонез", category: "Бакалея", popular: true, type: "food" },
  { icon: "🫙", name: "Кетчуп", category: "Бакалея", popular: true, type: "food" },
  { icon: "🫙", name: "Соевый соус", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫙", name: "Горчица", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫙", name: "Уксус", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫙", name: "Терияки", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫙", name: "Чесночный соус", category: "Бакалея", popular: false, type: "food" },
  { icon: "🫙", name: "Сметанный соус", category: "Бакалея", popular: false, type: "food" },

  // Специи
  { icon: "🧂", name: "Черный перец", category: "Специи", popular: true, type: "food" },
  { icon: "🧂", name: "Красный перец", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Паприка", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Зира", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Приправа для плова", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Лавровый лист", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Куркума", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Орегано", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Базилик", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Хмели-сунели", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Карри", category: "Специи", popular: false, type: "food" },
  { icon: "🧂", name: "Кориандр", category: "Специи", popular: false, type: "food" },

  // Хлеб и выпечка
  { icon: "🍞", name: "Хлеб", category: "Хлеб", popular: true, type: "food" },
  { icon: "🥖", name: "Батон", category: "Хлеб", popular: true, type: "food" },
  { icon: "🫓", name: "Лаваш", category: "Хлеб", popular: true, type: "food" },
  { icon: "🥐", name: "Булочки", category: "Хлеб", popular: false, type: "food" },
  { icon: "🥯", name: "Бублики", category: "Хлеб", popular: false, type: "food" },
  { icon: "🥟", name: "Самса", category: "Хлеб", popular: false, type: "food" },
  { icon: "🍞", name: "Баурсаки", category: "Хлеб", popular: false, type: "food" },
  { icon: "🥟", name: "Тесто", category: "Хлеб", popular: false, type: "food" },
  { icon: "🍞", name: "Дрожжи", category: "Хлеб", popular: false, type: "food" },
  { icon: "🧁", name: "Разрыхлитель", category: "Хлеб", popular: false, type: "food" },

  // Напитки
  { icon: "💧", name: "Вода", category: "Напитки", popular: true, type: "food" },
  { icon: "🧃", name: "Сок", category: "Напитки", popular: true, type: "food" },
  { icon: "🥤", name: "Газировка", category: "Напитки", popular: false, type: "food" },
  { icon: "🫖", name: "Чай", category: "Напитки", popular: true, type: "food" },
  { icon: "☕", name: "Кофе", category: "Напитки", popular: true, type: "food" },
  { icon: "🍫", name: "Какао", category: "Напитки", popular: false, type: "food" },
  { icon: "⚡", name: "Энергетик", category: "Напитки", popular: false, type: "food" },
  { icon: "🧃", name: "Компот", category: "Напитки", popular: false, type: "food" },

  // Сладости и снеки
  { icon: "🍫", name: "Шоколад", category: "Сладости", popular: false, type: "food" },
  { icon: "🍪", name: "Печенье", category: "Сладости", popular: true, type: "food" },
  { icon: "🍬", name: "Конфеты", category: "Сладости", popular: false, type: "food" },
  { icon: "🍰", name: "Торт", category: "Сладости", popular: false, type: "food" },
  { icon: "🧁", name: "Кекс", category: "Сладости", popular: false, type: "food" },
  { icon: "🍩", name: "Пончики", category: "Сладости", popular: false, type: "food" },
  { icon: "🍯", name: "Мед", category: "Сладости", popular: false, type: "food" },
  { icon: "🥜", name: "Орехи", category: "Сладости", popular: false, type: "food" },
  { icon: "🍿", name: "Попкорн", category: "Сладости", popular: false, type: "food" },
  { icon: "🥨", name: "Чипсы", category: "Сладости", popular: false, type: "food" },
  { icon: "🥨", name: "Сухарики", category: "Сладости", popular: false, type: "food" },
  { icon: "🍫", name: "Какао порошок", category: "Сладости", popular: false, type: "food" },
  { icon: "🍇", name: "Изюм", category: "Сладости", popular: false, type: "food" },
  { icon: "🥥", name: "Кокосовая стружка", category: "Сладости", popular: false, type: "food" },

  // Заморозка
  { icon: "🥟", name: "Вареники", category: "Заморозка", popular: false, type: "food" },
  { icon: "🥟", name: "Хинкали", category: "Заморозка", popular: false, type: "food" },
  { icon: "🍕", name: "Пицца замороженная", category: "Заморозка", popular: false, type: "food" },
  { icon: "🥦", name: "Овощная смесь", category: "Заморозка", popular: false, type: "food" },
  { icon: "🍟", name: "Картофель фри", category: "Заморозка", popular: false, type: "food" },

  // Детское
  { icon: "👶", name: "Детское пюре", category: "Детское", popular: false, type: "food" },
  { icon: "👶", name: "Детская каша", category: "Детское", popular: false, type: "food" },
  { icon: "🍼", name: "Детская смесь", category: "Детское", popular: false, type: "food" },
  { icon: "🧃", name: "Детский сок", category: "Детское", popular: false, type: "food" },
  { icon: "🍪", name: "Детское печенье", category: "Детское", popular: false, type: "food" },
  { icon: "🧷", name: "Подгузники", category: "Детское", popular: false, type: "household" },
  { icon: "🧻", name: "Влажные салфетки", category: "Детское", popular: true, type: "household" },

  // Бытовое
  { icon: "🧻", name: "Туалетная бумага", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧻", name: "Бумажные полотенца", category: "Бытовое", popular: false, type: "household" },
  { icon: "🧼", name: "Мыло", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧴", name: "Шампунь", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧴", name: "Гель для душа", category: "Бытовое", popular: true, type: "household" },
  { icon: "🪥", name: "Зубная паста", category: "Бытовое", popular: true, type: "household" },
  { icon: "🪥", name: "Зубная щетка", category: "Бытовое", popular: false, type: "household" },
  { icon: "🧽", name: "Губки", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧴", name: "Средство для посуды", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧺", name: "Стиральный порошок", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧴", name: "Кондиционер для белья", category: "Бытовое", popular: false, type: "household" },
  { icon: "🗑️", name: "Мусорные пакеты", category: "Бытовое", popular: true, type: "household" },
  { icon: "🧼", name: "Чистящее средство", category: "Бытовое", popular: false, type: "household" },
  { icon: "🧴", name: "Средство для стекол", category: "Бытовое", popular: false, type: "household" },
  { icon: "🧻", name: "Салфетки", category: "Бытовое", popular: false, type: "household" },
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
