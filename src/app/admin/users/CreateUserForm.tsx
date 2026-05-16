"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      role: (form.elements.namedItem("role") as HTMLSelectElement).value,
    };

    const res = await fetch("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Error al crear usuario");
    } else {
      setSuccess(true);
      form.reset();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre">
          <input name="name" required className={ic} placeholder="Ana García" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className={ic} placeholder="ana@ejemplo.com" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contraseña">
          <input name="password" type="password" required minLength={8} className={ic} />
        </Field>
        <Field label="Rol">
          <select name="role" className={ic}>
            <option value="editor">Editor</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </Field>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">Usuario creado exitosamente.</p>}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const ic = "rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white";
