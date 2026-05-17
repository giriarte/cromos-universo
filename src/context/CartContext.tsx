"use client";

import { createContext, useContext, useReducer, useEffect, useRef, useState } from "react";
import type { CartItem } from "@/types/database";

type State = { items: CartItem[] };
type Action =
  | { type: "ADD"; article: CartItem["article"]; quantity: number }
  | { type: "REMOVE"; articleId: string }
  | { type: "UPDATE_QTY"; articleId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "RESTORE"; items: CartItem[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find((i) => i.article.id === action.article.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.article.id === action.article.id
              ? { ...i, quantity: i.quantity + action.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, { article: action.article, quantity: action.quantity }] };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.article.id !== action.articleId) };
    case "UPDATE_QTY":
      return {
        items: state.items.map((i) =>
          i.article.id === action.articleId ? { ...i, quantity: action.quantity } : i
        ),
      };
    case "CLEAR":
      return { items: [] };
    case "RESTORE":
      return { items: action.items };
    default:
      return state;
  }
}

async function callStockApi(articleId: string, amount: number, direction: "decrement" | "increment") {
  const res = await fetch("/api/stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId, amount, direction }),
  });
  return res;
}

const CartContext = createContext<{
  items: CartItem[];
  isHydrated: boolean;
  add: (article: CartItem["article"], quantity?: number) => Promise<{ ok: boolean; error?: string }>;
  remove: (articleId: string) => Promise<void>;
  updateQty: (articleId: string, newQty: number) => Promise<boolean>;
  clear: () => Promise<void>;
  clearForOrder: () => void;
  totalItems: number;
  totalPrice: number;
} | null>(null);

const STORAGE_KEY = "cromos-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const [isHydrated, setIsHydrated] = useState(false);

  // Always keep a ref to the latest items so async functions don't use stale closures
  const itemsRef = useRef<CartItem[]>([]);
  useEffect(() => { itemsRef.current = state.items; }, [state.items]);

  // Restore from localStorage without touching stock (stock was already decremented when items were added)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed: CartItem[] = JSON.parse(saved ?? "[]");
      if (parsed.length > 0) dispatch({ type: "RESTORE", items: parsed });
    } catch {}
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce((s, i) => s + i.article.price * i.quantity, 0);

  async function add(article: CartItem["article"], quantity = 1): Promise<{ ok: boolean; error?: string }> {
    const res = await callStockApi(article.id, quantity, "decrement");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "Sin stock" };
    }
    dispatch({ type: "ADD", article, quantity });
    return { ok: true };
  }

  async function remove(articleId: string): Promise<void> {
    const item = itemsRef.current.find((i) => i.article.id === articleId);
    if (item) {
      await callStockApi(articleId, item.quantity, "increment").catch(() => {});
    }
    dispatch({ type: "REMOVE", articleId });
  }

  async function updateQty(articleId: string, newQty: number): Promise<boolean> {
    const item = itemsRef.current.find((i) => i.article.id === articleId);
    if (!item) return false;
    const delta = newQty - item.quantity;
    if (delta === 0) return true;

    if (delta > 0) {
      const res = await callStockApi(articleId, delta, "decrement");
      if (!res.ok) return false;
    } else {
      await callStockApi(articleId, -delta, "increment").catch(() => {});
    }
    dispatch({ type: "UPDATE_QTY", articleId, quantity: newQty });
    return true;
  }

  // Restores stock for every item then clears — use this for timer expiry / manual clear
  async function clear(): Promise<void> {
    await Promise.all(
      itemsRef.current.map((item) =>
        callStockApi(item.article.id, item.quantity, "increment").catch(() => {})
      )
    );
    dispatch({ type: "CLEAR" });
  }

  // Clears without restoring stock — use this after a successful order (stock stays reserved)
  function clearForOrder(): void {
    dispatch({ type: "CLEAR" });
  }

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isHydrated,
        add,
        remove,
        updateQty,
        clear,
        clearForOrder,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
