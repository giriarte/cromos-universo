"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Article, ArticleImage, Category } from "@/types/database";
import { dailyPrefix } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  price: z.number({ message: "Ingresá un precio válido" }).positive("Debe ser mayor a 0"),
  stock: z.number({ message: "Ingresá un stock válido" }).int().min(0),
  status: z.enum(["active", "inactive"]),
  category_id: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  article?: Article & { article_images?: ArticleImage[] };
  categories: Category[];
};

export default function ArticleForm({ article, categories }: Props) {
  const router = useRouter();
  const isEditing = !!article;

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(article?.thumbnail_url ?? null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ArticleImage[]>(article?.article_images ?? []);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: article?.title ?? "",
      description: article?.description ?? "",
      price: article?.price ?? 0,
      stock: article?.stock ?? 0,
      status: article?.status ?? "active",
      category_id: article?.category_id ?? null,
    },
  });

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  function handleExtraFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setExtraFiles((prev) => [...prev, ...files]);
  }

  function removeExtraFile(index: number) {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(id: string) {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedImageIds((prev) => [...prev, id]);
  }

  async function uploadFile(file: File, path: string): Promise<string> {
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: path, contentType: file.type }),
    });
    const { url, publicUrl } = await res.json();
    await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    return publicUrl;
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    try {
      let thumbnailUrl = article?.thumbnail_url ?? null;

      if (thumbnail) {
        const ext = thumbnail.name.split(".").pop();
        thumbnailUrl = await uploadFile(thumbnail, `${dailyPrefix()}${Date.now()}-thumb.${ext}`);
      }

      const extraUrls: string[] = [];
      for (const file of extraFiles) {
        const ext = file.name.split(".").pop();
        const url = await uploadFile(file, `${dailyPrefix()}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
        extraUrls.push(url);
      }

      const body = {
        ...values,
        thumbnail_url: thumbnailUrl,
        extra_image_urls: extraUrls,
        removed_image_ids: removedImageIds,
      };

      const url = isEditing ? `/api/articles/${article.id}` : "/api/articles";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      router.push("/admin/articles");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
        <h2 className="font-semibold">Información</h2>

        <Field label="Título" error={errors.title?.message}>
          <input {...register("title")} className={ic(!!errors.title)} />
        </Field>

        <Field label="Descripción" error={errors.description?.message}>
          <textarea {...register("description")} rows={4} className={ic(false) + " resize-none"} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio (ARS)" error={errors.price?.message}>
            <input {...register("price", { valueAsNumber: true })} type="number" step="0.01" className={ic(!!errors.price)} />
          </Field>
          <Field label="Stock" error={errors.stock?.message}>
            <input {...register("stock", { valueAsNumber: true })} type="number" className={ic(!!errors.stock)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Estado" error={errors.status?.message}>
            <select {...register("status")} className={ic(false)}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </Field>

          <Field label="Categoría" error={undefined}>
            <select {...register("category_id")} className={ic(false)}>
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </Field>
        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
        <h2 className="font-semibold">Imagen principal (thumbnail)</h2>

        {thumbnailPreview && (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
            <Image src={thumbnailPreview} alt="thumbnail" fill className="object-cover" />
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleThumbnailChange}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
        <h2 className="font-semibold">Imágenes adicionales</h2>

        {existingImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingImages.map((img) => (
              <div key={img.id} className="relative group">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                  <Image src={img.url} alt="imagen adicional" fill className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeExistingImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {extraFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extraFiles.map((file, i) => (
              <div key={i} className="relative group">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-dashed border-indigo-300 bg-indigo-50">
                  <Image src={URL.createObjectURL(file)} alt={file.name} fill className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeExtraFile(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleExtraFilesChange}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear artículo"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/articles")}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ic(hasError: boolean) {
  return `rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition w-full ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
  }`;
}
