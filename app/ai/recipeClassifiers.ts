export type RecipeKind =
  | "breakfast"
  | "salad"
  | "soup"
  | "main"
  | "side"
  | "baking"
  | "dessert"
  | "drink"
  | "other";

type RecipeTag = {
  name?: string;
  slug?: string;
};

type RawIngredient = {
  name?: string;
  ingredientId?: string;
  quantity?: string;
};

export type ClassifiableRecipe = {
  title: string;
  category?: string;
  categorySlug?: string;
  cuisine?: string;
  difficulty?: string;
  cookingTime?: number | null;
  searchTitle?: string;
  searchText?: string;
  tags?: RecipeTag[];
  rawIngredients?: RawIngredient[];
  ingredientIds?: string[];
  steps?: string[];
};

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRecipeTagsText(recipe: ClassifiableRecipe) {
  return normalizeText(
    (recipe.tags || [])
      .map((tag) => `${tag.name || ""} ${tag.slug || ""}`)
      .join(" "),
  );
}

export function getRecipeSearchText(recipe: ClassifiableRecipe) {
  if (recipe.searchText) return recipe.searchText;

  const rawIngredientsText = (recipe.rawIngredients || [])
    .map(
      (ingredient) =>
        `${ingredient.name || ""} ${ingredient.ingredientId || ""} ${ingredient.quantity || ""}`,
    )
    .join(" ");

  return normalizeText(
    `${recipe.title} ${recipe.searchTitle || ""} ${recipe.category || ""} ${
      recipe.categorySlug || ""
    } ${recipe.cuisine || ""} ${recipe.difficulty || ""} ${getRecipeTagsText(
      recipe,
    )} ${rawIngredientsText}`,
  );
}

export function hasAnyWord(text: string, words: string[]) {
  const preparedText = ` ${normalizeText(text)} `;
  return words.some(
    (word) =>
      preparedText.includes(` ${normalizeText(word)} `) ||
      preparedText.includes(normalizeText(word)),
  );
}

export function getRecipeTitleCategoryText(recipe: ClassifiableRecipe) {
  return normalizeText(
    `${recipe.title || ""} ${recipe.category || ""} ${recipe.categorySlug || ""} ${(
      recipe.tags || []
    )
      .map((tag) => `${tag.name || ""} ${tag.slug || ""}`)
      .join(" ")}`,
  );
}

export function getRecipeIngredientText(recipe: ClassifiableRecipe) {
  return normalizeText(
    `${(recipe.rawIngredients || [])
      .map(
        (ingredient) =>
          `${ingredient.name || ""} ${ingredient.ingredientId || ""} ${ingredient.quantity || ""}`,
      )
      .join(" ")} ${(recipe.ingredientIds || []).join(" ")}`,
  );
}

function recipeHasTitleSignal(recipe: ClassifiableRecipe, words: string[]) {
  return hasAnyWord(getRecipeTitleCategoryText(recipe), words);
}

export function isBadRecipeForAi(recipe: ClassifiableRecipe) {
  const title = normalizeText(recipe.title || "");
  const titleCategory = getRecipeTitleCategoryText(recipe);
  const allText = getRecipeSearchText(recipe);
  const stepsCount = recipe.steps?.length || 0;
  const ingredientCount =
    recipe.rawIngredients?.length || recipe.ingredientIds?.length || 0;

  const badCategory = hasAnyWord(titleCategory, [
    "соусы",
    "соус",
    "маринад",
    "маринады",
    "заготовки",
    "консервация",
    "соленья",
    "молочные продукты домашние",
    "сыр домашний",
    "творог домашний",
    "домашний сыр",
  ]);

  const badTitle = hasAnyWord(title, [
    "соус",
    "маринад",
    "заправка",
    "заготовка",
    "заготовки",
    "консервация",
    "рассол",
    "квас",
    "закваска",
    "домашний майонез",
    "домашний сыр",
    "сыр домашний",
    "творог домашний",
  ]);

  const badTechnical = hasAnyWord(allText, [
    "соус для",
    "маринад для",
    "заготовки на зиму",
  ]);

  if (badCategory || badTitle || badTechnical) return true;

  if (ingredientCount < 2 && stepsCount < 2) return true;

  return false;
}

export function isRealDish(recipe: ClassifiableRecipe) {
  if (isBadRecipeForAi(recipe)) return false;

  const ingredientCount =
    recipe.rawIngredients?.length || recipe.ingredientIds?.length || 0;
  const stepsCount = recipe.steps?.length || 0;

  return ingredientCount >= 2 || stepsCount >= 2;
}

export function getRecipeKind(recipe: ClassifiableRecipe): RecipeKind {
  if (!isRealDish(recipe)) return "other";

  const titleCategory = getRecipeTitleCategoryText(recipe);
  const allText = getRecipeSearchText(recipe);
  const ingredientText = getRecipeIngredientText(recipe);

  const hasTitle = (words: string[]) => recipeHasTitleSignal(recipe, words);
  const hasCategory = (words: string[]) => hasAnyWord(titleCategory, words);
  const hasIngredients = (words: string[]) =>
    hasAnyWord(ingredientText, words);

  if (
    hasTitle([
      "салат",
      "салаты",
      "винегрет",
      "цезарь",
      "оливье",
      "сельдь под шубой",
      "селедка под шубой",
    ]) ||
    hasCategory(["салат", "салаты"])
  ) {
    return "salad";
  }

  if (
    hasTitle([
      "суп",
      "супы",
      "борщ",
      "щи",
      "уха",
      "рассольник",
      "солянка",
      "шурпа",
      "бульон",
      "свекольник",
      "харчо",
      "лагман",
      "окрошка",
      "крем суп",
      "суп пюре",
      "гороховый суп",
      "чечевичный суп",
      "фасолевый суп",
    ]) ||
    hasCategory(["первое блюдо", "первые блюда", "суп", "супы"])
  ) {
    return "soup";
  }

  if (
    hasTitle([
      "завтрак",
      "омлет",
      "яичница",
      "каша",
      "сырники",
      "гренки",
      "тост",
      "бутерброд",
      "сэндвич",
    ]) ||
    hasCategory(["завтрак", "завтраки"])
  ) {
    return "breakfast";
  }

  if (
    hasTitle([
      "тесто",
      "паста домашняя",
      "домашняя паста",
      "лапша домашняя",
      "домашняя лапша",
      "галушки",
      "клецки",
      "вареники",
      "пельмени",
      "манты",
      "хинкали",
      "лепешки",
      "лепёшки",
      "хлеб",
      "булочка",
      "булочки",
      "блины",
      "блинчики",
      "оладьи",
      "оладушки",
      "пирожки",
      "пирог",
      "пироги",
      "пицца",
    ]) ||
    hasCategory(["выпечка", "тесто", "мучные блюда"])
  ) {
    return "baking";
  }

  if (
    hasTitle([
      "торт",
      "пирожное",
      "печенье",
      "кекс",
      "десерт",
      "ватрушка",
      "пончики",
      "мороженое",
      "желе",
    ]) ||
    hasCategory(["десерт", "десерты"])
  ) {
    return "dessert";
  }

  if (
    hasTitle([
      "чай",
      "кофе",
      "компот",
      "морс",
      "кисель",
      "напиток",
      "сок",
      "какао",
      "смузи",
      "коктейль",
    ]) ||
    hasCategory(["напитки", "напиток"])
  ) {
    return "drink";
  }

  const meatFishSignal =
    hasTitle([
      "курица",
      "куриное",
      "куриный",
      "куриная",
      "индейка",
      "утка",
      "мясо",
      "мясной",
      "говядина",
      "свинина",
      "баранина",
      "конина",
      "фарш",
      "рыба",
      "семга",
      "сёмга",
      "лосось",
      "форель",
      "минтай",
      "судак",
      "котлеты",
      "котлета",
      "тефтели",
      "фрикадельки",
      "гуляш",
      "жаркое",
      "отбивные",
      "шашлык",
      "стейк",
      "плов",
      "голубцы",
      "долма",
      "лазанья",
      "шаурма с курицей",
      "паста с курицей",
      "паста с мясом",
      "макароны с мясом",
      "картофель с мясом",
      "картошка с мясом",
      "рис с мясом",
      "гречка с мясом",
    ]) ||
    hasIngredients([
      "курица",
      "куриное филе",
      "куриная грудка",
      "говядина",
      "свинина",
      "баранина",
      "фарш",
      "рыба",
      "индейка",
    ]);

  if (
    meatFishSignal &&
    !hasAnyWord(allText, ["салат", "суп", "соус", "маринад", "тесто"])
  ) {
    return "main";
  }

  const sideSignal =
    hasTitle([
      "рис",
      "гречка",
      "картофель",
      "картошка",
      "пюре",
      "макароны",
      "спагетти",
      "паста",
      "овощи на гарнир",
      "овощное рагу",
      "рагу овощное",
      "деруны",
      "драники",
      "запеченные овощи",
      "запечённые овощи",
    ]) || hasCategory(["гарнир", "гарниры"]);

  if (sideSignal && !meatFishSignal) {
    return "side";
  }

  const categoryLooksLikeMain = hasCategory([
    "второе блюдо",
    "вторые блюда",
    "горячее",
    "горячие блюда",
    "основное блюдо",
    "основные блюда",
  ]);

  if (categoryLooksLikeMain && meatFishSignal) {
    return "main";
  }

  return "other";
}

export function getQuickRecipeKind(recipe: ClassifiableRecipe) {
  const kind = getRecipeKind(recipe);
  return ["breakfast", "salad", "soup", "main", "side", "baking"].includes(
    kind,
  )
    ? kind
    : "other";
}

export function isQuickRecipe(recipe: ClassifiableRecipe) {
  if (!isRealDish(recipe)) return false;

  const kind = getQuickRecipeKind(recipe);
  const time = recipe.cookingTime || 0;

  if (kind === "breakfast") return time === 0 || time <= 35;
  if (kind === "salad") return time === 0 || time <= 40;
  if (kind === "soup") return time === 0 || time <= 75;
  if (kind === "main") return time === 0 || time <= 75;
  if (kind === "side") return time === 0 || time <= 55;
  if (kind === "baking") return time === 0 || time <= 90;

  return false;
}

export function isKidsRecipe(recipe: ClassifiableRecipe) {
  if (!isRealDish(recipe)) return false;

  const text = getRecipeSearchText(recipe);

  if (
    hasAnyWord(text, [
      "алкоголь",
      "водка",
      "вино",
      "коньяк",
      "ром",
      "острый",
      "острая",
      "чили",
      "хрен",
      "горчица",
    ])
  ) {
    return false;
  }

  return hasAnyWord(text, [
    "детское",
    "детский",
    "детская",
    "детские",
    "детского",
    "детскому",
    "для детей",
    "детям",
    "ребенку",
    "ребёнку",
    "малышу",
    "малышам",
    "детское меню",
    "детское питание",
  ]);
}

export function isHolidayRecipe(recipe: ClassifiableRecipe) {
  if (!isRealDish(recipe)) return false;

  const text = getRecipeSearchText(recipe);

  const holidayTag = hasAnyWord(text, [
    "праздничный стол",
    "праздничное",
    "праздник",
    "новогодний",
    "новый год",
    "рождество",
    "день рождения",
    "банкет",
    "фуршет",
    "гости",
    "для гостей",
    "к праздничному столу",
    "праздничная закуска",
    "праздничный салат",
    "праздничное блюдо",
  ]);

  const kind = getRecipeKind(recipe);
  const ingredientCount =
    recipe.rawIngredients?.length || recipe.ingredientIds?.length || 0;
  const stepsCount = recipe.steps?.length || 0;

  return (
    holidayTag &&
    ["salad", "soup", "main", "dessert"].includes(kind) &&
    ingredientCount >= 4 &&
    stepsCount >= 2
  );
}
