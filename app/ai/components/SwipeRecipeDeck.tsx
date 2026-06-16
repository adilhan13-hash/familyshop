"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PanInfo } from "framer-motion";

type Recipe = {
  id: string;
  title: string;
  category?: string;
};

type MatchResult = {
  recipe: Recipe;
  score: number;
  haveIds: string[];
  missingIds: string[];
  total: number;
};

type RecipeKind =
  | "breakfast"
  | "salad"
  | "soup"
  | "main"
  | "side"
  | "baking"
  | "dessert"
  | "drink"
  | "other";

type CookDeckMode = "ready" | "kids" | "categories" | "favorites";
type SwipeDirection = "left" | "right" | "down" | "next";

type AvailableRecipeKind = {
  kind: RecipeKind;
  count: number;
  readyCount: number;
};

type SwipeRecipeDeckProps = {
  activeDeckMode: CookDeckMode;
  selectedRecipeKind: RecipeKind | null;
  deckIndex: number;
  swipeDirection: SwipeDirection;
  currentDeckResult: MatchResult | null;
  favoriteResults: MatchResult[];
  availableRecipeKinds: AvailableRecipeKind[];
  loadingFavorites: boolean;
  loadingSuggested: boolean;
  matchingRecipes: boolean;
  addingRecipeId: string | null;
  onClose: () => void;
  onSelectRecipeKind: (kind: RecipeKind) => void;
  onNext: () => void;
  onPrevious: () => void;
  onFavoriteSwipe: (result: MatchResult) => void;
  onOpenRecipe: (result: MatchResult) => void;
  onAddMissingToShopping: (result: MatchResult) => void;
  onStartCooking: (result: MatchResult) => void;
  renderRecipeCard: (result: MatchResult) => ReactNode;
  getRecipeTimeLabel: (recipe: Recipe) => string;
  getProductLabel: (id: string) => string;
};

const recipeKindLabels: Record<RecipeKind, string> = {
  breakfast: "Завтраки",
  salad: "Салаты",
  soup: "Первое",
  main: "Второе",
  side: "Гарниры",
  baking: "Выпечка",
  dessert: "Десерты",
  drink: "Напитки",
  other: "Другое",
};

const deckCardVariants = {
  initial: (direction: SwipeDirection) => ({
    opacity: 0,
    x: direction === "right" ? 40 : direction === "left" ? -40 : 0,
    y: direction === "down" ? -36 : 18,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
  },
  exit: (direction: SwipeDirection) => ({
    opacity: 0,
    x: direction === "right" ? 180 : direction === "left" ? -180 : 0,
    y: direction === "down" ? 220 : 20,
    rotate: direction === "right" ? 8 : direction === "left" ? -8 : 0,
    scale: 0.96,
  }),
};

function getRecipeKindIcon(kind: RecipeKind) {
  if (kind === "breakfast") return "🍳";
  if (kind === "salad") return "🥗";
  if (kind === "soup") return "🍲";
  if (kind === "main") return "🍽";
  if (kind === "side") return "🍚";
  if (kind === "baking") return "🥟";
  if (kind === "dessert") return "🍰";
  if (kind === "drink") return "☕";
  return "📌";
}

export function SwipeRecipeDeck({
  activeDeckMode,
  selectedRecipeKind,
  deckIndex,
  swipeDirection,
  currentDeckResult,
  favoriteResults,
  availableRecipeKinds,
  loadingFavorites,
  loadingSuggested,
  matchingRecipes,
  addingRecipeId,
  onClose,
  onSelectRecipeKind,
  onNext,
  onPrevious,
  onFavoriteSwipe,
  onOpenRecipe,
  onAddMissingToShopping,
  onStartCooking,
  renderRecipeCard,
  getRecipeTimeLabel,
  getProductLabel,
}: SwipeRecipeDeckProps) {
  const result = currentDeckResult;
  const recipe = result?.recipe;

  function getDeckTitle() {
    if (activeDeckMode === "ready") return "Можно приготовить";
    if (activeDeckMode === "kids") return "Детское меню";
    if (activeDeckMode === "favorites") return "Избранное";
    if (selectedRecipeKind) return recipeKindLabels[selectedRecipeKind];
    return "Категории";
  }

  function getDeckSubtitle() {
    if (activeDeckMode === "ready") return "100% совпадение";
    if (activeDeckMode === "kids") return "подборка для семьи";
    if (activeDeckMode === "favorites") return "сохраненные рецепты";
    if (selectedRecipeKind) return "свайпай рецепты";
    return "выбери раздел";
  }

  function handleRecipeDragEnd(info: PanInfo) {
    if (!result) return;

    if (info.offset.x > 90) {
      onNext();
      return;
    }

    if (info.offset.x < -90) {
      onPrevious();
      return;
    }

    if (info.offset.y > 110) {
      onFavoriteSwipe(result);
    }
  }

  if (activeDeckMode === "favorites") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-slate-950 px-5 py-6 text-white">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-300">
              AI Cook
            </p>
            <h2 className="mt-1 text-2xl font-black">Избранное</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {favoriteResults.length || "нет"} сохраненных рецептов
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white"
          >
            ✕
          </button>
        </div>

        {loadingFavorites ? (
          <div className="flex flex-1 items-center justify-center text-center text-sm font-semibold text-slate-300">
            Загружаю избранное...
          </div>
        ) : favoriteResults.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center rounded-[28px] bg-white/10 p-5 text-center ring-1 ring-white/10">
            <h3 className="text-xl font-black">Пока пусто</h3>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Добавляй рецепты свайпом вниз или звездочкой в карточке.
            </p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pb-8">
            {favoriteResults.map((favorite) => renderRecipeCard(favorite))}
          </div>
        )}
      </div>
    );
  }

  if (activeDeckMode === "categories" && !selectedRecipeKind) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-slate-950 px-5 py-6 text-white">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-300">
              AI Cook
            </p>
            <h2 className="mt-1 text-2xl font-black">Выбери категорию</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              потом откроется свайп-подборка
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-8">
          {availableRecipeKinds.map(({ kind, count, readyCount }) => (
            <motion.button
              key={kind}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectRecipeKind(kind)}
              className="min-h-[116px] rounded-[26px] bg-white/10 p-4 text-left ring-1 ring-white/10"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{getRecipeKindIcon(kind)}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-slate-200">
                  {readyCount > 0 ? `${readyCount} можно` : count}
                </span>
              </div>
              <h3 className="mt-4 text-base font-black leading-tight text-white">
                {recipeKindLabels[kind]}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {readyCount > 0
                  ? `${count} всего в подборке`
                  : "есть рецепты с докупкой"}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (loadingSuggested || matchingRecipes) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-6 text-center text-sm font-semibold text-slate-300">
        Подбираю рецепты по продуктам дома...
      </div>
    );
  }

  if (!result || !recipe) {
    return (
      <div className="flex min-h-[100dvh] flex-col justify-center bg-slate-950 p-6 text-white">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl font-black"
        >
          ✕
        </button>
        <h2 className="text-2xl font-black">Пока нет рецептов</h2>
        <p className="mt-2 text-sm text-slate-300">
          Добавь продукты в “Есть дома” или попробуй другой раздел.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_90%_85%,rgba(59,130,246,0.12),transparent_32%)]" />

      <AnimatePresence mode="wait" custom={swipeDirection}>
        <motion.div
          key={`${activeDeckMode}_${selectedRecipeKind || "none"}_${deckIndex}_${recipe.id}`}
          custom={swipeDirection}
          variants={deckCardVariants}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => handleRecipeDragEnd(info)}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="relative z-10 flex min-h-[100dvh] cursor-grab flex-col active:cursor-grabbing"
        >
          <div className="flex items-start justify-between gap-3 px-6 pt-7">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-emerald-300">
                {getDeckTitle()}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                {getDeckSubtitle()}
              </p>
              <p className="mt-5 text-base font-semibold text-emerald-200">
                {recipe.category || "Рецепт"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-3xl font-black text-white backdrop-blur"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 px-6 pt-5">
            <div className="flex items-start justify-between gap-4">
              <h2 className="min-w-0 flex-1 break-words text-[32px] font-black leading-[1.08] text-white sm:text-[36px]">
                {recipe.title}
              </h2>

              <div className="shrink-0 rounded-[22px] bg-white/10 px-3 py-3 text-center backdrop-blur">
                <div className="text-xs font-black uppercase text-emerald-100">
                  готовность
                </div>
                <div className="mt-1 text-3xl font-black">{result.score}%</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-[22px] bg-white/10 px-2 py-4 backdrop-blur">
                <div className="text-3xl font-black">
                  {result.haveIds.length}
                </div>
                <div className="mt-1 text-sm text-slate-300">есть дома</div>
              </div>
              <div className="rounded-[22px] bg-white/10 px-2 py-4 backdrop-blur">
                <div className="text-3xl font-black">
                  {result.missingIds.length}
                </div>
                <div className="mt-1 text-sm text-slate-300">не хватает</div>
              </div>
              <div className="rounded-[22px] bg-white/10 px-2 py-4 backdrop-blur">
                <div className="text-lg font-black leading-tight">
                  {getRecipeTimeLabel(recipe)}
                </div>
                <div className="mt-1 text-sm text-slate-300">время</div>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] bg-emerald-500/25 px-5 py-4 text-base font-black leading-7 text-emerald-50">
              {result.missingIds.length > 0 ? (
                <>
                  <div>Не хватает: {result.missingIds.length} ингредиент(ов)</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.missingIds.slice(0, 6).map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-emerald-50 ring-1 ring-white/10"
                      >
                        {getProductLabel(id)}
                      </span>
                    ))}

                    {result.missingIds.length > 6 ? (
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-emerald-100">
                        + еще {result.missingIds.length - 6}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                "Всё нужное уже есть дома."
              )}
            </div>

            <div className="mt-7 rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-center text-base font-semibold text-slate-200">
              ← назад · ↓ в избранное · → дальше
            </div>

            <div
              className={`mt-7 grid gap-3 ${
                result.missingIds.length > 0 ? "" : "grid-cols-[1fr_0.8fr]"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenRecipe(result)}
                className="rounded-[22px] bg-white px-4 py-4 text-base font-black text-slate-950"
              >
                Открыть рецепт
              </button>

              {result.missingIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onAddMissingToShopping(result)}
                  disabled={addingRecipeId !== null}
                  className="rounded-[22px] bg-green-500 px-4 py-4 text-base font-black text-white disabled:opacity-60"
                >
                  Добавить в покупки
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartCooking(result)}
                  disabled={addingRecipeId !== null}
                  className="rounded-[22px] bg-green-500 px-4 py-4 text-base font-black text-white disabled:opacity-60"
                >
                  Готовить
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
