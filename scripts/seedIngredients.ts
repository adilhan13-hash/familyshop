import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

type Ingredient = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  icon: string;
  popular: boolean;
  recipeIngredient: boolean;
  fridgeAllowed: boolean;
  shoppingAllowed: boolean;
  search: string[];
};

const ingredients: Ingredient[] = [
  {
    "id": "beef",
    "name": "Говядина",
    "aliases": [
      "говяжье мясо"
    ],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "beef",
      "говядина",
      "говяжье мясо"
    ]
  },
  {
    "id": "telyatina",
    "name": "Телятина",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "telyatina",
      "телятина"
    ]
  },
  {
    "id": "baranina",
    "name": "Баранина",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "baranina",
      "баранина"
    ]
  },
  {
    "id": "horse_meat",
    "name": "Конина",
    "aliases": [
      "казы мясо"
    ],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "horse_meat",
      "казы мясо",
      "конина"
    ]
  },
  {
    "id": "svinina",
    "name": "Свинина",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "svinina",
      "свинина"
    ]
  },
  {
    "id": "chicken",
    "name": "Курица",
    "aliases": [
      "куриное мясо"
    ],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chicken",
      "куриное мясо",
      "курица"
    ]
  },
  {
    "id": "kurinoe_file",
    "name": "Куриное филе",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurinoe_file",
      "куриное филе"
    ]
  },
  {
    "id": "kurinye_bedra",
    "name": "Куриные бедра",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurinye_bedra",
      "куриные бедра"
    ]
  },
  {
    "id": "kurinaya_grudka",
    "name": "Куриная грудка",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurinaya_grudka",
      "куриная грудка"
    ]
  },
  {
    "id": "kurinye_krylya",
    "name": "Куриные крылья",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurinye_krylya",
      "куриные крылья"
    ]
  },
  {
    "id": "kurinaya_golen",
    "name": "Куриная голень",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurinaya_golen",
      "куриная голень"
    ]
  },
  {
    "id": "indeyka",
    "name": "Индейка",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "indeyka",
      "индейка"
    ]
  },
  {
    "id": "utka",
    "name": "Утка",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "utka",
      "утка"
    ]
  },
  {
    "id": "gus",
    "name": "Гусь",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "gus",
      "гусь"
    ]
  },
  {
    "id": "farsh_govyazhiy",
    "name": "Фарш говяжий",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "farsh_govyazhiy",
      "фарш говяжий"
    ]
  },
  {
    "id": "farsh_kurinyy",
    "name": "Фарш куриный",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "farsh_kurinyy",
      "фарш куриный"
    ]
  },
  {
    "id": "minced_meat",
    "name": "Фарш домашний",
    "aliases": [
      "фарш",
      "мясной фарш"
    ],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "minced_meat",
      "мясной фарш",
      "фарш",
      "фарш домашний"
    ]
  },
  {
    "id": "farsh_baraniy",
    "name": "Фарш бараний",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "farsh_baraniy",
      "фарш бараний"
    ]
  },
  {
    "id": "pechen_govyazhya",
    "name": "Печень говяжья",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pechen_govyazhya",
      "печень говяжья"
    ]
  },
  {
    "id": "pechen_kurinaya",
    "name": "Печень куриная",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pechen_kurinaya",
      "печень куриная"
    ]
  },
  {
    "id": "serdechki_kurinye",
    "name": "Сердечки куриные",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "serdechki_kurinye",
      "сердечки куриные"
    ]
  },
  {
    "id": "zheludki_kurinye",
    "name": "Желудки куриные",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zheludki_kurinye",
      "желудки куриные"
    ]
  },
  {
    "id": "rebra_govyazhi",
    "name": "Ребра говяжьи",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rebra_govyazhi",
      "ребра говяжьи"
    ]
  },
  {
    "id": "rebra_svinye",
    "name": "Ребра свиные",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rebra_svinye",
      "ребра свиные"
    ]
  },
  {
    "id": "steyk",
    "name": "Стейк",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "steyk",
      "стейк"
    ]
  },
  {
    "id": "antrekot",
    "name": "Антрекот",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "antrekot",
      "антрекот"
    ]
  },
  {
    "id": "kolbasa_varenaya",
    "name": "Колбаса вареная",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kolbasa_varenaya",
      "колбаса вареная"
    ]
  },
  {
    "id": "kolbasa_kopchenaya",
    "name": "Колбаса копченая",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kolbasa_kopchenaya",
      "колбаса копченая"
    ]
  },
  {
    "id": "sosiski",
    "name": "Сосиски",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sosiski",
      "сосиски"
    ]
  },
  {
    "id": "sardelki",
    "name": "Сардельки",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sardelki",
      "сардельки"
    ]
  },
  {
    "id": "vetchina",
    "name": "Ветчина",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vetchina",
      "ветчина"
    ]
  },
  {
    "id": "bekon",
    "name": "Бекон",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bekon",
      "бекон"
    ]
  },
  {
    "id": "kazy",
    "name": "Казы",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kazy",
      "казы"
    ]
  },
  {
    "id": "shuzhuk",
    "name": "Шужук",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shuzhuk",
      "шужук"
    ]
  },
  {
    "id": "pelmeni",
    "name": "Пельмени",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pelmeni",
      "пельмени"
    ]
  },
  {
    "id": "manty",
    "name": "Манты",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "manty",
      "манты"
    ]
  },
  {
    "id": "naggetsy",
    "name": "Наггетсы",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "naggetsy",
      "наггетсы"
    ]
  },
  {
    "id": "kotlety_polufabrikat",
    "name": "Котлеты полуфабрикат",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kotlety_polufabrikat",
      "котлеты полуфабрикат"
    ]
  },
  {
    "id": "shashlyk_marinovannyy",
    "name": "Шашлык маринованный",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shashlyk_marinovannyy",
      "шашлык маринованный"
    ]
  },
  {
    "id": "tushenka",
    "name": "Тушенка",
    "aliases": [],
    "category": "Мясо и птица",
    "icon": "🥩",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tushenka",
      "тушенка"
    ]
  },
  {
    "id": "salmon",
    "name": "Лосось",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "salmon",
      "лосось"
    ]
  },
  {
    "id": "semga",
    "name": "Семга",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "semga",
      "семга"
    ]
  },
  {
    "id": "forel",
    "name": "Форель",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "forel",
      "форель"
    ]
  },
  {
    "id": "mackerel",
    "name": "Скумбрия",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mackerel",
      "скумбрия"
    ]
  },
  {
    "id": "seld",
    "name": "Сельдь",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "seld",
      "сельдь"
    ]
  },
  {
    "id": "mintay",
    "name": "Минтай",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mintay",
      "минтай"
    ]
  },
  {
    "id": "hek",
    "name": "Хек",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hek",
      "хек"
    ]
  },
  {
    "id": "treska",
    "name": "Треска",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "treska",
      "треска"
    ]
  },
  {
    "id": "sudak",
    "name": "Судак",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sudak",
      "судак"
    ]
  },
  {
    "id": "karp",
    "name": "Карп",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "karp",
      "карп"
    ]
  },
  {
    "id": "karas",
    "name": "Карась",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "karas",
      "карась"
    ]
  },
  {
    "id": "schuka",
    "name": "Щука",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "schuka",
      "щука"
    ]
  },
  {
    "id": "tunec",
    "name": "Тунец",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tunec",
      "тунец"
    ]
  },
  {
    "id": "sayra",
    "name": "Сайра",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sayra",
      "сайра"
    ]
  },
  {
    "id": "kilka",
    "name": "Килька",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kilka",
      "килька"
    ]
  },
  {
    "id": "gorbusha",
    "name": "Горбуша",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "gorbusha",
      "горбуша"
    ]
  },
  {
    "id": "ikra",
    "name": "Икра",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ikra",
      "икра"
    ]
  },
  {
    "id": "shrimp",
    "name": "Креветки",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shrimp",
      "креветки"
    ]
  },
  {
    "id": "kalmary",
    "name": "Кальмары",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kalmary",
      "кальмары"
    ]
  },
  {
    "id": "midii",
    "name": "Мидии",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "midii",
      "мидии"
    ]
  },
  {
    "id": "krabovye_palochki",
    "name": "Крабовые палочки",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "krabovye_palochki",
      "крабовые палочки"
    ]
  },
  {
    "id": "morskoy_kokteyl",
    "name": "Морской коктейль",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "morskoy_kokteyl",
      "морской коктейль"
    ]
  },
  {
    "id": "rybnye_palochki",
    "name": "Рыбные палочки",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rybnye_palochki",
      "рыбные палочки"
    ]
  },
  {
    "id": "file_ryby",
    "name": "Филе рыбы",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "file_ryby",
      "филе рыбы"
    ]
  },
  {
    "id": "ryba_kopchenaya",
    "name": "Рыба копченая",
    "aliases": [],
    "category": "Рыба и морепродукты",
    "icon": "🐟",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ryba_kopchenaya",
      "рыба копченая"
    ]
  },
  {
    "id": "potato",
    "name": "Картофель",
    "aliases": [
      "картошка",
      "молодой картофель"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "potato",
      "картофель",
      "картошка",
      "молодой картофель"
    ]
  },
  {
    "id": "onion",
    "name": "Лук",
    "aliases": [
      "лук репчатый"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "onion",
      "лук",
      "лук репчатый"
    ]
  },
  {
    "id": "luk_krasnyy",
    "name": "Лук красный",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "luk_krasnyy",
      "лук красный"
    ]
  },
  {
    "id": "luk_zelenyy",
    "name": "Лук зеленый",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "luk_zelenyy",
      "лук зеленый"
    ]
  },
  {
    "id": "carrot",
    "name": "Морковь",
    "aliases": [
      "морковка"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "carrot",
      "морковка",
      "морковь"
    ]
  },
  {
    "id": "kapusta_belokochannaya",
    "name": "Капуста белокочанная",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kapusta_belokochannaya",
      "капуста белокочанная"
    ]
  },
  {
    "id": "kapusta_pekinskaya",
    "name": "Капуста пекинская",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kapusta_pekinskaya",
      "капуста пекинская"
    ]
  },
  {
    "id": "kapusta_krasnaya",
    "name": "Капуста красная",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kapusta_krasnaya",
      "капуста красная"
    ]
  },
  {
    "id": "kapusta_cvetnaya",
    "name": "Капуста цветная",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kapusta_cvetnaya",
      "капуста цветная"
    ]
  },
  {
    "id": "brokkoli",
    "name": "Брокколи",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "brokkoli",
      "брокколи"
    ]
  },
  {
    "id": "tomato",
    "name": "Помидор",
    "aliases": [
      "томат",
      "помидоры"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tomato",
      "помидор",
      "помидоры",
      "томат"
    ]
  },
  {
    "id": "pomidory_cherri",
    "name": "Помидоры черри",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pomidory_cherri",
      "помидоры черри"
    ]
  },
  {
    "id": "cucumber",
    "name": "Огурец",
    "aliases": [
      "огурцы"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "cucumber",
      "огурец",
      "огурцы"
    ]
  },
  {
    "id": "pepper",
    "name": "Болгарский перец",
    "aliases": [
      "перец сладкий"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pepper",
      "болгарский перец",
      "перец сладкий"
    ]
  },
  {
    "id": "ostryy_perec",
    "name": "Острый перец",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ostryy_perec",
      "острый перец"
    ]
  },
  {
    "id": "zucchini",
    "name": "Кабачок",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zucchini",
      "кабачок"
    ]
  },
  {
    "id": "baklazhan",
    "name": "Баклажан",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "baklazhan",
      "баклажан"
    ]
  },
  {
    "id": "tykva",
    "name": "Тыква",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tykva",
      "тыква"
    ]
  },
  {
    "id": "beet",
    "name": "Свекла",
    "aliases": [
      "свёкла"
    ],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "beet",
      "свекла",
      "свёкла"
    ]
  },
  {
    "id": "redis",
    "name": "Редис",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "redis",
      "редис"
    ]
  },
  {
    "id": "redka",
    "name": "Редька",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "redka",
      "редька"
    ]
  },
  {
    "id": "daykon",
    "name": "Дайкон",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "daykon",
      "дайкон"
    ]
  },
  {
    "id": "garlic",
    "name": "Чеснок",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "garlic",
      "чеснок"
    ]
  },
  {
    "id": "imbir",
    "name": "Имбирь",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "imbir",
      "имбирь"
    ]
  },
  {
    "id": "shampinony",
    "name": "Шампиньоны",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shampinony",
      "шампиньоны"
    ]
  },
  {
    "id": "veshenki",
    "name": "Вешенки",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "veshenki",
      "вешенки"
    ]
  },
  {
    "id": "griby_lesnye",
    "name": "Грибы лесные",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "griby_lesnye",
      "грибы лесные"
    ]
  },
  {
    "id": "kukuruza",
    "name": "Кукуруза",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kukuruza",
      "кукуруза"
    ]
  },
  {
    "id": "goroshek_zelenyy",
    "name": "Горошек зеленый",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "goroshek_zelenyy",
      "горошек зеленый"
    ]
  },
  {
    "id": "fasol_struchkovaya",
    "name": "Фасоль стручковая",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "fasol_struchkovaya",
      "фасоль стручковая"
    ]
  },
  {
    "id": "sparzha",
    "name": "Спаржа",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sparzha",
      "спаржа"
    ]
  },
  {
    "id": "selderey",
    "name": "Сельдерей",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "selderey",
      "сельдерей"
    ]
  },
  {
    "id": "shpinat",
    "name": "Шпинат",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shpinat",
      "шпинат"
    ]
  },
  {
    "id": "schavel",
    "name": "Щавель",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "schavel",
      "щавель"
    ]
  },
  {
    "id": "salat_listovoy",
    "name": "Салат листовой",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "salat_listovoy",
      "салат листовой"
    ]
  },
  {
    "id": "aysberg",
    "name": "Айсберг",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "aysberg",
      "айсберг"
    ]
  },
  {
    "id": "rukkola",
    "name": "Руккола",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rukkola",
      "руккола"
    ]
  },
  {
    "id": "ukrop",
    "name": "Укроп",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ukrop",
      "укроп"
    ]
  },
  {
    "id": "petrushka",
    "name": "Петрушка",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "petrushka",
      "петрушка"
    ]
  },
  {
    "id": "kinza",
    "name": "Кинза",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kinza",
      "кинза"
    ]
  },
  {
    "id": "bazilik_svezhiy",
    "name": "Базилик свежий",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bazilik_svezhiy",
      "базилик свежий"
    ]
  },
  {
    "id": "myata",
    "name": "Мята",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "myata",
      "мята"
    ]
  },
  {
    "id": "zelen",
    "name": "Зелень",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zelen",
      "зелень"
    ]
  },
  {
    "id": "avokado",
    "name": "Авокадо",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "avokado",
      "авокадо"
    ]
  },
  {
    "id": "olivki",
    "name": "Оливки",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "olivki",
      "оливки"
    ]
  },
  {
    "id": "masliny",
    "name": "Маслины",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "masliny",
      "маслины"
    ]
  },
  {
    "id": "hren",
    "name": "Хрен",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hren",
      "хрен"
    ]
  },
  {
    "id": "kvashenaya_kapusta",
    "name": "Квашеная капуста",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kvashenaya_kapusta",
      "квашеная капуста"
    ]
  },
  {
    "id": "solenye_ogurcy",
    "name": "Соленые огурцы",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "solenye_ogurcy",
      "соленые огурцы"
    ]
  },
  {
    "id": "marinovannye_pomidory",
    "name": "Маринованные помидоры",
    "aliases": [],
    "category": "Овощи",
    "icon": "🥔",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "marinovannye_pomidory",
      "маринованные помидоры"
    ]
  },
  {
    "id": "apple",
    "name": "Яблоко",
    "aliases": [
      "яблоки"
    ],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "apple",
      "яблоки",
      "яблоко"
    ]
  },
  {
    "id": "grusha",
    "name": "Груша",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "grusha",
      "груша"
    ]
  },
  {
    "id": "banana",
    "name": "Банан",
    "aliases": [
      "бананы"
    ],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "banana",
      "банан",
      "бананы"
    ]
  },
  {
    "id": "orange",
    "name": "Апельсин",
    "aliases": [
      "апельсины"
    ],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "orange",
      "апельсин",
      "апельсины"
    ]
  },
  {
    "id": "mandarin",
    "name": "Мандарин",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mandarin",
      "мандарин"
    ]
  },
  {
    "id": "lemon",
    "name": "Лимон",
    "aliases": [
      "лимоны"
    ],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lemon",
      "лимон",
      "лимоны"
    ]
  },
  {
    "id": "laym",
    "name": "Лайм",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "laym",
      "лайм"
    ]
  },
  {
    "id": "greypfrut",
    "name": "Грейпфрут",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "greypfrut",
      "грейпфрут"
    ]
  },
  {
    "id": "vinograd",
    "name": "Виноград",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vinograd",
      "виноград"
    ]
  },
  {
    "id": "kivi",
    "name": "Киви",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kivi",
      "киви"
    ]
  },
  {
    "id": "mango",
    "name": "Манго",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mango",
      "манго"
    ]
  },
  {
    "id": "ananas",
    "name": "Ананас",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ananas",
      "ананас"
    ]
  },
  {
    "id": "persik",
    "name": "Персик",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "persik",
      "персик"
    ]
  },
  {
    "id": "nektarin",
    "name": "Нектарин",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "nektarin",
      "нектарин"
    ]
  },
  {
    "id": "abrikos",
    "name": "Абрикос",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "abrikos",
      "абрикос"
    ]
  },
  {
    "id": "sliva",
    "name": "Слива",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sliva",
      "слива"
    ]
  },
  {
    "id": "hurma",
    "name": "Хурма",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hurma",
      "хурма"
    ]
  },
  {
    "id": "granat",
    "name": "Гранат",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "granat",
      "гранат"
    ]
  },
  {
    "id": "arbuz",
    "name": "Арбуз",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "arbuz",
      "арбуз"
    ]
  },
  {
    "id": "dynya",
    "name": "Дыня",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "dynya",
      "дыня"
    ]
  },
  {
    "id": "klubnika",
    "name": "Клубника",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "klubnika",
      "клубника"
    ]
  },
  {
    "id": "malina",
    "name": "Малина",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "malina",
      "малина"
    ]
  },
  {
    "id": "chernika",
    "name": "Черника",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chernika",
      "черника"
    ]
  },
  {
    "id": "golubika",
    "name": "Голубика",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "golubika",
      "голубика"
    ]
  },
  {
    "id": "smorodina",
    "name": "Смородина",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "smorodina",
      "смородина"
    ]
  },
  {
    "id": "vishnya",
    "name": "Вишня",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vishnya",
      "вишня"
    ]
  },
  {
    "id": "chereshnya",
    "name": "Черешня",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chereshnya",
      "черешня"
    ]
  },
  {
    "id": "klyukva",
    "name": "Клюква",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "klyukva",
      "клюква"
    ]
  },
  {
    "id": "brusnika",
    "name": "Брусника",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "brusnika",
      "брусника"
    ]
  },
  {
    "id": "ezhevika",
    "name": "Ежевика",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ezhevika",
      "ежевика"
    ]
  },
  {
    "id": "finiki",
    "name": "Финики",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "finiki",
      "финики"
    ]
  },
  {
    "id": "izyum",
    "name": "Изюм",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "izyum",
      "изюм"
    ]
  },
  {
    "id": "kuraga",
    "name": "Курага",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kuraga",
      "курага"
    ]
  },
  {
    "id": "chernosliv",
    "name": "Чернослив",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chernosliv",
      "чернослив"
    ]
  },
  {
    "id": "orehovaya_smes",
    "name": "Ореховая смесь",
    "aliases": [],
    "category": "Фрукты и ягоды",
    "icon": "🍎",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "orehovaya_smes",
      "ореховая смесь"
    ]
  },
  {
    "id": "milk",
    "name": "Молоко",
    "aliases": [
      "молоко 2.5",
      "молоко 3.2"
    ],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "milk",
      "молоко",
      "молоко 2.5",
      "молоко 3.2"
    ]
  },
  {
    "id": "kefir",
    "name": "Кефир",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kefir",
      "кефир"
    ]
  },
  {
    "id": "ryazhenka",
    "name": "Ряженка",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ryazhenka",
      "ряженка"
    ]
  },
  {
    "id": "ayran",
    "name": "Айран",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ayran",
      "айран"
    ]
  },
  {
    "id": "yogurt",
    "name": "Йогурт",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "yogurt",
      "йогурт"
    ]
  },
  {
    "id": "yogurt_pitevoy",
    "name": "Йогурт питьевой",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "yogurt_pitevoy",
      "йогурт питьевой"
    ]
  },
  {
    "id": "sour_cream",
    "name": "Сметана",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sour_cream",
      "сметана"
    ]
  },
  {
    "id": "slivki",
    "name": "Сливки",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "slivki",
      "сливки"
    ]
  },
  {
    "id": "tvorog",
    "name": "Творог",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tvorog",
      "творог"
    ]
  },
  {
    "id": "tvorozhok_detskiy",
    "name": "Творожок детский",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tvorozhok_detskiy",
      "творожок детский"
    ]
  },
  {
    "id": "butter",
    "name": "Сливочное масло",
    "aliases": [
      "масло сливочное"
    ],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "butter",
      "масло сливочное",
      "сливочное масло"
    ]
  },
  {
    "id": "cheese",
    "name": "Сыр",
    "aliases": [
      "твердый сыр"
    ],
    "category": "Молочка",
    "icon": "🥛",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "cheese",
      "сыр",
      "твердый сыр"
    ]
  },
  {
    "id": "syr_rossiyskiy",
    "name": "Сыр российский",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syr_rossiyskiy",
      "сыр российский"
    ]
  },
  {
    "id": "syr_gauda",
    "name": "Сыр гауда",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syr_gauda",
      "сыр гауда"
    ]
  },
  {
    "id": "syr_mocarella",
    "name": "Сыр моцарелла",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syr_mocarella",
      "сыр моцарелла"
    ]
  },
  {
    "id": "syr_parmezan",
    "name": "Сыр пармезан",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syr_parmezan",
      "сыр пармезан"
    ]
  },
  {
    "id": "syr_plavlenyy",
    "name": "Сыр плавленый",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syr_plavlenyy",
      "сыр плавленый"
    ]
  },
  {
    "id": "brynza",
    "name": "Брынза",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "brynza",
      "брынза"
    ]
  },
  {
    "id": "suluguni",
    "name": "Сулугуни",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "suluguni",
      "сулугуни"
    ]
  },
  {
    "id": "syr_kosichka",
    "name": "Сыр косичка",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syr_kosichka",
      "сыр косичка"
    ]
  },
  {
    "id": "morozhenoe",
    "name": "Мороженое",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "morozhenoe",
      "мороженое"
    ]
  },
  {
    "id": "sguschennoe_moloko",
    "name": "Сгущенное молоко",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sguschennoe_moloko",
      "сгущенное молоко"
    ]
  },
  {
    "id": "katyk",
    "name": "Катык",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "katyk",
      "катык"
    ]
  },
  {
    "id": "kurt",
    "name": "Курт",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurt",
      "курт"
    ]
  },
  {
    "id": "margarin",
    "name": "Маргарин",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "margarin",
      "маргарин"
    ]
  },
  {
    "id": "slivochnyy_syr",
    "name": "Сливочный сыр",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "slivochnyy_syr",
      "сливочный сыр"
    ]
  },
  {
    "id": "maskarpone",
    "name": "Маскарпоне",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "maskarpone",
      "маскарпоне"
    ]
  },
  {
    "id": "syrki_glazirovannye",
    "name": "Сырки глазированные",
    "aliases": [],
    "category": "Молочка",
    "icon": "🥛",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syrki_glazirovannye",
      "сырки глазированные"
    ]
  },
  {
    "id": "egg",
    "name": "Яйца",
    "aliases": [
      "яйцо",
      "куриные яйца"
    ],
    "category": "Яйца",
    "icon": "🥚",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "egg",
      "куриные яйца",
      "яйца",
      "яйцо"
    ]
  },
  {
    "id": "perepelinye_yayca",
    "name": "Перепелиные яйца",
    "aliases": [],
    "category": "Яйца",
    "icon": "🥚",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "perepelinye_yayca",
      "перепелиные яйца"
    ]
  },
  {
    "id": "rice",
    "name": "Рис",
    "aliases": [
      "рисовая крупа"
    ],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rice",
      "рис",
      "рисовая крупа"
    ]
  },
  {
    "id": "buckwheat",
    "name": "Гречка",
    "aliases": [
      "гречневая крупа"
    ],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "buckwheat",
      "гречка",
      "гречневая крупа"
    ]
  },
  {
    "id": "perlovka",
    "name": "Перловка",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "perlovka",
      "перловка"
    ]
  },
  {
    "id": "bulgur",
    "name": "Булгур",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bulgur",
      "булгур"
    ]
  },
  {
    "id": "kuskus",
    "name": "Кускус",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kuskus",
      "кускус"
    ]
  },
  {
    "id": "oatmeal",
    "name": "Овсянка",
    "aliases": [
      "овсяные хлопья"
    ],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "oatmeal",
      "овсянка",
      "овсяные хлопья"
    ]
  },
  {
    "id": "manka",
    "name": "Манка",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "manka",
      "манка"
    ]
  },
  {
    "id": "psheno",
    "name": "Пшено",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "psheno",
      "пшено"
    ]
  },
  {
    "id": "kukuruznaya_krupa",
    "name": "Кукурузная крупа",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kukuruznaya_krupa",
      "кукурузная крупа"
    ]
  },
  {
    "id": "goroh",
    "name": "Горох",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "goroh",
      "горох"
    ]
  },
  {
    "id": "fasol",
    "name": "Фасоль",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "fasol",
      "фасоль"
    ]
  },
  {
    "id": "chechevica",
    "name": "Чечевица",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chechevica",
      "чечевица"
    ]
  },
  {
    "id": "nut",
    "name": "Нут",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "nut",
      "нут"
    ]
  },
  {
    "id": "pasta",
    "name": "Макароны",
    "aliases": [
      "паста"
    ],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pasta",
      "макароны",
      "паста"
    ]
  },
  {
    "id": "spagetti",
    "name": "Спагетти",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "spagetti",
      "спагетти"
    ]
  },
  {
    "id": "lapsha",
    "name": "Лапша",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lapsha",
      "лапша"
    ]
  },
  {
    "id": "vermishel",
    "name": "Вермишель",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vermishel",
      "вермишель"
    ]
  },
  {
    "id": "lazanya_listy",
    "name": "Лазанья листы",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lazanya_listy",
      "лазанья листы"
    ]
  },
  {
    "id": "flour",
    "name": "Мука",
    "aliases": [
      "пшеничная мука"
    ],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "flour",
      "мука",
      "пшеничная мука"
    ]
  },
  {
    "id": "krahmal",
    "name": "Крахмал",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "krahmal",
      "крахмал"
    ]
  },
  {
    "id": "panirovochnye_suhari",
    "name": "Панировочные сухари",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "panirovochnye_suhari",
      "панировочные сухари"
    ]
  },
  {
    "id": "suhari",
    "name": "Сухари",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "suhari",
      "сухари"
    ]
  },
  {
    "id": "hlopya_kukuruznye",
    "name": "Хлопья кукурузные",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hlopya_kukuruznye",
      "хлопья кукурузные"
    ]
  },
  {
    "id": "myusli",
    "name": "Мюсли",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "myusli",
      "мюсли"
    ]
  },
  {
    "id": "granola",
    "name": "Гранола",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "granola",
      "гранола"
    ]
  },
  {
    "id": "testo_sloenoe",
    "name": "Тесто слоеное",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "testo_sloenoe",
      "тесто слоеное"
    ]
  },
  {
    "id": "testo_drozhzhevoe",
    "name": "Тесто дрожжевое",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "testo_drozhzhevoe",
      "тесто дрожжевое"
    ]
  },
  {
    "id": "drozhzhi",
    "name": "Дрожжи",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "drozhzhi",
      "дрожжи"
    ]
  },
  {
    "id": "razryhlitel",
    "name": "Разрыхлитель",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "razryhlitel",
      "разрыхлитель"
    ]
  },
  {
    "id": "vanilin",
    "name": "Ванилин",
    "aliases": [],
    "category": "Крупы и макароны",
    "icon": "🌾",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vanilin",
      "ванилин"
    ]
  },
  {
    "id": "bread",
    "name": "Хлеб",
    "aliases": [
      "батон",
      "булка"
    ],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bread",
      "батон",
      "булка",
      "хлеб"
    ]
  },
  {
    "id": "hleb_belyy",
    "name": "Хлеб белый",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hleb_belyy",
      "хлеб белый"
    ]
  },
  {
    "id": "hleb_chernyy",
    "name": "Хлеб черный",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hleb_chernyy",
      "хлеб черный"
    ]
  },
  {
    "id": "baton",
    "name": "Батон",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "baton",
      "батон"
    ]
  },
  {
    "id": "lavash",
    "name": "Лаваш",
    "aliases": [
      "тонкий лаваш"
    ],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lavash",
      "лаваш",
      "тонкий лаваш"
    ]
  },
  {
    "id": "tortilya",
    "name": "Тортилья",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tortilya",
      "тортилья"
    ]
  },
  {
    "id": "bulochki",
    "name": "Булочки",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bulochki",
      "булочки"
    ]
  },
  {
    "id": "baget",
    "name": "Багет",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "baget",
      "багет"
    ]
  },
  {
    "id": "lepeshka",
    "name": "Лепешка",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lepeshka",
      "лепешка"
    ]
  },
  {
    "id": "samsa",
    "name": "Самса",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "samsa",
      "самса"
    ]
  },
  {
    "id": "pirozhki",
    "name": "Пирожки",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pirozhki",
      "пирожки"
    ]
  },
  {
    "id": "kruassan",
    "name": "Круассан",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kruassan",
      "круассан"
    ]
  },
  {
    "id": "suhariki",
    "name": "Сухарики",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "suhariki",
      "сухарики"
    ]
  },
  {
    "id": "hlebcy",
    "name": "Хлебцы",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hlebcy",
      "хлебцы"
    ]
  },
  {
    "id": "tostovyy_hleb",
    "name": "Тостовый хлеб",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tostovyy_hleb",
      "тостовый хлеб"
    ]
  },
  {
    "id": "pita",
    "name": "Пита",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pita",
      "пита"
    ]
  },
  {
    "id": "bauyrsak",
    "name": "Бауырсак",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bauyrsak",
      "бауырсак"
    ]
  },
  {
    "id": "pechene_solenoe",
    "name": "Печенье соленое",
    "aliases": [],
    "category": "Хлеб и выпечка",
    "icon": "🍞",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pechene_solenoe",
      "печенье соленое"
    ]
  },
  {
    "id": "salt",
    "name": "Соль",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "salt",
      "соль"
    ]
  },
  {
    "id": "sugar",
    "name": "Сахар",
    "aliases": [
      "сахар песок"
    ],
    "category": "Специи",
    "icon": "🧂",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sugar",
      "сахар",
      "сахар песок"
    ]
  },
  {
    "id": "black_pepper",
    "name": "Черный перец",
    "aliases": [
      "перец черный"
    ],
    "category": "Специи",
    "icon": "🧂",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "black_pepper",
      "перец черный",
      "черный перец"
    ]
  },
  {
    "id": "krasnyy_perec",
    "name": "Красный перец",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "krasnyy_perec",
      "красный перец"
    ]
  },
  {
    "id": "paprika",
    "name": "Паприка",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "paprika",
      "паприка"
    ]
  },
  {
    "id": "zira",
    "name": "Зира",
    "aliases": [
      "кумин"
    ],
    "category": "Специи",
    "icon": "🧂",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zira",
      "зира",
      "кумин"
    ]
  },
  {
    "id": "kurkuma",
    "name": "Куркума",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kurkuma",
      "куркума"
    ]
  },
  {
    "id": "karri",
    "name": "Карри",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "karri",
      "карри"
    ]
  },
  {
    "id": "koriandr",
    "name": "Кориандр",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "koriandr",
      "кориандр"
    ]
  },
  {
    "id": "lavrovyy_list",
    "name": "Лавровый лист",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lavrovyy_list",
      "лавровый лист"
    ]
  },
  {
    "id": "bazilik_sushenyy",
    "name": "Базилик сушеный",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "bazilik_sushenyy",
      "базилик сушеный"
    ]
  },
  {
    "id": "oregano",
    "name": "Орегано",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "oregano",
      "орегано"
    ]
  },
  {
    "id": "timyan",
    "name": "Тимьян",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "timyan",
      "тимьян"
    ]
  },
  {
    "id": "rozmarin",
    "name": "Розмарин",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rozmarin",
      "розмарин"
    ]
  },
  {
    "id": "hmeli_suneli",
    "name": "Хмели-сунели",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "hmeli_suneli",
      "хмели-сунели"
    ]
  },
  {
    "id": "priprava_dlya_plova",
    "name": "Приправа для плова",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "priprava_dlya_plova",
      "приправа для плова"
    ]
  },
  {
    "id": "priprava_dlya_kuricy",
    "name": "Приправа для курицы",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "priprava_dlya_kuricy",
      "приправа для курицы"
    ]
  },
  {
    "id": "priprava_dlya_myasa",
    "name": "Приправа для мяса",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "priprava_dlya_myasa",
      "приправа для мяса"
    ]
  },
  {
    "id": "priprava_dlya_ryby",
    "name": "Приправа для рыбы",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "priprava_dlya_ryby",
      "приправа для рыбы"
    ]
  },
  {
    "id": "italyanskie_travy",
    "name": "Итальянские травы",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "italyanskie_travy",
      "итальянские травы"
    ]
  },
  {
    "id": "sushenyy_chesnok",
    "name": "Сушеный чеснок",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sushenyy_chesnok",
      "сушеный чеснок"
    ]
  },
  {
    "id": "sushenyy_luk",
    "name": "Сушеный лук",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sushenyy_luk",
      "сушеный лук"
    ]
  },
  {
    "id": "korica",
    "name": "Корица",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "korica",
      "корица"
    ]
  },
  {
    "id": "gvozdika",
    "name": "Гвоздика",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "gvozdika",
      "гвоздика"
    ]
  },
  {
    "id": "kardamon",
    "name": "Кардамон",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kardamon",
      "кардамон"
    ]
  },
  {
    "id": "muskatnyy_oreh",
    "name": "Мускатный орех",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "muskatnyy_oreh",
      "мускатный орех"
    ]
  },
  {
    "id": "kunzhut",
    "name": "Кунжут",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kunzhut",
      "кунжут"
    ]
  },
  {
    "id": "mak",
    "name": "Мак",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mak",
      "мак"
    ]
  },
  {
    "id": "semechki",
    "name": "Семечки",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "semechki",
      "семечки"
    ]
  },
  {
    "id": "semena_lna",
    "name": "Семена льна",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "semena_lna",
      "семена льна"
    ]
  },
  {
    "id": "vanilnyy_sahar",
    "name": "Ванильный сахар",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vanilnyy_sahar",
      "ванильный сахар"
    ]
  },
  {
    "id": "saharnaya_pudra",
    "name": "Сахарная пудра",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "saharnaya_pudra",
      "сахарная пудра"
    ]
  },
  {
    "id": "soda",
    "name": "Сода",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "soda",
      "сода"
    ]
  },
  {
    "id": "limonnaya_kislota",
    "name": "Лимонная кислота",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "limonnaya_kislota",
      "лимонная кислота"
    ]
  },
  {
    "id": "zhelatin",
    "name": "Желатин",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zhelatin",
      "желатин"
    ]
  },
  {
    "id": "agar_agar",
    "name": "Агар-агар",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "agar_agar",
      "агар-агар"
    ]
  },
  {
    "id": "uksus",
    "name": "Уксус",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "uksus",
      "уксус"
    ]
  },
  {
    "id": "yablochnyy_uksus",
    "name": "Яблочный уксус",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "yablochnyy_uksus",
      "яблочный уксус"
    ]
  },
  {
    "id": "krahmal_kukuruznyy",
    "name": "Крахмал кукурузный",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "krahmal_kukuruznyy",
      "крахмал кукурузный"
    ]
  },
  {
    "id": "kakao",
    "name": "Какао",
    "aliases": [],
    "category": "Специи",
    "icon": "🧂",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kakao",
      "какао"
    ]
  },
  {
    "id": "mayonnaise",
    "name": "Майонез",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mayonnaise",
      "майонез"
    ]
  },
  {
    "id": "ketchup",
    "name": "Кетчуп",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ketchup",
      "кетчуп"
    ]
  },
  {
    "id": "gorchica",
    "name": "Горчица",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "gorchica",
      "горчица"
    ]
  },
  {
    "id": "soy_sauce",
    "name": "Соевый соус",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "soy_sauce",
      "соевый соус"
    ]
  },
  {
    "id": "tomato_paste",
    "name": "Томатная паста",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tomato_paste",
      "томатная паста"
    ]
  },
  {
    "id": "adzhika",
    "name": "Аджика",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "adzhika",
      "аджика"
    ]
  },
  {
    "id": "sacebeli",
    "name": "Сацебели",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sacebeli",
      "сацебели"
    ]
  },
  {
    "id": "tkemali",
    "name": "Ткемали",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tkemali",
      "ткемали"
    ]
  },
  {
    "id": "barbekyu_sous",
    "name": "Барбекю соус",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "barbekyu_sous",
      "барбекю соус"
    ]
  },
  {
    "id": "chesnochnyy_sous",
    "name": "Чесночный соус",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chesnochnyy_sous",
      "чесночный соус"
    ]
  },
  {
    "id": "syrnyy_sous",
    "name": "Сырный соус",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "syrnyy_sous",
      "сырный соус"
    ]
  },
  {
    "id": "ostryy_sous",
    "name": "Острый соус",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ostryy_sous",
      "острый соус"
    ]
  },
  {
    "id": "olivkovoe_maslo",
    "name": "Оливковое масло",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "olivkovoe_maslo",
      "оливковое масло"
    ]
  },
  {
    "id": "oil",
    "name": "Подсолнечное масло",
    "aliases": [
      "масло растительное",
      "масло"
    ],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "oil",
      "масло",
      "масло растительное",
      "подсолнечное масло"
    ]
  },
  {
    "id": "kukuruza_konservirovannaya",
    "name": "Кукуруза консервированная",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kukuruza_konservirovannaya",
      "кукуруза консервированная"
    ]
  },
  {
    "id": "goroshek_konservirovannyy",
    "name": "Горошек консервированный",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "goroshek_konservirovannyy",
      "горошек консервированный"
    ]
  },
  {
    "id": "fasol_konservirovannaya",
    "name": "Фасоль консервированная",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "fasol_konservirovannaya",
      "фасоль консервированная"
    ]
  },
  {
    "id": "tunec_konservirovannyy",
    "name": "Тунец консервированный",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tunec_konservirovannyy",
      "тунец консервированный"
    ]
  },
  {
    "id": "sayra_konservirovannaya",
    "name": "Сайра консервированная",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sayra_konservirovannaya",
      "сайра консервированная"
    ]
  },
  {
    "id": "shproty",
    "name": "Шпроты",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shproty",
      "шпроты"
    ]
  },
  {
    "id": "tushenka_govyazhya",
    "name": "Тушенка говяжья",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tushenka_govyazhya",
      "тушенка говяжья"
    ]
  },
  {
    "id": "tushenka_kurinaya",
    "name": "Тушенка куриная",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tushenka_kurinaya",
      "тушенка куриная"
    ]
  },
  {
    "id": "olivki_konservirovannye",
    "name": "Оливки консервированные",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "olivki_konservirovannye",
      "оливки консервированные"
    ]
  },
  {
    "id": "masliny_konservirovannye",
    "name": "Маслины консервированные",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "masliny_konservirovannye",
      "маслины консервированные"
    ]
  },
  {
    "id": "ogurcy_marinovannye",
    "name": "Огурцы маринованные",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ogurcy_marinovannye",
      "огурцы маринованные"
    ]
  },
  {
    "id": "griby_marinovannye",
    "name": "Грибы маринованные",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "griby_marinovannye",
      "грибы маринованные"
    ]
  },
  {
    "id": "ikra_kabachkovaya",
    "name": "Икра кабачковая",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ikra_kabachkovaya",
      "икра кабачковая"
    ]
  },
  {
    "id": "lecho",
    "name": "Лечо",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "lecho",
      "лечо"
    ]
  },
  {
    "id": "varene",
    "name": "Варенье",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "varene",
      "варенье"
    ]
  },
  {
    "id": "med",
    "name": "Мед",
    "aliases": [],
    "category": "Соусы и консервы",
    "icon": "🥫",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "med",
      "мед"
    ]
  },
  {
    "id": "shokolad",
    "name": "Шоколад",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shokolad",
      "шоколад"
    ]
  },
  {
    "id": "shokolad_molochnyy",
    "name": "Шоколад молочный",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shokolad_molochnyy",
      "шоколад молочный"
    ]
  },
  {
    "id": "shokolad_gorkiy",
    "name": "Шоколад горький",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shokolad_gorkiy",
      "шоколад горький"
    ]
  },
  {
    "id": "konfety",
    "name": "Конфеты",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "konfety",
      "конфеты"
    ]
  },
  {
    "id": "karamel",
    "name": "Карамель",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "karamel",
      "карамель"
    ]
  },
  {
    "id": "pechene",
    "name": "Печенье",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pechene",
      "печенье"
    ]
  },
  {
    "id": "vafli",
    "name": "Вафли",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vafli",
      "вафли"
    ]
  },
  {
    "id": "pryaniki",
    "name": "Пряники",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pryaniki",
      "пряники"
    ]
  },
  {
    "id": "zefir",
    "name": "Зефир",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zefir",
      "зефир"
    ]
  },
  {
    "id": "marmelad",
    "name": "Мармелад",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "marmelad",
      "мармелад"
    ]
  },
  {
    "id": "pastila",
    "name": "Пастила",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pastila",
      "пастила"
    ]
  },
  {
    "id": "halva",
    "name": "Халва",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "halva",
      "халва"
    ]
  },
  {
    "id": "chak_chak",
    "name": "Чак-чак",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chak_chak",
      "чак-чак"
    ]
  },
  {
    "id": "tort",
    "name": "Торт",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tort",
      "торт"
    ]
  },
  {
    "id": "pirozhnoe",
    "name": "Пирожное",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pirozhnoe",
      "пирожное"
    ]
  },
  {
    "id": "keks",
    "name": "Кекс",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "keks",
      "кекс"
    ]
  },
  {
    "id": "maffiny",
    "name": "Маффины",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "maffiny",
      "маффины"
    ]
  },
  {
    "id": "ponchiki",
    "name": "Пончики",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ponchiki",
      "пончики"
    ]
  },
  {
    "id": "sguschenka",
    "name": "Сгущенка",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sguschenka",
      "сгущенка"
    ]
  },
  {
    "id": "nutella",
    "name": "Нутелла",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "nutella",
      "нутелла"
    ]
  },
  {
    "id": "zhevatelnaya_rezinka",
    "name": "Жевательная резинка",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "zhevatelnaya_rezinka",
      "жевательная резинка"
    ]
  },
  {
    "id": "ledency",
    "name": "Леденцы",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "ledency",
      "леденцы"
    ]
  },
  {
    "id": "popkorn",
    "name": "Попкорн",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "popkorn",
      "попкорн"
    ]
  },
  {
    "id": "chipsy",
    "name": "Чипсы",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chipsy",
      "чипсы"
    ]
  },
  {
    "id": "suhofrukty",
    "name": "Сухофрукты",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "suhofrukty",
      "сухофрукты"
    ]
  },
  {
    "id": "orehi",
    "name": "Орехи",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "orehi",
      "орехи"
    ]
  },
  {
    "id": "arahis",
    "name": "Арахис",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "arahis",
      "арахис"
    ]
  },
  {
    "id": "fistashki",
    "name": "Фисташки",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "fistashki",
      "фисташки"
    ]
  },
  {
    "id": "mindal",
    "name": "Миндаль",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mindal",
      "миндаль"
    ]
  },
  {
    "id": "semechki_zharenye",
    "name": "Семечки жареные",
    "aliases": [],
    "category": "Сладости",
    "icon": "🍬",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "semechki_zharenye",
      "семечки жареные"
    ]
  },
  {
    "id": "water",
    "name": "Вода",
    "aliases": [
      "питьевая вода"
    ],
    "category": "Напитки",
    "icon": "🧃",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "water",
      "вода",
      "питьевая вода"
    ]
  },
  {
    "id": "mineralnaya_voda",
    "name": "Минеральная вода",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mineralnaya_voda",
      "минеральная вода"
    ]
  },
  {
    "id": "gazirovannaya_voda",
    "name": "Газированная вода",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "gazirovannaya_voda",
      "газированная вода"
    ]
  },
  {
    "id": "tea",
    "name": "Чай",
    "aliases": [
      "чай черный"
    ],
    "category": "Напитки",
    "icon": "🧃",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tea",
      "чай",
      "чай черный"
    ]
  },
  {
    "id": "chay_chernyy",
    "name": "Чай черный",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chay_chernyy",
      "чай черный"
    ]
  },
  {
    "id": "chay_zelenyy",
    "name": "Чай зеленый",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "chay_zelenyy",
      "чай зеленый"
    ]
  },
  {
    "id": "coffee",
    "name": "Кофе",
    "aliases": [
      "растворимый кофе",
      "молотый кофе"
    ],
    "category": "Напитки",
    "icon": "🧃",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "coffee",
      "кофе",
      "молотый кофе",
      "растворимый кофе"
    ]
  },
  {
    "id": "kakao_napitok",
    "name": "Какао напиток",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kakao_napitok",
      "какао напиток"
    ]
  },
  {
    "id": "sok",
    "name": "Сок",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sok",
      "сок"
    ]
  },
  {
    "id": "mors",
    "name": "Морс",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "mors",
      "морс"
    ]
  },
  {
    "id": "kompot",
    "name": "Компот",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kompot",
      "компот"
    ]
  },
  {
    "id": "kola",
    "name": "Кола",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": true,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kola",
      "кола"
    ]
  },
  {
    "id": "fanta",
    "name": "Фанта",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "fanta",
      "фанта"
    ]
  },
  {
    "id": "sprayt",
    "name": "Спрайт",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sprayt",
      "спрайт"
    ]
  },
  {
    "id": "limonad",
    "name": "Лимонад",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "limonad",
      "лимонад"
    ]
  },
  {
    "id": "energetik",
    "name": "Энергетик",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "energetik",
      "энергетик"
    ]
  },
  {
    "id": "kvas",
    "name": "Квас",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "kvas",
      "квас"
    ]
  },
  {
    "id": "molochnyy_kokteyl",
    "name": "Молочный коктейль",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "molochnyy_kokteyl",
      "молочный коктейль"
    ]
  },
  {
    "id": "detskiy_sok",
    "name": "Детский сок",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "detskiy_sok",
      "детский сок"
    ]
  },
  {
    "id": "sirop",
    "name": "Сироп",
    "aliases": [],
    "category": "Напитки",
    "icon": "🧃",
    "popular": false,
    "recipeIngredient": true,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sirop",
      "сироп"
    ]
  },
  {
    "id": "beer",
    "name": "Пиво",
    "aliases": [
      "пиво светлое"
    ],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "beer",
      "пиво",
      "пиво светлое"
    ]
  },
  {
    "id": "pivo_svetloe",
    "name": "Пиво светлое",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pivo_svetloe",
      "пиво светлое"
    ]
  },
  {
    "id": "pivo_temnoe",
    "name": "Пиво темное",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pivo_temnoe",
      "пиво темное"
    ]
  },
  {
    "id": "pivo_bezalkogolnoe",
    "name": "Пиво безалкогольное",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pivo_bezalkogolnoe",
      "пиво безалкогольное"
    ]
  },
  {
    "id": "pivo_kraftovoe",
    "name": "Пиво крафтовое",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "pivo_kraftovoe",
      "пиво крафтовое"
    ]
  },
  {
    "id": "wine_red",
    "name": "Вино красное",
    "aliases": [
      "красное вино"
    ],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "wine_red",
      "вино красное",
      "красное вино"
    ]
  },
  {
    "id": "vino_beloe",
    "name": "Вино белое",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vino_beloe",
      "вино белое"
    ]
  },
  {
    "id": "vino_rozovoe",
    "name": "Вино розовое",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vino_rozovoe",
      "вино розовое"
    ]
  },
  {
    "id": "vino_igristoe",
    "name": "Вино игристое",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vino_igristoe",
      "вино игристое"
    ]
  },
  {
    "id": "shampanskoe",
    "name": "Шампанское",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "shampanskoe",
      "шампанское"
    ]
  },
  {
    "id": "vodka",
    "name": "Водка",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vodka",
      "водка"
    ]
  },
  {
    "id": "konyak",
    "name": "Коньяк",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "konyak",
      "коньяк"
    ]
  },
  {
    "id": "whiskey",
    "name": "Виски",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "whiskey",
      "виски"
    ]
  },
  {
    "id": "rom",
    "name": "Ром",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "rom",
      "ром"
    ]
  },
  {
    "id": "dzhin",
    "name": "Джин",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "dzhin",
      "джин"
    ]
  },
  {
    "id": "tekila",
    "name": "Текила",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tekila",
      "текила"
    ]
  },
  {
    "id": "brendi",
    "name": "Бренди",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "brendi",
      "бренди"
    ]
  },
  {
    "id": "liker",
    "name": "Ликер",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "liker",
      "ликер"
    ]
  },
  {
    "id": "nastoyka",
    "name": "Настойка",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "nastoyka",
      "настойка"
    ]
  },
  {
    "id": "sidr",
    "name": "Сидр",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sidr",
      "сидр"
    ]
  },
  {
    "id": "vermut",
    "name": "Вермут",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "vermut",
      "вермут"
    ]
  },
  {
    "id": "tonik",
    "name": "Тоник",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "tonik",
      "тоник"
    ]
  },
  {
    "id": "led_dlya_kokteyley",
    "name": "Лед для коктейлей",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "led_dlya_kokteyley",
      "лед для коктейлей"
    ]
  },
  {
    "id": "sirop_dlya_kokteyley",
    "name": "Сироп для коктейлей",
    "aliases": [],
    "category": "Алкоголь",
    "icon": "🍷",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": true,
    "shoppingAllowed": true,
    "search": [
      "sirop_dlya_kokteyley",
      "сироп для коктейлей"
    ]
  },
  {
    "id": "toilet_paper",
    "name": "Туалетная бумага",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "toilet_paper",
      "туалетная бумага"
    ]
  },
  {
    "id": "bumazhnye_polotenca",
    "name": "Бумажные полотенца",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "bumazhnye_polotenca",
      "бумажные полотенца"
    ]
  },
  {
    "id": "salfetki",
    "name": "Салфетки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "salfetki",
      "салфетки"
    ]
  },
  {
    "id": "vlazhnye_salfetki_bytovye",
    "name": "Влажные салфетки бытовые",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "vlazhnye_salfetki_bytovye",
      "влажные салфетки бытовые"
    ]
  },
  {
    "id": "gubki_dlya_posudy",
    "name": "Губки для посуды",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "gubki_dlya_posudy",
      "губки для посуды"
    ]
  },
  {
    "id": "dish_soap",
    "name": "Средство для посуды",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "dish_soap",
      "средство для посуды"
    ]
  },
  {
    "id": "laundry_powder",
    "name": "Стиральный порошок",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "laundry_powder",
      "стиральный порошок"
    ]
  },
  {
    "id": "gel_dlya_stirki",
    "name": "Гель для стирки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "gel_dlya_stirki",
      "гель для стирки"
    ]
  },
  {
    "id": "kapsuly_dlya_stirki",
    "name": "Капсулы для стирки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "kapsuly_dlya_stirki",
      "капсулы для стирки"
    ]
  },
  {
    "id": "kondicioner_dlya_belya",
    "name": "Кондиционер для белья",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "kondicioner_dlya_belya",
      "кондиционер для белья"
    ]
  },
  {
    "id": "otbelivatel",
    "name": "Отбеливатель",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "otbelivatel",
      "отбеливатель"
    ]
  },
  {
    "id": "pyatnovyvoditel",
    "name": "Пятновыводитель",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pyatnovyvoditel",
      "пятновыводитель"
    ]
  },
  {
    "id": "mylo",
    "name": "Мыло",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "mylo",
      "мыло"
    ]
  },
  {
    "id": "zhidkoe_mylo",
    "name": "Жидкое мыло",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "zhidkoe_mylo",
      "жидкое мыло"
    ]
  },
  {
    "id": "shampun",
    "name": "Шампунь",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "shampun",
      "шампунь"
    ]
  },
  {
    "id": "balzam_dlya_volos",
    "name": "Бальзам для волос",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "balzam_dlya_volos",
      "бальзам для волос"
    ]
  },
  {
    "id": "gel_dlya_dusha",
    "name": "Гель для душа",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "gel_dlya_dusha",
      "гель для душа"
    ]
  },
  {
    "id": "zubnaya_pasta",
    "name": "Зубная паста",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "zubnaya_pasta",
      "зубная паста"
    ]
  },
  {
    "id": "zubnaya_schetka",
    "name": "Зубная щетка",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "zubnaya_schetka",
      "зубная щетка"
    ]
  },
  {
    "id": "opolaskivatel_dlya_rta",
    "name": "Ополаскиватель для рта",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "opolaskivatel_dlya_rta",
      "ополаскиватель для рта"
    ]
  },
  {
    "id": "dezodorant",
    "name": "Дезодорант",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "dezodorant",
      "дезодорант"
    ]
  },
  {
    "id": "britva",
    "name": "Бритва",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "britva",
      "бритва"
    ]
  },
  {
    "id": "pena_dlya_britya",
    "name": "Пена для бритья",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pena_dlya_britya",
      "пена для бритья"
    ]
  },
  {
    "id": "vatnye_palochki",
    "name": "Ватные палочки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "vatnye_palochki",
      "ватные палочки"
    ]
  },
  {
    "id": "vatnye_diski",
    "name": "Ватные диски",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "vatnye_diski",
      "ватные диски"
    ]
  },
  {
    "id": "pakety_dlya_musora",
    "name": "Пакеты для мусора",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pakety_dlya_musora",
      "пакеты для мусора"
    ]
  },
  {
    "id": "pakety_fasovochnye",
    "name": "Пакеты фасовочные",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pakety_fasovochnye",
      "пакеты фасовочные"
    ]
  },
  {
    "id": "pischevaya_plenka",
    "name": "Пищевая пленка",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pischevaya_plenka",
      "пищевая пленка"
    ]
  },
  {
    "id": "folga",
    "name": "Фольга",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "folga",
      "фольга"
    ]
  },
  {
    "id": "pergament",
    "name": "Пергамент",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pergament",
      "пергамент"
    ]
  },
  {
    "id": "sredstvo_dlya_pola",
    "name": "Средство для пола",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "sredstvo_dlya_pola",
      "средство для пола"
    ]
  },
  {
    "id": "sredstvo_dlya_stekol",
    "name": "Средство для стекол",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "sredstvo_dlya_stekol",
      "средство для стекол"
    ]
  },
  {
    "id": "chistyaschee_sredstvo",
    "name": "Чистящее средство",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "chistyaschee_sredstvo",
      "чистящее средство"
    ]
  },
  {
    "id": "osvezhitel_vozduha",
    "name": "Освежитель воздуха",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "osvezhitel_vozduha",
      "освежитель воздуха"
    ]
  },
  {
    "id": "tabletki_dlya_posudomoyki",
    "name": "Таблетки для посудомойки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "tabletki_dlya_posudomoyki",
      "таблетки для посудомойки"
    ]
  },
  {
    "id": "sol_dlya_posudomoyki",
    "name": "Соль для посудомойки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "sol_dlya_posudomoyki",
      "соль для посудомойки"
    ]
  },
  {
    "id": "bumaga_dlya_vypechki",
    "name": "Бумага для выпечки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "bumaga_dlya_vypechki",
      "бумага для выпечки"
    ]
  },
  {
    "id": "spichki",
    "name": "Спички",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "spichki",
      "спички"
    ]
  },
  {
    "id": "batareyki",
    "name": "Батарейки",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "batareyki",
      "батарейки"
    ]
  },
  {
    "id": "lampochka",
    "name": "Лампочка",
    "aliases": [],
    "category": "Бытовое",
    "icon": "🧹",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "lampochka",
      "лампочка"
    ]
  },
  {
    "id": "diapers",
    "name": "Подгузники",
    "aliases": [
      "памперсы"
    ],
    "category": "Детское",
    "icon": "👶",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "diapers",
      "памперсы",
      "подгузники"
    ]
  },
  {
    "id": "trusiki_podguzniki",
    "name": "Трусики-подгузники",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "trusiki_podguzniki",
      "трусики-подгузники"
    ]
  },
  {
    "id": "baby_wipes",
    "name": "Влажные салфетки детские",
    "aliases": [
      "салфетки детские"
    ],
    "category": "Детское",
    "icon": "👶",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "baby_wipes",
      "влажные салфетки детские",
      "салфетки детские"
    ]
  },
  {
    "id": "detskoe_pyure",
    "name": "Детское пюре",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "detskoe_pyure",
      "детское пюре"
    ]
  },
  {
    "id": "detskaya_kasha",
    "name": "Детская каша",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": true,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "detskaya_kasha",
      "детская каша"
    ]
  },
  {
    "id": "detskoe_moloko",
    "name": "Детское молоко",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "detskoe_moloko",
      "детское молоко"
    ]
  },
  {
    "id": "smes_detskaya",
    "name": "Смесь детская",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "smes_detskaya",
      "смесь детская"
    ]
  },
  {
    "id": "pechene_detskoe",
    "name": "Печенье детское",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "pechene_detskoe",
      "печенье детское"
    ]
  },
  {
    "id": "yogurt_detskiy",
    "name": "Йогурт детский",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "yogurt_detskiy",
      "йогурт детский"
    ]
  },
  {
    "id": "detskiy_shampun",
    "name": "Детский шампунь",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "detskiy_shampun",
      "детский шампунь"
    ]
  },
  {
    "id": "detskoe_mylo",
    "name": "Детское мыло",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "detskoe_mylo",
      "детское мыло"
    ]
  },
  {
    "id": "krem_detskiy",
    "name": "Крем детский",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "krem_detskiy",
      "крем детский"
    ]
  },
  {
    "id": "prisypka",
    "name": "Присыпка",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "prisypka",
      "присыпка"
    ]
  },
  {
    "id": "igrushka",
    "name": "Игрушка",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "igrushka",
      "игрушка"
    ]
  },
  {
    "id": "plastilin",
    "name": "Пластилин",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "plastilin",
      "пластилин"
    ]
  },
  {
    "id": "karandashi",
    "name": "Карандаши",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "karandashi",
      "карандаши"
    ]
  },
  {
    "id": "albom_dlya_risovaniya",
    "name": "Альбом для рисования",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "albom_dlya_risovaniya",
      "альбом для рисования"
    ]
  },
  {
    "id": "raskraska",
    "name": "Раскраска",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "raskraska",
      "раскраска"
    ]
  },
  {
    "id": "smennaya_odezhda",
    "name": "Сменная одежда",
    "aliases": [],
    "category": "Детское",
    "icon": "👶",
    "popular": false,
    "recipeIngredient": false,
    "fridgeAllowed": false,
    "shoppingAllowed": true,
    "search": [
      "smennaya_odezhda",
      "сменная одежда"
    ]
  }
];

async function seedIngredients() {
  console.log("Загрузка полного семейного каталога...");

  for (const item of ingredients) {
    await setDoc(
      doc(db, "ingredients", item.id),
      {
        ...item,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ ${item.category} / ${item.name}`);
  }

  console.log(`Готово. Загружено: ${ingredients.length} позиций`);
}

seedIngredients().catch((error) => {
  console.error("Ошибка загрузки ингредиентов:", error);
  process.exit(1);
});
