"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";

const DURATION_MS = 20 * 60 * 1000; // 20 minutes
const TIMER_KEY = "cromos-cart-timer-start";

type AlertLevel = "five" | "one" | "expired" | null;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function CartTimer() {
  const { items, clear, isHydrated } = useCart();
  const hasItems = items.length > 0;

  const [remaining, setRemaining] = useState<number | null>(null);
  const [alert, setAlert] = useState<AlertLevel>(null);
  const alertShownRef = useRef<Set<AlertLevel>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start or restore timer when items appear; clear when cart empties
  useEffect(() => {
    // Wait until localStorage has been read before deciding the cart is empty
    if (!isHydrated) return;

    if (!hasItems) {
      localStorage.removeItem(TIMER_KEY);
      setRemaining(null);
      alertShownRef.current = new Set();
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Restore or initialise start time
    let start = Number(localStorage.getItem(TIMER_KEY));
    if (!start || isNaN(start)) {
      start = Date.now();
      localStorage.setItem(TIMER_KEY, String(start));
    }

    function tick() {
      const elapsed = Date.now() - start;
      const left = DURATION_MS - elapsed;

      if (left <= 0) {
        setRemaining(0);
        if (!alertShownRef.current.has("expired")) {
          alertShownRef.current.add("expired");
          setAlert("expired");
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      setRemaining(left);

      if (left <= 60_000 && !alertShownRef.current.has("one")) {
        alertShownRef.current.add("one");
        setAlert("one");
      } else if (left <= 5 * 60_000 && !alertShownRef.current.has("five")) {
        alertShownRef.current.add("five");
        setAlert("five");
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasItems, isHydrated]);

  // When timer expires, clear the cart after showing the modal
  function handleExpiredClose() {
    setAlert(null);
    clear();
    localStorage.removeItem(TIMER_KEY);
  }

  function handleAlertClose() {
    setAlert(null);
  }

  if (!hasItems || remaining === null) return null;

  const isLow = remaining <= 5 * 60_000;

  return (
    <>
      {/* Floating timer badge */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-mono font-semibold transition-colors ${
          isLow
            ? "bg-red-600 text-white animate-pulse"
            : "bg-indigo-600 text-white"
        }`}
      >
        <span>🛒</span>
        <span>{formatTime(remaining)}</span>
      </div>

      {/* Alert modal */}
      {alert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 text-center">
            {alert === "five" && (
              <>
                <div className="text-4xl mb-3">⏳</div>
                <h2 className="text-xl font-bold mb-2">¡Quedan 5 minutos!</h2>
                <p className="text-gray-600 text-sm mb-5">
                  Tu carrito se vaciará automáticamente cuando el tiempo llegue a cero, para que los artículos queden disponibles para otros usuarios.
                </p>
                <button
                  onClick={handleAlertClose}
                  className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Entendido
                </button>
              </>
            )}
            {alert === "one" && (
              <>
                <div className="text-4xl mb-3">🚨</div>
                <h2 className="text-xl font-bold mb-2">¡Queda 1 minuto!</h2>
                <p className="text-gray-600 text-sm mb-5">
                  Completá tu compra ahora o tu carrito será vaciado en menos de un minuto.
                </p>
                <button
                  onClick={handleAlertClose}
                  className="w-full bg-red-600 text-white rounded-xl py-2.5 font-semibold hover:bg-red-700 transition-colors"
                >
                  Ir al carrito
                </button>
              </>
            )}
            {alert === "expired" && (
              <>
                <div className="text-4xl mb-3">🕐</div>
                <h2 className="text-xl font-bold mb-2">El tiempo expiró</h2>
                <p className="text-gray-600 text-sm mb-5">
                  Tu carrito fue vaciado para que los artículos queden disponibles para otros usuarios. Podés volver a agregar los artículos que te interesan.
                </p>
                <button
                  onClick={handleExpiredClose}
                  className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Aceptar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
