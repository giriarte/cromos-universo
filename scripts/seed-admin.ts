/**
 * Run: npx tsx scripts/seed-admin.ts
 * Creates the first superadmin user in the database.
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const name = "Admin";
const email = "admin@cromosuniverso.com";
const password = "cambiar123"; // Change after first login!

async function main() {
  const password_hash = await bcrypt.hash(password, 12);
  const { error } = await supabase.from("admin_users").insert({
    name,
    email,
    password_hash,
    role: "superadmin",
  });

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`✓ Admin created: ${email} / ${password}`);
    console.log("  Change the password after your first login!");
  }
}

main();
