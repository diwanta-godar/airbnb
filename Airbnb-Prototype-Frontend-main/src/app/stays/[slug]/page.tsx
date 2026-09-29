import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { BookingWidget } from "@/components/BookingWidget";
import { apiFetch, formatMoney } from "@/lib/api";
import type { Property } from "@/lib/types";

async function getProperty(slug: string) {
  try {
    return await apiFetch<Property>(`/properties/${slug}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return { title: "Stay not found" };
  return {
    title: property.title,
    description: property.description.slice(0, 160),
  };
}

export default async function StayDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const rating = Number(property.averageRating);
  const images = [...(property.images || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <div className="page-shell px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-brand text-3xl text-ink md:text-4xl">
              {property.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
              {rating > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <Star className="h-4 w-4 fill-ink text-ink" />
                  {rating.toFixed(1)} ({property.reviewCount} reviews)
                </span>
              )}
              <span>
                {property.city}, {property.country}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-4 md:grid-rows-2">
          <div className="relative aspect-[4/3] overflow-hidden bg-line md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[400px]">
            <Image
              src={images[0]?.url || ""}
              alt={images[0]?.alt || property.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {images.slice(1, 5).map((img) => (
            <div
              key={img.id}
              className="relative hidden aspect-[4/3] overflow-hidden bg-line md:block"
            >
              <Image
                src={img.url}
                alt={img.alt || property.title}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.45fr_0.8fr]">
          <div>
            <div className="border-b border-line pb-6">
              <p className="text-lg text-ink">
                {property.propertyType.replaceAll("_", " ")} · The Lantern Stay
              </p>
              <p className="mt-1 text-muted">
                {property.maxGuests} guests · {property.bedrooms} bedrooms ·{" "}
                {property.beds} beds · {property.bathrooms} baths
              </p>
            </div>

            <div className="py-6">
              <h2 className="text-xl font-semibold text-ink">About this stay</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">
                {property.description}
              </p>
            </div>

            {!!property.amenities?.length && (
              <div className="border-t border-line py-6">
                <h2 className="text-xl font-semibold text-ink">Amenities</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {property.amenities.map((a) => (
                    <li key={a.id} className="border border-line bg-white px-3 py-2 text-sm">
                      {a.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!property.reviews?.length && (
              <div className="border-t border-line py-6">
                <h2 className="text-xl font-semibold text-ink">Reviews</h2>
                <div className="mt-4 space-y-4">
                  {property.reviews.map((review) => (
                    <article key={review.id} className="border border-line bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {review.author?.firstName} {review.author?.lastName}
                        </p>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-ink text-ink" />
                          {review.rating}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {review.comment}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-line py-6 text-sm text-muted">
              <p>
                From {formatMoney(property.pricePerNight, property.currency)} per
                night. Cleaning fee{" "}
                {formatMoney(property.cleaningFee, property.currency)}.
              </p>
              <p className="mt-1">{property.address}</p>
            </div>
          </div>

          <div>
            <BookingWidget property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
