"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../../components/BottomNav";
import { useFamilyAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { addActivity } from "../../lib/activity";

type ShoppingItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
  productName?: string;
  icon?: string;
  category?: string;
};

type FridgeItem = {
  id: string;
  name: string;
  productId?: string;
  ingredientId?: string;
};

type Product = {
  id: string;
  icon: string;
  name: string;
  category: string;
  ingredientId?: string;
  aliases?: string[];
  search?: string[];
  purchaseCount?: number;
  popular?: boolean;
  recipeIngredient?: boolean;
  fridgeAllowed?: boolean;
  shoppingAllowed?: boolean;
  source?: string;
  custom?: boolean;
  createdBy?: string;
  createdByUser?: string;
  manuallyCreated?: boolean;
};

export default function ShoppingPage() {
  const { familyId, appUser } = useFamilyAuth();

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [fridgeList, setFridgeList] = useState<FridgeItem[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showFrequent, setShowFrequent] = useState(false);
  const [frequentVisibleCount] = useState(12);
  const [showAllFrequent, setShowAllFrequent] = useState(false);
  const [message, setMessage] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadingShopping, setLoadingShopping] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingFrequent, setLoadingFrequent] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  function normalizeName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanProductName(value: string) {
    return value
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function transliterate(value: string) {
    const map: Record<string, string> = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ё: "e",
      ж: "zh",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "h",
      ц: "c",
      ч: "ch",
      ш: "sh",
      щ: "sch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
    };

    return value
      .toLowerCase()
      .split("")
      .map((letter) => map[letter] ?? letter)
      .join("");
  }

  function makeSafeId(value: string) {
    return transliterate(normalizeName(value))
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function uniqueStrings(values: string[]) {
    return Array.from(
      new Set(values.map((item) => item.trim()).filter(Boolean)),
    );
  }

  function buildSearchTerms(name: string, id: string) {
    const cleanName = cleanProductName(name);
    const normalized = normalizeName(cleanName);
    const safeId = makeSafeId(cleanName);

    return uniqueStrings([
      id,
      safeId,
      cleanName,
      cleanName.toLowerCase(),
      normalized,
    ]);
  }

  function guessIcon(name: string) {
    const text = normalizeName(name);

    if (/хлеб|батон|багет|булоч|лаваш|лепеш/.test(text)) return "🍞";
    if (/макарон|спагетти|лапша|вермишель|паста/.test(text)) return "🍝";
    if (/молок|кефир|йогурт|сметан|сливк|творог/.test(text)) return "🥛";
    if (/сыр/.test(text)) return "🧀";
    if (/яйц/.test(text)) return "🥚";
    if (/куриц|курин|бедро|крыл|грудк|филе/.test(text)) return "🍗";
    if (/говяд|свин|фарш|мяс|колбас|сосиск|ветчин/.test(text)) return "🥩";
    if (/рыб|лосос|семг|форел|скумбр|сельд|тунец/.test(text)) return "🐟";
    if (
      /картоф|морков|лук|чеснок|огур|помид|капуст|перец|баклаж|кабач/.test(text)
    )
      return "🥬";
    if (/яблок|банан|апельсин|лимон|виноград|груш|ягод|клубник/.test(text))
      return "🍎";
    if (/сок|вода|чай|кофе|напит/.test(text)) return "🥤";
    if (/сахар|конфет|печен|шоколад|вафл|торт|мед/.test(text)) return "🍫";
    if (/масло|соус|майонез|кетчуп|уксус|горчиц/.test(text)) return "🧴";
    if (/соль|перец|спец|паприк|зира|куркум|кориандр/.test(text)) return "🧂";
    if (/бумага|салфет|пакет|губк|порошок|гель|мыло|шампун/.test(text))
      return "🧻";
    if (/подгуз|детск|соска|пюре|игруш/.test(text)) return "👶";

    return "🛒";
  }

  function guessCategory(name: string) {
    const text = normalizeName(name);

    if (/хлеб|батон|багет|булоч|лаваш|лепеш/.test(text)) {
      return "Хлеб и выпечка";
    }
    if (
      /макарон|спагетти|лапша|вермишель|рис|греч|круп|мука|паста/.test(text)
    ) {
      return "Крупы и макароны";
    }
    if (/молок|кефир|йогурт|сметан|сливк|творог|сыр|масло сливоч/.test(text)) {
      return "Молочные продукты";
    }
    if (/куриц|курин|говяд|свин|фарш|мяс|колбас|сосиск|ветчин/.test(text)) {
      return "Мясо и птица";
    }
    if (/рыб|лосос|семг|форел|скумбр|сельд|тунец|кревет/.test(text)) {
      return "Рыба и морепродукты";
    }
    if (
      /картоф|морков|лук|чеснок|огур|помид|капуст|перец|баклаж|кабач|зелень/.test(
        text,
      )
    ) {
      return "Овощи и зелень";
    }
    if (/яблок|банан|апельсин|лимон|виноград|груш|ягод|клубник/.test(text)) {
      return "Фрукты и ягоды";
    }
    if (/сок|вода|чай|кофе|напит|лимонад/.test(text)) return "Напитки";
    if (/сахар|конфет|печен|шоколад|вафл|торт|мед/.test(text)) {
      return "Сладости";
    }
    if (/соль|перец|спец|паприк|зира|куркум|кориандр/.test(text)) {
      return "Специи";
    }
    if (/бумага|салфет|пакет|губк|порошок|гель|мыло|шампун/.test(text)) {
      return "Бытовая химия";
    }
    if (/подгуз|детск|соска|пюре|игруш/.test(text)) return "Детское";

    return "Добавлено вручную";
  }

  function isManualProduct(product: Product) {
    return Boolean(
      product.manuallyCreated ||
        product.custom ||
        product.source === "user_created" ||
        product.createdBy ||
        product.createdByUser ||
        product.category === "Добавлено вручную"
    );
  }

  function showMessage(text: string) {
    setMessage(text);

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = setTimeout(() => {
      setMessage("");
      messageTimerRef.current = null;
    }, 2200);
  }

  function productFromDoc(document: any): Product | null {
    const data = document.data();

    if (!data.name) return null;

    return {
      id: document.id,
      icon: data.icon || "🛒",
      name: cleanProductName(data.name),
      category: data.category || "Другое",
      ingredientId: data.ingredientId || document.id,
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      search: Array.isArray(data.search) ? data.search : [],
      purchaseCount: data.purchaseCount || 0,
      popular: Boolean(data.popular),
      recipeIngredient: Boolean(data.recipeIngredient),
      fridgeAllowed: data.fridgeAllowed !== false,
      shoppingAllowed: data.shoppingAllowed !== false,
      source: data.source || "",
      custom: Boolean(data.custom),
      createdBy: data.createdBy || "",
      createdByUser: data.createdByUser || "",
      manuallyCreated: Boolean(data.manuallyCreated),
    };
  }

  function findCatalogProduct(product: Product | ShoppingItem) {
    const productId = "productId" in product ? product.productId : product.id;
    const ingredientId = product.ingredientId;
    const cleanName =
      "productName" in product && product.productName
        ? cleanProductName(product.productName)
        : cleanProductName(product.name || "");

    return allProducts.find((catalogProduct) => {
      if (productId && catalogProduct.id === productId) return true;
      if (ingredientId && catalogProduct.ingredientId === ingredientId) {
        return true;
      }
      if (ingredientId && catalogProduct.id === ingredientId) return true;

      return normalizeName(catalogProduct.name) === normalizeName(cleanName);
    });
  }

  function getResolvedProduct(product: Product): Product {
    const catalogProduct = findCatalogProduct(product);

    if (!catalogProduct) return product;

    return {
      ...product,
      icon:
        !product.icon || product.icon === "🛒"
          ? catalogProduct.icon
          : product.icon,
      name: cleanProductName(product.name || catalogProduct.name),
      category: product.category || catalogProduct.category,
      ingredientId:
        product.ingredientId ||
        catalogProduct.ingredientId ||
        catalogProduct.id,
    };
  }

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "shopping"),
      (snapshot) => {
        const items: ShoppingItem[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.name) {
            items.push({
              id: document.id,
              name: data.name,
              productId: data.productId,
              ingredientId: data.ingredientId,
              productName: data.productName,
              icon: data.icon,
              category: data.category,
            });
          }
        });

        setShoppingList(items);
        setLoadingShopping(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "fridge"),
      (snapshot) => {
        const items: FridgeItem[] = [];

        snapshot.forEach((document) => {
          const data = document.data();

          if (data.name) {
            items.push({
              id: document.id,
              name: data.name,
              productId: data.productId,
              ingredientId: data.ingredientId,
            });
          }
        });

        setFridgeList(items);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = onSnapshot(
      collection(db, "families", familyId, "favoriteProducts"),
      (snapshot) => {
        const items: Product[] = [];

        snapshot.forEach((document) => {
          const product = productFromDoc(document);
          if (product) items.push(product);
        });

        items.sort((a, b) => a.name.localeCompare(b.name, "ru"));

        setFavoriteProducts(items);
        setLoadingFavorites(false);
      },
    );

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;

    const frequentQuery = query(
      collection(db, "families", familyId, "frequentProducts"),
      orderBy("purchaseCount", "desc"),
    );

    const unsubscribe = onSnapshot(frequentQuery, (snapshot) => {
      const items: Product[] = [];

      snapshot.forEach((document) => {
        const product = productFromDoc(document);
        if (product) items.push(product);
      });

      setFrequentProducts(items);
      setLoadingFrequent(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const productsQuery = query(
      collection(db, "products"),
      orderBy("name"),
    );

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const items: Product[] = [];

      snapshot.forEach((document) => {
        const product = productFromDoc(document);
        if (product) items.push(product);
      });

      setAllProducts(items);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleSearchProducts = useMemo(() => {
    const text = normalizeName(search);

    if (text.length < 2) return [];

    function getSearchScore(product: Product) {
      const name = normalizeName(product.name);
      const category = normalizeName(product.category || "");
      const terms = (product.search || []).map((item) => normalizeName(item));
      const allText = [name, category, ...terms].join(" ");

      if (name === text) return 0;
      if (terms.some((term) => term === text)) return 1;
      if (name.startsWith(text)) return 2;
      if (terms.some((term) => term.startsWith(text))) return 3;
      if (name.includes(text)) return 4;
      if (allText.includes(text)) return 5;

      return 99;
    }

    const filtered = allProducts
      .map((product) => ({ product, score: getSearchScore(product) }))
      .filter((item) => item.score < 99)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;

        const aCreated = a.product.recipeIngredient === false ? 0 : 1;
        const bCreated = b.product.recipeIngredient === false ? 0 : 1;

        if (aCreated !== bCreated) return aCreated - bCreated;

        return a.product.name.localeCompare(b.product.name, "ru");
      })
      .map((item) => item.product);

    const uniqueProducts = new Map<string, Product>();

    filtered.forEach((product) => {
      const key = normalizeName(product.name);

      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, product);
      }
    });

    return Array.from(uniqueProducts.values()).slice(0, 24);
  }, [allProducts, search]);

  function isFavorite(product: Product) {
    return favoriteProducts.some((item) => item.id === product.id);
  }

  function isProductInFridge(
    productId?: string,
    name?: string,
    ingredientId?: string,
  ) {
    return fridgeList.some((fridgeItem) => {
      if (ingredientId && fridgeItem.ingredientId) {
        return fridgeItem.ingredientId === ingredientId;
      }

      if (productId && fridgeItem.productId) {
        return fridgeItem.productId === productId;
      }

      if (name) {
        return normalizeName(fridgeItem.name) === normalizeName(name);
      }

      return false;
    });
  }

  async function toggleFavorite(product: Product) {
    if (!familyId) return;

    const resolvedProduct = getResolvedProduct(product);
    const exists = isFavorite(resolvedProduct);
    const cleanName = cleanProductName(resolvedProduct.name);
    const ingredientId = resolvedProduct.ingredientId || resolvedProduct.id;

    if (exists) {
      await deleteDoc(
        doc(db, "families", familyId, "favoriteProducts", resolvedProduct.id),
      );

      showMessage(`☆ Убрали из избранного: ${cleanName}`);
      return;
    }

    await setDoc(
      doc(db, "families", familyId, "favoriteProducts", resolvedProduct.id),
      {
        id: resolvedProduct.id,
        name: cleanName,
        icon: resolvedProduct.icon || "🛒",
        category: resolvedProduct.category || "Другое",
        productId: resolvedProduct.id,
        ingredientId,
        aliases: resolvedProduct.aliases || [],
        search: resolvedProduct.search || [],
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    showMessage(`⭐ Добавили в избранное: ${cleanName}`);
  }

  async function addProduct(product: Product) {
    if (!familyId) return;

    const resolvedProduct = getResolvedProduct(product);
    const cleanName = cleanProductName(resolvedProduct.name);
    const fullName = `${resolvedProduct.icon} ${cleanName}`;
    const ingredientId = resolvedProduct.ingredientId || resolvedProduct.id;

    const alreadyExists = shoppingList.some((item) => {
      if (item.ingredientId && item.ingredientId === ingredientId) return true;
      if (item.productId && item.productId === resolvedProduct.id) return true;

      return normalizeName(item.name) === normalizeName(fullName);
    });

    if (alreadyExists) return;

    const existsInFridge = isProductInFridge(
      resolvedProduct.id,
      fullName,
      ingredientId,
    );

    if (existsInFridge) {
      const confirmed = window.confirm(
        `⚠️ ${fullName} уже есть в холодильнике.\n\nДобавить в список покупок всё равно?`,
      );

      if (!confirmed) return;
    }

    await addDoc(collection(db, "families", familyId, "shopping"), {
      name: fullName,
      productName: cleanName,
      icon: resolvedProduct.icon,
      productId: resolvedProduct.id,
      ingredientId,
      category: resolvedProduct.category,
      createdAt: serverTimestamp(),
    });

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_add",
      title: "Добавил в покупки",
      message: fullName,
      emoji: resolvedProduct.icon || "🛒",
      itemName: fullName,
    });

    showMessage(`🛒 Добавлено в покупки: ${cleanName}`);
    setSearch("");
  }

  async function addCustomProduct(rawName: string, addToFavorites = false) {
    if (!familyId || creatingProduct) return;

    const cleanName = cleanProductName(rawName);
    const normalized = normalizeName(cleanName);

    if (normalized.length < 2) return;

    const existingProduct = allProducts.find((product) => {
      const productValues = [
        product.name,
        ...(product.aliases || []),
        ...(product.search || []),
      ];

      return productValues.some((value) => normalizeName(value) === normalized);
    });

    if (existingProduct) {
      await addProduct(existingProduct);

      if (addToFavorites && !isFavorite(existingProduct)) {
        await toggleFavorite(existingProduct);
      }

      showMessage(`✅ Такой товар уже есть в базе: ${existingProduct.name}`);
      return;
    }

    const productId = makeSafeId(cleanName) || `product-${Date.now()}`;
    const icon = guessIcon(cleanName);
    const category = guessCategory(cleanName);
    const searchTerms = buildSearchTerms(cleanName, productId);

    const newProduct: Product = {
      id: productId,
      name: cleanName,
      icon,
      category,
      ingredientId: productId,
      aliases: [],
      search: searchTerms,
      popular: false,
      recipeIngredient: false,
      fridgeAllowed: true,
      shoppingAllowed: true,
      source: "user_created",
      custom: true,
      createdBy: appUser?.uid || "unknown",
      createdByUser: appUser?.uid || "unknown",
      manuallyCreated: true,
    };

    const alreadyExistsInShopping = shoppingList.some((item) => {
      if (item.productId && item.productId === productId) return true;
      if (item.ingredientId && item.ingredientId === productId) return true;

      return (
        normalizeName(item.productName || item.name) === normalized ||
        normalizeName(item.name) === normalizeName(`${icon} ${cleanName}`)
      );
    });

    const existsInFridge = isProductInFridge(
      productId,
      `${icon} ${cleanName}`,
      productId,
    );

    if (existsInFridge) {
      const confirmed = window.confirm(
        `⚠️ ${icon} ${cleanName} уже есть в холодильнике.\n\nСоздать/добавить в список покупок всё равно?`,
      );

      if (!confirmed) return;
    }

    try {
      setCreatingProduct(true);

      await setDoc(
        doc(db, "products", productId),
        {
          ...newProduct,
          mergedIds: [productId],
          source: "user_created",
          createdBy: appUser?.uid || "unknown",
          createdByName: appUser?.displayName || "Без имени",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setAllProducts((prev) => {
        const withoutSame = prev.filter((item) => item.id !== productId);
        return [...withoutSame, newProduct].sort((a, b) =>
          a.name.localeCompare(b.name, "ru"),
        );
      });

      if (!alreadyExistsInShopping) {
        await addDoc(collection(db, "families", familyId, "shopping"), {
          name: `${icon} ${cleanName}`,
          productName: cleanName,
          icon,
          productId,
          ingredientId: productId,
          category,
          custom: true,
          createdAt: serverTimestamp(),
        });
      }

      if (addToFavorites) {
        await setDoc(
          doc(db, "families", familyId, "favoriteProducts", productId),
          {
            id: productId,
            name: cleanName,
            icon,
            category,
            productId,
            ingredientId: productId,
            aliases: [],
            search: searchTerms,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await addActivity({
        familyId,
        userId: appUser?.uid || "unknown",
        userName: appUser?.displayName || "Без имени",
        type: "product_create",
        title: "Создал товар",
        message: `${icon} ${cleanName}`,
        emoji: icon,
        itemName: `${icon} ${cleanName}`,
      });

      showMessage(
        addToFavorites
          ? `✅ Товар создан, добавлен в покупки и избранное: ${icon} ${cleanName}`
          : `✅ Товар создан в базе и добавлен в покупки: ${icon} ${cleanName}`,
      );
      setSearch("");
    } catch (error) {
      console.error("CREATE PRODUCT ERROR", error);
      showMessage("❌ Не получилось создать товар. Проверь лимиты Firebase.");
    } finally {
      setCreatingProduct(false);
    }
  }

  async function deleteManualProduct(product: Product) {
    if (!familyId) return;

    const resolvedProduct = getResolvedProduct(product);
    const cleanName = cleanProductName(resolvedProduct.name);

    if (!isManualProduct(resolvedProduct)) {
      window.alert("Удалять из базы можно только товары, которые добавлены вручную.");
      return;
    }

    const confirmed = window.confirm(
      `Удалить товар “${cleanName}” из базы продуктов?\n\nОн пропадёт из поиска, избранного и часто покупаемых. Старые покупки, холодильник и логи не трогаем.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "products", resolvedProduct.id));
      await deleteDoc(
        doc(db, "families", familyId, "favoriteProducts", resolvedProduct.id)
      );
      await deleteDoc(
        doc(db, "families", familyId, "frequentProducts", resolvedProduct.id)
      );

      setAllProducts((prev) =>
        prev.filter((item) => item.id !== resolvedProduct.id)
      );

      showMessage(`🗑️ Товар удалён из базы: ${cleanName}`);
    } catch (error) {
      console.error("DELETE PRODUCT ERROR", error);
      showMessage("❌ Не получилось удалить товар. Проверь лимиты Firebase.");
    }
  }

  async function saveFrequentProduct(item: ShoppingItem) {
    if (!familyId) return;

    const catalogProduct = findCatalogProduct(item);

    const productId =
      item.productId ||
      catalogProduct?.id ||
      makeSafeId(item.productName || item.name);

    const cleanName = cleanProductName(
      item.productName ||
        catalogProduct?.name ||
        item.name.replace(item.icon || "", ""),
    );

    const icon =
      item.icon && item.icon !== "🛒"
        ? item.icon
        : catalogProduct?.icon || "🛒";

    await setDoc(
      doc(db, "families", familyId, "frequentProducts", productId),
      {
        name: cleanName,
        icon,
        category: item.category || catalogProduct?.category || "Другое",
        productId,
        ingredientId:
          item.ingredientId ||
          catalogProduct?.ingredientId ||
          catalogProduct?.id ||
          productId,
        purchaseCount: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async function markAsBought(item: ShoppingItem) {
    if (!familyId) return;

    const productId = item.productId || undefined;
    const ingredientId = item.ingredientId || item.productId || undefined;

    const alreadyInFridge = isProductInFridge(
      productId,
      item.name,
      ingredientId,
    );

    if (!alreadyInFridge) {
      await addDoc(collection(db, "families", familyId, "fridge"), {
        name: item.name,
        productId: item.productId || null,
        ingredientId: ingredientId || null,
        productName: item.productName || cleanProductName(item.name),
        icon: item.icon || "🛒",
        category: item.category || null,
        createdAt: serverTimestamp(),
      });
    }

    await saveFrequentProduct(item);

    await deleteDoc(doc(db, "families", familyId, "shopping", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_buy",
      title: "Купил товар",
      message: item.name,
      emoji: "✅",
      itemName: item.name,
    });

    showMessage(`✅ Куплено и перенесено в холодильник: ${item.name}`);
  }

  async function removeFromShopping(item: ShoppingItem) {
    if (!familyId) return;

    await deleteDoc(doc(db, "families", familyId, "shopping", item.id));

    await addActivity({
      familyId,
      userId: appUser?.uid || "unknown",
      userName: appUser?.displayName || "Без имени",
      type: "shopping_remove",
      title: "Убрал из покупок",
      message: item.name,
      emoji: "🗑️",
      itemName: item.name,
    });

    showMessage(`🗑️ Убрали из покупок: ${item.name}`);
  }

  function ProductGrid({
    items,
    loading,
    emptyText,
  }: {
    items: Product[];
    loading: boolean;
    emptyText: string;
  }) {
    if (loading) {
      return <p className="text-sm text-slate-500">Загрузка товаров...</p>;
    }

    if (items.length === 0) {
      return <p className="text-sm text-slate-500">{emptyText}</p>;
    }

    return (
      <div className="grid grid-cols-4 gap-3">
        {items.map((originalProduct) => {
          const product = getResolvedProduct(originalProduct);
          const cleanName = cleanProductName(product.name);
          const fullName = `${product.icon} ${cleanName}`;
          const ingredientId = product.ingredientId || product.id;

          const isAdded = shoppingList.some((item) => {
            if (item.ingredientId && item.ingredientId === ingredientId) {
              return true;
            }

            if (item.productId && item.productId === product.id) {
              return true;
            }

            return normalizeName(item.name) === normalizeName(fullName);
          });

          const existsInFridge = isProductInFridge(
            product.id,
            fullName,
            ingredientId,
          );
          const favorite = isFavorite(product);
          const manualProduct = isManualProduct(product);

          return (
            <div key={product.id} className="relative">
              {manualProduct && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteManualProduct(product);
                  }}
                  className="absolute left-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm text-white shadow-md"
                  title="Удалить товар из базы"
                  aria-label="Удалить товар из базы"
                >
                  🗑️
                </button>
              )}

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(product);
                }}
                className={`absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full text-base shadow-sm transition ${
                  favorite
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-white text-slate-500"
                }`}
                title={favorite ? "Убрать из избранного" : "Добавить в избранное"}
                aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
              >
                {favorite ? "★" : "☆"}
              </button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => addProduct(product)}
                className={`min-h-[112px] w-full rounded-2xl p-3 text-center text-sm transition ${
                  isAdded
                    ? "bg-green-100 text-green-700"
                    : existsInFridge
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="text-2xl">{product.icon}</div>
                <div
                  title={cleanName}
                  className="mt-1 text-[10px] leading-[12px]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {cleanName}
                </div>

                {product.purchaseCount ? (
                  <div className="mt-1 text-[10px] text-slate-400">
                    {product.purchaseCount} раз
                  </div>
                ) : null}

                {existsInFridge && !isAdded && (
                  <div className="mt-1 text-[10px] font-medium">Есть дома</div>
                )}
              </motion.button>
            </div>
          );
        })}
      </div>
    );
  }

  const isSearching = normalizeName(search).length >= 2;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-5 pt-8 pb-4"
        >
          <p className="text-sm text-slate-500">FamilyShop</p>
          <h1 className="text-3xl font-bold">Покупки 🛒</h1>
        </motion.header>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-5 z-[9999] w-[calc(100%-40px)] max-w-md -translate-x-1/2 rounded-2xl bg-blue-500 px-4 py-3 text-center text-sm font-medium text-white shadow-xl"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="space-y-5 px-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Список покупок</h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                {shoppingList.length}
              </span>
            </div>

            {loadingShopping ? (
              <p className="text-sm text-slate-500">Загрузка...</p>
            ) : shoppingList.length === 0 ? (
              <p className="text-sm text-slate-500">
                Пока список пуст. Добавь товары через поиск, избранные или часто
                покупаемые.
              </p>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {shoppingList.map((item) => {
                    const existsInFridge = isProductInFridge(
                      item.productId,
                      item.name,
                      item.ingredientId,
                    );

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-2xl px-4 py-3 ${
                          existsInFridge ? "bg-amber-50" : "bg-slate-50"
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-2 font-medium">
                          <span
                            className={`h-4 w-4 rounded-full border ${
                              existsInFridge
                                ? "border-amber-400 bg-amber-100"
                                : "border-slate-300"
                            }`}
                          />

                          <span>{item.name}</span>
                        </div>

                        {existsInFridge && (
                          <p className="mb-3 text-xs text-amber-700">
                            Уже есть в холодильнике
                          </p>
                        )}

                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => markAsBought(item)}
                            className="flex-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-medium text-white"
                          >
                            Куплено
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => removeFromShopping(item)}
                            className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                          >
                            Убрать
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </motion.div>

          <motion.input
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
            placeholder="🔍 Найти товар от 2 букв"
          />

          {isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Результаты поиска</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Поиск работает с 2 символов
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {visibleSearchProducts.length}
                </span>
              </div>

              <ProductGrid
                items={visibleSearchProducts}
                loading={loadingProducts}
                emptyText="Ничего не найдено."
              />

              {!loadingProducts && normalizeName(search).length >= 2 && (
                <div className="mt-4 space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={creatingProduct}
                    onClick={() => addCustomProduct(search, false)}
                    className="w-full rounded-2xl bg-green-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {creatingProduct
                      ? "Создаю товар..."
                      : `➕ Создать товар “${cleanProductName(search)}”`}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={creatingProduct}
                    onClick={() => addCustomProduct(search, true)}
                    className="w-full rounded-2xl bg-yellow-100 px-4 py-3 text-sm font-semibold text-yellow-700 disabled:opacity-60"
                  >
                    ⭐ Создать и добавить в избранное
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">⭐ Избранные</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Товары, которые семья отметила звездой
                </p>
              </div>

              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">
                {favoriteProducts.length}
              </span>
            </div>

            <ProductGrid
              items={favoriteProducts}
              loading={loadingFavorites}
              emptyText="Пока нет избранных. Нажми ☆ в правом верхнем углу карточки товара."
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setShowFrequent((prev) => !prev)}
              className="mb-1 flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-lg font-semibold">🔁 Часто покупаемые</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Появляются автоматически после покупок
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {frequentProducts.length}
                </span>
                <span className="text-lg text-slate-400">
                  {showFrequent ? "▲" : "▼"}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {showFrequent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pt-4"
                >
                  <ProductGrid
                    items={
                      showAllFrequent
                        ? frequentProducts
                        : frequentProducts.slice(0, frequentVisibleCount)
                    }
                    loading={loadingFrequent}
                    emptyText="Пока пусто. Купленные товары будут появляться здесь автоматически."
                  />

                  {frequentProducts.length > 12 && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowAllFrequent((prev) => !prev)}
                      className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      {showAllFrequent
                        ? "Свернуть до 12"
                        : `Показать все ${frequentProducts.length}`}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        <BottomNav current="shopping" />
      </div>
    </main>
  );
}
