import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartTimer from "@/components/CartTimer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">{children}</main>
      <Footer />
      <CartTimer />
    </>
  );
}
