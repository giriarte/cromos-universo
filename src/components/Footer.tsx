export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 space-y-1">
        <p>© {new Date().getFullYear()} Cromos Universo. Todos los derechos reservados.</p>
        <p>
          Sitio creado por{" "}
          <a
            href="https://ceremonylabs.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700 transition-colors"
          >
            Ceremony Labs
          </a>
        </p>
      </div>
    </footer>
  );
}
