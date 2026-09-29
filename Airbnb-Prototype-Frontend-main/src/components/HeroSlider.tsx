"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import type { HeroSlide } from "@/lib/types";

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: "fallback-1",
    title: "The Lantern Stay",
    subtitle:
      "Cozy vacation home rental in Kathmandu. Quiet mornings, warm evenings, and a restful place to stay.",
    primaryCtaLabel: "Browse stays",
    primaryCtaHref: "/stays",
    secondaryCtaLabel: "Contact us",
    secondaryCtaHref: "/contact",
    imageUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=2000&q=85",
    imageAlt: "Lantern-lit vacation home exterior in Kathmandu",
    sortOrder: 0,
    isActive: true,
    createdAt: "",
  },
];

type Props = {
  slides?: HeroSlide[];
};

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function CtaLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "primary" | "ghost";
}) {
  const className = variant === "primary" ? "btn btn-primary" : "btn btn-ghost";
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function HeroSlider({ slides }: Props) {
  const items = slides?.length ? slides : FALLBACK_SLIDES;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 35 }, [
    Autoplay({ delay: 5200, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    setCanScroll(emblaApi.canScrollPrev() || emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, items]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-ink">
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {items.map((slide, i) => (
            <div
              key={slide.id}
              className="relative min-w-0 shrink-0 grow-0 basis-full"
            >
              <Image
                src={mediaUrl(slide.imageUrl) || slide.imageUrl}
                alt={slide.imageAlt || slide.title}
                fill
                priority={i === 0}
                className="object-cover"
                sizes="100vw"
              />
              <div className="hero-shade pointer-events-none absolute inset-0" />
              <div className="absolute inset-0 flex items-end px-4 pb-16 pt-28 md:px-6 md:pb-20">
                <div className="mx-auto w-full max-w-6xl">
                  <div className="max-w-xl">
                    <h1 className="font-brand text-4xl leading-tight text-white md:text-6xl">
                      {slide.title}
                    </h1>
                    {slide.subtitle && (
                      <p className="mt-4 max-w-lg text-base text-white/90 md:text-lg">
                        {slide.subtitle}
                      </p>
                    )}
                    {(slide.primaryCtaLabel && slide.primaryCtaHref) ||
                    (slide.secondaryCtaLabel && slide.secondaryCtaHref) ? (
                      <div className="mt-7 flex flex-wrap gap-3">
                        {slide.primaryCtaLabel && slide.primaryCtaHref && (
                          <CtaLink
                            href={slide.primaryCtaHref}
                            label={slide.primaryCtaLabel}
                            variant="primary"
                          />
                        )}
                        {slide.secondaryCtaLabel && slide.secondaryCtaHref && (
                          <CtaLink
                            href={slide.secondaryCtaHref}
                            label={slide.secondaryCtaLabel}
                            variant="ghost"
                          />
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {canScroll && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center text-white/85 transition hover:text-white md:left-4 lg:left-6"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center text-white/85 transition hover:text-white md:right-4 lg:right-6"
          >
            <ChevronRight className="h-7 w-7" strokeWidth={2.25} />
          </button>
        </>
      )}

      {canScroll && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 px-4 md:bottom-8 md:px-6">
          <div className="pointer-events-auto mx-auto flex max-w-6xl items-center gap-2">
            {items.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  selected === i
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
