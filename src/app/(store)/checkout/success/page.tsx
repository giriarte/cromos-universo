import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="text-center py-24">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-bold mb-3">¡Pedido recibido!</h1>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Tu pedido fue registrado y está pendiente de confirmación. Te contactaremos pronto.
      </p>
      <Link
        href="/"
        className="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
