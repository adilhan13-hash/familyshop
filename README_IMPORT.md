# FamilyShop book export

Содержимое:

- data/ingredients_book_all.json — 3710 ингредиентов из книги рецептов
- data/recipes_all.json — 13703 рецептов
- scripts/importBookData.ts — импорт в Firebase

Как использовать:

1. Скопируй папку `data` в корень проекта FamilyShop.
2. Скопируй `scripts/importBookData.ts` в папку `scripts`.
3. Запусти:

```bash
npx tsx scripts/importBookData.ts
```

Скрипт загрузит данные в коллекции:

- ingredients
- recipes

Важно: рецептов много, импорт может идти несколько минут.
