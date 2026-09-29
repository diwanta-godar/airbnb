"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, mediaUrl } from "@/lib/api";
import type { HeroSlide } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

type Props = {
  slideId?: string;
};

export default function HeroSlideEditor({ slideId }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    primaryCtaLabel: "Browse stays",
    primaryCtaHref: "/stays",
    secondaryCtaLabel: "Contact us",
    secondaryCtaHref: "/contact",
    imageUrl: "",
    imageAlt: "",
    sortOrder: "0",
    isActive: true,
  });

  useEffect(() => {
    if (!slideId || !token) return;
    apiFetch<HeroSlide>(`/admin/hero-slides/${slideId}`, { token })
      .then((slide) => {
        setForm({
          title: slide.title,
          subtitle: slide.subtitle || "",
          primaryCtaLabel: slide.primaryCtaLabel || "",
          primaryCtaHref: slide.primaryCtaHref || "",
          secondaryCtaLabel: slide.secondaryCtaLabel || "",
          secondaryCtaHref: slide.secondaryCtaHref || "",
          imageUrl: slide.imageUrl.startsWith("http") ? slide.imageUrl : "",
          imageAlt: slide.imageAlt || "",
          sortOrder: String(slide.sortOrder),
          isActive: slide.isActive,
        });
        setExistingImageUrl(slide.imageUrl);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load slide")
      );
  }, [slideId, token]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);

    try {
      if (!file && !form.imageUrl && !existingImageUrl) {
        throw new Error("Upload an image or paste an image URL");
      }

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("subtitle", form.subtitle);
      fd.append("primaryCtaLabel", form.primaryCtaLabel);
      fd.append("primaryCtaHref", form.primaryCtaHref);
      fd.append("secondaryCtaLabel", form.secondaryCtaLabel);
      fd.append("secondaryCtaHref", form.secondaryCtaHref);
      fd.append("imageAlt", form.imageAlt);
      fd.append("sortOrder", form.sortOrder);
      fd.append("isActive", String(form.isActive));
      if (form.imageUrl.trim()) {
        fd.append("imageUrl", form.imageUrl.trim());
      }
      if (file) {
        fd.append("image", file);
      }

      if (slideId) {
        await apiUpload(`/admin/hero-slides/${slideId}`, fd, {
          method: "PATCH",
          token,
        });
      } else {
        await apiUpload("/admin/hero-slides", fd, { method: "POST", token });
      }
      router.push("/admin/hero");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const previewSrc =
    preview ||
    (form.imageUrl.trim()
      ? form.imageUrl.trim()
      : mediaUrl(existingImageUrl) || existingImageUrl);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="font-brand text-3xl">
          {slideId ? "Edit hero slide" : "New hero slide"}
        </h2>
        <p className="mt-1 text-muted">
          Title, copy, CTAs, and image appear on the landing hero.
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
          Subtitle
          <textarea
            className="field mt-1 min-h-24"
            value={form.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Primary button label
            <input
              className="field mt-1"
              value={form.primaryCtaLabel}
              onChange={(e) => update("primaryCtaLabel", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Primary button link
            <input
              className="field mt-1"
              placeholder="/stays"
              value={form.primaryCtaHref}
              onChange={(e) => update("primaryCtaHref", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Secondary button label
            <input
              className="field mt-1"
              value={form.secondaryCtaLabel}
              onChange={(e) => update("secondaryCtaLabel", e.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            Secondary button link
            <input
              className="field mt-1"
              placeholder="/contact"
              value={form.secondaryCtaHref}
              onChange={(e) => update("secondaryCtaHref", e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Sort order
            <input
              type="number"
              className="field mt-1"
              value={form.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
            />
            Active on homepage
          </label>
        </div>
      </div>

      <div className="grid gap-3 border border-[#e8dfd4] bg-white p-5">
        <label className="text-sm font-medium">
          Image alt text
          <input
            className="field mt-1"
            value={form.imageAlt}
            onChange={(e) => update("imageAlt", e.target.value)}
          />
        </label>

        <label className="text-sm font-medium">
          Image URL (optional)
          <input
            className="field mt-1"
            placeholder="https://..."
            value={form.imageUrl}
            onChange={(e) => update("imageUrl", e.target.value)}
          />
        </label>

        <label className="text-sm font-medium">
          Or upload image
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Slide preview"
            className="mt-2 aspect-[16/9] w-full object-cover"
          />
        ) : null}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn btn-dark">
          {loading ? "Saving…" : "Save slide"}
        </button>
        <button
          type="button"
          className="border border-line px-4 py-2 text-sm font-medium"
          onClick={() => router.push("/admin/hero")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
