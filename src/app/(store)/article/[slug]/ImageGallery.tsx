"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  thumbnail: string | null;
  images: string[];
  title: string;
};

export default function ImageGallery({ thumbnail, images, title }: Props) {
  const allImages = [thumbnail, ...images].filter(Boolean) as string[];
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
        <Image src={allImages[selected]} alt={`${title} imagen ${selected + 1}`} fill className="object-cover" />
      </div>
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                selected === i ? "border-indigo-600" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={url} alt={`miniatura ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
