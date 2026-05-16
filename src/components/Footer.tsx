export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Cromos Universo. Todos los derechos reservados.
      </div>
    </footer>
  );
}
