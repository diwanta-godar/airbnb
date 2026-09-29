import Link from "next/link";
import Image from "next/image";
import { PropertyCard } from "@/components/PropertyCard";
import { HeroSlider } from "@/components/HeroSlider";
import { apiFetch } from "@/lib/api";
import type { HeroSlide, PaginatedProperties } from "@/lib/types";

async function getFeatured() {
  try {
    return await apiFetch<PaginatedProperties>(
      "/properties?featured=true&limit=3",
      { cache: "no-store" }
    );
  } catch {
    return { items: [], pagination: { page: 1, limit: 3, total: 0, totalPages: 0 } };
  }
}

async function getHeroSlides() {
  try {
    return await apiFetch<HeroSlide[]>("/hero-slides", { cache: "no-store" });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, heroSlides] = await Promise.all([
    getFeatured(),
    getHeroSlides(),
  ]);

  return (
    <div>
      <HeroSlider slides={heroSlides} />

      <section className="px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-brand text-3xl text-ink md:text-4xl">
                Featured stays
              </h2>
              <p className="mt-2 text-muted">
                Homes and suites across Kathmandu, hosted by The Lantern Stay.
              </p>
            </div>
            <Link href="/stays" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
              View all stays
            </Link>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {!featured.items.length && (
            <p className="mt-8 text-muted">
              Listings will show once the API is running.
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-line bg-white px-4 py-16 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-brand text-3xl text-ink md:text-4xl">
              A small hospitality stay in Kathmandu
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              We rent cozy vacation homes, not hotel rooms. Expect clean linen,
              reliable hot water, and a host you can call if you need anything.
            </p>
            <Link href="/about" className="btn btn-dark mt-6">
              About us
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden bg-line">
            <Image
              src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1400&q=80"
              alt="Interior of a Lantern Stay home"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
