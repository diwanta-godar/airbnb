import { AppDataSource } from "../config/database";
import { HeroSlide } from "../entities/HeroSlide";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import {
  deletePublicImage,
  uploadPublicImage,
} from "../services/storageService";
import { stripHtml } from "../utils/security";
import { param } from "../utils/params";

const heroRepo = () => AppDataSource.getRepository(HeroSlide);

function parseBool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value) === "true" || value === true;
}

function parseOptional(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? stripHtml(text) : null;
}

function parseSlideBody(body: Record<string, unknown>, requireTitle = true) {
  const titleRaw = body.title;
  if (requireTitle && (!titleRaw || !String(titleRaw).trim())) {
    throw new AppError("Title is required", 400);
  }

  return {
    title: titleRaw ? stripHtml(String(titleRaw)) : undefined,
    subtitle: parseOptional(body.subtitle),
    primaryCtaLabel: parseOptional(body.primaryCtaLabel),
    primaryCtaHref: parseOptional(body.primaryCtaHref),
    secondaryCtaLabel: parseOptional(body.secondaryCtaLabel),
    secondaryCtaHref: parseOptional(body.secondaryCtaHref),
    imageUrl: body.imageUrl ? stripHtml(String(body.imageUrl)) : undefined,
    imageAlt: parseOptional(body.imageAlt),
    sortOrder:
      body.sortOrder === undefined || body.sortOrder === ""
        ? undefined
        : Number(body.sortOrder),
    isActive:
      body.isActive === undefined || body.isActive === ""
        ? undefined
        : parseBool(body.isActive, true),
  };
}

/** Public: active slides only, ordered for the landing hero. */
export const listPublicHeroSlides = asyncHandler(async (_req, res) => {
  const items = await heroRepo().find({
    where: { isActive: true },
    order: { sortOrder: "ASC", createdAt: "ASC" },
  });
  res.json({ success: true, data: items });
});

/** Admin: all slides including inactive. */
export const listAdminHeroSlides = asyncHandler(async (_req, res) => {
  const items = await heroRepo().find({
    order: { sortOrder: "ASC", createdAt: "ASC" },
  });
  res.json({ success: true, data: items });
});

export const getAdminHeroSlide = asyncHandler(async (req, res) => {
  const id = param(req.params.id);
  const slide = await heroRepo().findOne({ where: { id } });
  if (!slide) throw new AppError("Hero slide not found", 404);
  res.json({ success: true, data: slide });
});

export const createAdminHeroSlide = asyncHandler(async (req, res) => {
  const parsed = parseSlideBody(req.body as Record<string, unknown>, true);
  const file = req.file as Express.Multer.File | undefined;
  const imageUrl = file
    ? await uploadPublicImage(file, "hero")
    : parsed.imageUrl;

  if (!imageUrl) {
    throw new AppError("Upload an image or provide an image URL", 400);
  }

  const slide = heroRepo().create({
    title: parsed.title!,
    subtitle: parsed.subtitle,
    primaryCtaLabel: parsed.primaryCtaLabel,
    primaryCtaHref: parsed.primaryCtaHref,
    secondaryCtaLabel: parsed.secondaryCtaLabel,
    secondaryCtaHref: parsed.secondaryCtaHref,
    imageUrl,
    imageAlt: parsed.imageAlt,
    sortOrder: Number.isFinite(parsed.sortOrder) ? parsed.sortOrder! : 0,
    isActive: parsed.isActive ?? true,
  });

  const saved = await heroRepo().save(slide);
  res.status(201).json({ success: true, data: saved });
});

export const updateAdminHeroSlide = asyncHandler(async (req, res) => {
  const id = param(req.params.id);
  const slide = await heroRepo().findOne({ where: { id } });
  if (!slide) throw new AppError("Hero slide not found", 404);

  const parsed = parseSlideBody(req.body as Record<string, unknown>, false);
  const file = req.file as Express.Multer.File | undefined;

  if (parsed.title !== undefined) slide.title = parsed.title;
  if (parsed.subtitle !== undefined) slide.subtitle = parsed.subtitle;
  if (parsed.primaryCtaLabel !== undefined)
    slide.primaryCtaLabel = parsed.primaryCtaLabel;
  if (parsed.primaryCtaHref !== undefined)
    slide.primaryCtaHref = parsed.primaryCtaHref;
  if (parsed.secondaryCtaLabel !== undefined)
    slide.secondaryCtaLabel = parsed.secondaryCtaLabel;
  if (parsed.secondaryCtaHref !== undefined)
    slide.secondaryCtaHref = parsed.secondaryCtaHref;
  if (parsed.imageAlt !== undefined) slide.imageAlt = parsed.imageAlt;
  if (parsed.sortOrder !== undefined && Number.isFinite(parsed.sortOrder)) {
    slide.sortOrder = parsed.sortOrder;
  }
  if (parsed.isActive !== undefined) slide.isActive = parsed.isActive;

  if (file) {
    const previousImageUrl = slide.imageUrl;
    slide.imageUrl = await uploadPublicImage(file, "hero");
    const saved = await heroRepo().save(slide);
    await deletePublicImage(previousImageUrl);
    res.json({ success: true, data: saved });
    return;
  } else if (parsed.imageUrl) {
    slide.imageUrl = parsed.imageUrl;
  }

  const saved = await heroRepo().save(slide);
  res.json({ success: true, data: saved });
});

export const deleteAdminHeroSlide = asyncHandler(async (req, res) => {
  const id = param(req.params.id);
  const slide = await heroRepo().findOne({ where: { id } });
  if (!slide) throw new AppError("Hero slide not found", 404);
  const imageUrl = slide.imageUrl;
  await heroRepo().remove(slide);
  await deletePublicImage(imageUrl);
  res.json({ success: true, message: "Hero slide deleted" });
});
