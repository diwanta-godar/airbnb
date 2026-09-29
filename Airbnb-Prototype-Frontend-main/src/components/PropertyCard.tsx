"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Property } from "@/lib/types";
import { formatMoney, mediaUrl } from "@/lib/api";

function NavArrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  const position = side === "left" ? "left-2" : "right-2";

  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous image" : "Next image"}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-10 -translate-y-1/2 ${position} ${
        disabled
          ? "pointer-events-none opacity-0"
          : "opacity-0 group-hover:opacity-100"
      } transition-opacity duration-250 ease-out`}
    >
      <span className="grid h-8 w-8 place-items-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] transition-transform duration-200 hover:scale-110 active:scale-95">
        <Icon className="h-6 w-6" strokeWidth={2.5} />
      </span>
    </button>
  );
}

export function PropertyCard({ property }: { property: Property }) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const rating = Number(property.averageRating);

  const images = useMemo(() => {
    const list = [...(property.images || [])].sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    if (!list.length) {
      return [
        {
          id: "fallback",
          url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
          alt: property.title,
        },
      ];
    }
    return list;
  }, [property.images, property.title]);

  const hasMultiple = images.length > 1;
  const atStart = index === 0;
  const atEnd = index === images.length - 1;

  function go(e: React.MouseEvent, direction: -1 | 1) {
    e.preventDefault();
    e.stopPropagation();
    if (animating) return;

    setIndex((prev) => {
      const next = prev + direction;
      if (next < 0 || next >= images.length) return prev;
      return next;
    });
    setAnimating(true);
    window.setTimeout(() => setAnimating(false), 380);
  }

  return (
    <Link href={`/stays/${property.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-line">
        <div
          className="flex h-full w-full transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative h-full w-full shrink-0 grow-0 basis-full"
            >
              <Image
                src={mediaUrl(img.url)}
                alt={img.alt || property.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {hasMultiple && (
          <>
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/30 via-black/10 to-transparent" />
            </div>

            <NavArrow
              side="left"
              disabled={atStart}
              onClick={(e) => go(e, -1)}
            />
            <NavArrow
              side="right"
              disabled={atEnd}
              onClick={(e) => go(e, 1)}
            />

            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-2.5 py-1.5 opacity-0 shadow-sm backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
              {images.map((img, i) => (
                <span
                  key={img.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                    i === index
                      ? "w-5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.55)]"
                      : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-ink transition-colors group-hover:text-ink/80">
            {property.title}
          </h3>
          {rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-muted">
              <Star className="h-3.5 w-3.5 fill-ink text-ink" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">
          {property.city} · {property.bedrooms} bed · {property.maxGuests} guests
        </p>
        <p className="text-sm">
          <span className="font-semibold">
            {formatMoney(property.pricePerNight, property.currency)}
          </span>{" "}
          <span className="text-muted">night</span>
        </p>
      </div>
    </Link>
  );
}
