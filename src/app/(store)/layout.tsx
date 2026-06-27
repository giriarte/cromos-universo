import { createServiceClient } from "@/lib/supabase";
import type { Category } from "@/types/database";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartTimer from "@/components/CartTimer";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  const categories = (data ?? []) as Category[];

  return (
    <>
      <Header categories={categories} />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CartTimer />
    </>
  );
}
