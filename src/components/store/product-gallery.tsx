"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: Array<{ id: string; url: string; alt: string | null }>; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const current = images[active];

  if (!current) {
    return (
      <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-line bg-white text-silver">
        <ImageOff className="size-16" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-white"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(min-width:1024px) 600px, 100vw"
          className="object-contain p-2 transition-transform duration-200"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border-2 bg-white transition-colors",
                i === active ? "border-acma" : "border-transparent hover:border-line-strong",
              )}
              aria-label={`Ver imagen ${i + 1} de ${images.length}`}
              aria-current={i === active}
            >
              <Image src={img.url} alt="" fill sizes="100px" className="object-contain p-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
