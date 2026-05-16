"use client";

import { createContext, useContext, useReducer, useEffect } from "react";
import type { CartItem, Article } from "@/types/database";

type State = { items: CartItem[] };
type Action =
  | { type: "ADD"; article: CartItem["article"]; quantity?: number }
  | { type: "REMOVE"; articleId: string }
  | { type: "UPDATE_QTY"; articleId: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find((i) => i.article.id === action.article.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.article.id === action.article.id
              ? { ...i, quantity: Math.min(i.quantity + (action.quantity ?? 1), i.article.stock) }
              : i
          ),
        };
      }
      return { items: [...state.items, { article: action.article, quantity: action.quantity ?? 1 }] };
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
    default:
      return state;
  }
}

const CartContext = createContext<{
  items: CartItem[];
  add: (article: CartItem["article"], quantity?: number) => void;
  remove: (articleId: string) => void;
  updateQty: (articleId: string, quantity: number) => void;
  clear: () => void;
  totalItems: number;
  totalPrice: number;
} | null>(null);

const STORAGE_KEY = "cromos-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: "CLEAR" });
      const parsed: CartItem[] = JSON.parse(saved ?? "[]");
      parsed.forEach((item) => dispatch({ type: "ADD", article: item.article, quantity: item.quantity }));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce((s, i) => s + i.article.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        add: (article, quantity) => dispatch({ type: "ADD", article, quantity }),
        remove: (articleId) => dispatch({ type: "REMOVE", articleId }),
        updateQty: (articleId, quantity) => dispatch({ type: "UPDATE_QTY", articleId, quantity }),
        clear: () => dispatch({ type: "CLEAR" }),
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
