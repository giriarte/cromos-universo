import Link from "next/link";

export default function FailurePage() {
  return (
    <div className="text-center px-4 py-24">
      <div className="text-6xl mb-6">😕</div>
      <h1 className="text-3xl font-bold mb-3">El pago no pudo procesarse</h1>
      <p className="text-gray-500 mb-8">
        Podés intentarlo nuevamente o contactarnos si el problema persiste.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/cart"
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Volver al carrito
        </Link>
        <Link
          href="/"
          className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
