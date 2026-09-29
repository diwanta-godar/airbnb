"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { apiFetch, apiUpload, mediaUrl } from "@/lib/api";
import type { Amenity, Property } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

const PROPERTY_TYPES = [
  { value: "entire_home", label: "Entire home" },
  { value: "private_room", label: "Private room" },
  { value: "shared_room", label: "Shared room" },
];

type Props = {
  propertyId?: string;
};

export default function StayEditor({ propertyId }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<Property["images"]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "entire_home",
    address: "",
    city: "Kathmandu",
    state: "Bagmati",
    country: "Nepal",
    pricePerNight: "6500",
    currency: "NPR",
    maxGuests: "2",
    bedrooms: "1",
    beds: "1",
    bathrooms: "1",
    cleaningFee: "1000",
    serviceFeePercent: "10",
    isFeatured: false,
  });

  useEffect(() => {
    apiFetch<Amenity[]>("/properties/amenities/all")
      .then(setAmenities)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!propertyId || !token) return;
    apiFetch<Property[]>("/admin/properties", { token })
      .then((all) => {
        const property = all.find((p) => p.id === propertyId);
        if (!property) {
          setError("Stay not found");
          return;
        }
        setForm({
          title: property.title,
          description: property.description,
          propertyType: property.propertyType,
          address: property.address,
          city: property.city,
          state: property.state,
          country: property.country,
          pricePerNight: String(Number(property.pricePerNight)),
          currency: property.currency,
          maxGuests: String(property.maxGuests),
          bedrooms: String(property.bedrooms),
          beds: String(property.beds),
          bathrooms: String(property.bathrooms),
          cleaningFee: String(property.cleaningFee),
          serviceFeePercent: String(property.serviceFeePercent),
          isFeatured: property.isFeatured,
        });
        setSelectedAmenities(property.amenities?.map((a) => a.id) || []);
        setExistingImages(
          [...(property.images || [])].sort((a, b) => a.sortOrder - b.sortOrder)
        );
        setRemoveImageIds([]);
        setNewFiles([]);
        setNewPreviews([]);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load stay")
      );
  }, [propertyId, token]);

  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setNewPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newFiles]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function removeExistingImage(id: string) {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemoveImageIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    setNewFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);

    try {
      if (existingImages.length + newFiles.length < 1) {
        throw new Error("Keep or upload at least one image");
      }

      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        fd.append(key, String(value));
      });
      fd.append("amenityIds", JSON.stringify(selectedAmenities));

      if (propertyId && removeImageIds.length) {
        fd.append("removeImageIds", JSON.stringify(removeImageIds));
      }

      newFiles.forEach((file) => fd.append("images", file));

      if (propertyId) {
        await apiUpload(`/admin/properties/${propertyId}`, fd, {
          method: "PATCH",
          token,
        });
      } else {
        await apiUpload("/admin/properties", fd, { method: "POST", token });
      }
      router.push("/admin/stays");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="font-brand text-3xl">
          {propertyId ? "Edit stay" : "New stay"}
        </h2>
        <p className="mt-1 text-muted">
          All fields appear on the public website dynamically.
        </p>
      </div>

      <div className="grid gap-3 border border-[#e8dfd4] bg-white p-5">
        <label className="text-sm font-medium">
          Title
          <input
            required
            className="field mt-1"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Description
          <textarea
            required
            rows={5}
            className="field mt-1"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Property type
          <select
            className="field mt-1"
            value={form.propertyType}
            onChange={(e) => update("propertyType", e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Address
          <input
            required
            className="field mt-1"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">
            City
            <input
              className="field mt-1"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            State
            <input
              className="field mt-1"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Country
            <input
              className="field mt-1"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Price / night
            <input
              required
              type="number"
              min={1}
              className="field mt-1"
              value={form.pricePerNight}
              onChange={(e) => update("pricePerNight", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Cleaning fee
            <input
              type="number"
              min={0}
              className="field mt-1"
              value={form.cleaningFee}
              onChange={(e) => update("cleaningFee", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Service fee %
            <input
              type="number"
              min={0}
              max={30}
              className="field mt-1"
              value={form.serviceFeePercent}
              onChange={(e) => update("serviceFeePercent", e.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-sm font-medium">
            Guests
            <input
              type="number"
              min={1}
              className="field mt-1"
              value={form.maxGuests}
              onChange={(e) => update("maxGuests", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Bedrooms
            <input
              type="number"
              min={0}
              className="field mt-1"
              value={form.bedrooms}
              onChange={(e) => update("bedrooms", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Beds
            <input
              type="number"
              min={1}
              className="field mt-1"
              value={form.beds}
              onChange={(e) => update("beds", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Bathrooms
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="field mt-1"
              value={form.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => update("isFeatured", e.target.checked)}
          />
          Featured on homepage
        </label>
      </div>

      <div className="border border-[#e8dfd4] bg-white p-5">
        <h3 className="font-semibold">Amenities</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {amenities.map((a) => {
            const checked = selectedAmenities.includes(a.id);
            return (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelectedAmenities((prev) =>
                      checked
                        ? prev.filter((id) => id !== a.id)
                        : [...prev, a.id]
                    )
                  }
                />
                {a.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="border border-[#e8dfd4] bg-white p-5">
        <h3 className="font-semibold">Images</h3>
        <p className="mt-1 text-sm text-muted">
          Remove photos you no longer want, then add new ones. At least one image
          is required.
        </p>

        {!!existingImages.length && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Current photos
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {existingImages.map((img) => (
                <div
                  key={img.id}
                  className="relative overflow-hidden border border-[#e8dfd4] bg-[#faf8f5]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(img.url)}
                    alt={img.alt || form.title}
                    className="h-28 w-full object-cover"
                  />
                  {img.isCover && (
                    <span className="absolute left-2 top-2 bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img.id)}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!!newFiles.length && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              New photos to upload
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {newPreviews.map((src, index) => (
                <div
                  key={`${newFiles[index]?.name}-${index}`}
                  className="relative overflow-hidden border border-[#e8dfd4] bg-[#faf8f5]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={newFiles[index]?.name || "New upload"}
                    className="h-28 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white hover:bg-black/80"
                    aria-label="Remove new image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="mt-4 block text-sm font-medium">
          {propertyId ? "Add new images" : "Upload images"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-2 block w-full text-sm"
            onChange={(e) => {
              onPickFiles(e.target.files);
              e.target.value = "";
            }}
            required={!propertyId && existingImages.length + newFiles.length === 0}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn btn-dark">
          {loading ? "Saving..." : propertyId ? "Update stay" : "Create stay"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/stays")}
          className="border border-line px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
