import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Booking } from "../entities/Booking";
import { Property } from "../entities/Property";
import { PropertyImage } from "../entities/PropertyImage";
import { Amenity } from "../entities/Amenity";
import { User } from "../entities/User";
import { BookingStatus, UserRole } from "../entities/enums";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { publicUploadUrl } from "../middleware/upload";
import { slugify, stripHtml } from "../utils/security";
import { param } from "../utils/params";
import {
  CreatePropertyInput,
  updatePropertySchema,
} from "../validators/schemas";

const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);
const amenityRepo = () => AppDataSource.getRepository(Amenity);
const userRepo = () => AppDataSource.getRepository(User);
const imageRepo = () => AppDataSource.getRepository(PropertyImage);

export const getStats = asyncHandler(async (_req, res) => {
  const [properties, bookings, users, pending] = await Promise.all([
    propertyRepo().count(),
    bookingRepo().count(),
    userRepo().count({ where: { role: UserRole.USER } }),
    bookingRepo().count({ where: { status: BookingStatus.PENDING } }),
  ]);

  res.json({
    success: true,
    data: {
      properties,
      bookings,
      users,
      pendingBookings: pending,
    },
  });
});

export const listAllBookings = asyncHandler(async (_req, res) => {
  const bookings = await bookingRepo().find({
    relations: ["property", "property.images", "guest"],
    order: { createdAt: "DESC" },
  });
  res.json({ success: true, data: bookings });
});

export const updateBookingStatusAdmin = asyncHandler(async (req, res) => {
  const id = param(req.params.id);
  const { status, cancellationReason } = req.body as {
    status: BookingStatus;
    cancellationReason?: string;
  };

  const booking = await bookingRepo().findOne({
    where: { id },
    relations: ["property", "guest"],
  });
  if (!booking) throw new AppError("Booking not found", 404);

  booking.status = status;
  if (cancellationReason) {
    booking.cancellationReason = stripHtml(cancellationReason);
  }
  await bookingRepo().save(booking);
  res.json({ success: true, data: booking });
});

export const listCustomers = asyncHandler(async (_req, res) => {
  const bookings = await bookingRepo().find({
    order: { createdAt: "DESC" },
  });

  const byKey = new Map<
    string,
    {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      bookingsCount: number;
      lastBookingAt: Date;
    }
  >();

  for (const booking of bookings) {
    const phone = booking.customerPhone?.trim() || null;
    const email = booking.customerEmail?.trim().toLowerCase() || null;
    const name = booking.customerName?.trim() || "Guest";
    const key = phone || email;
    if (!key) continue;

    const existing = byKey.get(key);
    if (existing) {
      existing.bookingsCount += 1;
      if (booking.createdAt > existing.lastBookingAt) {
        existing.lastBookingAt = booking.createdAt;
        existing.name = name;
        existing.email = email || existing.email;
        existing.phone = phone || existing.phone;
      }
    } else {
      byKey.set(key, {
        id: key,
        name,
        email,
        phone,
        bookingsCount: 1,
        lastBookingAt: booking.createdAt,
      });
    }
  }

  const customers = Array.from(byKey.values()).sort(
    (a, b) => b.lastBookingAt.getTime() - a.lastBookingAt.getTime()
  );

  res.json({ success: true, data: customers });
});

export const listAdminProperties = asyncHandler(async (_req, res) => {
  const items = await propertyRepo().find({
    relations: ["images", "amenities", "host"],
    order: { createdAt: "DESC" },
  });
  res.json({ success: true, data: items });
});

export const createAdminProperty = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const body = req.body as CreatePropertyInput & { imagesJson?: string };

  // Support multipart: images may come as uploaded files; JSON fields as strings.
  const parsedBody =
    typeof body.title === "string"
      ? {
          ...body,
          pricePerNight: Number(body.pricePerNight),
          maxGuests: Number(body.maxGuests),
          bedrooms: Number(body.bedrooms),
          beds: Number(body.beds),
          bathrooms: Number(body.bathrooms),
          cleaningFee: Number(body.cleaningFee ?? 0),
          serviceFeePercent: Number(body.serviceFeePercent ?? 10),
          isFeatured:
            String((body as { isFeatured?: unknown }).isFeatured) === "true" ||
            body.isFeatured === true,
          amenityIds: body.amenityIds
            ? typeof body.amenityIds === "string"
              ? (JSON.parse(body.amenityIds as unknown as string) as string[])
              : body.amenityIds
            : [],
          images: body.images
            ? typeof body.images === "string"
              ? (JSON.parse(body.images as unknown as string) as CreatePropertyInput["images"])
              : body.images
            : [],
        }
      : body;

  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const uploadedImages = files.map((f, index) => {
    const image = new PropertyImage();
    image.url = publicUploadUrl(f.filename);
    image.alt = stripHtml(parsedBody.title);
    image.sortOrder = index;
    image.isCover = index === 0;
    return image;
  });

  const urlImages = (parsedBody.images || []).map((img, index) => {
    const image = new PropertyImage();
    image.url = img.url;
    image.alt = img.alt ?? parsedBody.title;
    image.sortOrder = uploadedImages.length + index;
    image.isCover = uploadedImages.length === 0 && (img.isCover ?? index === 0);
    return image;
  });

  const images = [...uploadedImages, ...urlImages];
  if (!images.length) {
    throw new AppError("At least one image is required", 400);
  }

  let slug = slugify(parsedBody.title);
  if (await propertyRepo().findOne({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  let amenities: Amenity[] = [];
  if (parsedBody.amenityIds?.length) {
    amenities = await amenityRepo().findBy({ id: In(parsedBody.amenityIds) });
  }

  const property = propertyRepo().create({
    title: stripHtml(parsedBody.title),
    slug,
    description: stripHtml(parsedBody.description),
    propertyType: parsedBody.propertyType,
    address: stripHtml(parsedBody.address),
    city: parsedBody.city || "Kathmandu",
    state: parsedBody.state || "Bagmati",
    country: parsedBody.country || "Nepal",
    latitude: parsedBody.latitude?.toString() ?? null,
    longitude: parsedBody.longitude?.toString() ?? null,
    pricePerNight: Number(parsedBody.pricePerNight).toFixed(2),
    currency: parsedBody.currency || "NPR",
    maxGuests: Number(parsedBody.maxGuests),
    bedrooms: Number(parsedBody.bedrooms),
    beds: Number(parsedBody.beds),
    bathrooms: String(parsedBody.bathrooms),
    cleaningFee: Number(parsedBody.cleaningFee || 0),
    serviceFeePercent: Number(parsedBody.serviceFeePercent ?? 10),
    isFeatured: Boolean(parsedBody.isFeatured),
    hostId: authReq.user!.sub,
    amenities,
    images,
  });

  await propertyRepo().save(property);
  const saved = await propertyRepo().findOne({
    where: { id: property.id },
    relations: ["images", "amenities", "host"],
  });
  res.status(201).json({ success: true, data: saved });
});

export const updateAdminProperty = asyncHandler(async (req, res) => {
  const id = param(req.params.id);
  const property = await propertyRepo().findOne({
    where: { id },
    relations: ["images", "amenities"],
  });
  if (!property) throw new AppError("Property not found", 404);

  const body = updatePropertySchema.parse({
    ...req.body,
    pricePerNight:
      req.body.pricePerNight !== undefined
        ? Number(req.body.pricePerNight)
        : undefined,
    maxGuests:
      req.body.maxGuests !== undefined ? Number(req.body.maxGuests) : undefined,
    bedrooms:
      req.body.bedrooms !== undefined ? Number(req.body.bedrooms) : undefined,
    beds: req.body.beds !== undefined ? Number(req.body.beds) : undefined,
    bathrooms:
      req.body.bathrooms !== undefined ? Number(req.body.bathrooms) : undefined,
    cleaningFee:
      req.body.cleaningFee !== undefined
        ? Number(req.body.cleaningFee)
        : undefined,
    serviceFeePercent:
      req.body.serviceFeePercent !== undefined
        ? Number(req.body.serviceFeePercent)
        : undefined,
    isFeatured:
      req.body.isFeatured !== undefined
        ? String(req.body.isFeatured) === "true" || req.body.isFeatured === true
        : undefined,
    amenityIds:
      typeof req.body.amenityIds === "string"
        ? JSON.parse(req.body.amenityIds)
        : req.body.amenityIds,
  });

  if (body.title) property.title = stripHtml(body.title);
  if (body.description) property.description = stripHtml(body.description);
  if (body.propertyType) property.propertyType = body.propertyType;
  if (body.address) property.address = stripHtml(body.address);
  if (body.city) property.city = body.city;
  if (body.state) property.state = body.state;
  if (body.country) property.country = body.country;
  if (body.pricePerNight !== undefined) {
    property.pricePerNight = body.pricePerNight.toFixed(2);
  }
  if (body.currency) property.currency = body.currency;
  if (body.maxGuests !== undefined) property.maxGuests = body.maxGuests;
  if (body.bedrooms !== undefined) property.bedrooms = body.bedrooms;
  if (body.beds !== undefined) property.beds = body.beds;
  if (body.bathrooms !== undefined) property.bathrooms = String(body.bathrooms);
  if (body.cleaningFee !== undefined) property.cleaningFee = body.cleaningFee;
  if (body.serviceFeePercent !== undefined) {
    property.serviceFeePercent = body.serviceFeePercent;
  }
  if (body.isFeatured !== undefined) property.isFeatured = body.isFeatured;
  if (body.amenityIds) {
    property.amenities = await amenityRepo().findBy({ id: In(body.amenityIds) });
  }

  // Remove selected existing images
  let removeImageIds: string[] = [];
  const rawRemove = (req.body as { removeImageIds?: string | string[] }).removeImageIds;
  if (typeof rawRemove === "string" && rawRemove.trim()) {
    try {
      removeImageIds = JSON.parse(rawRemove) as string[];
    } catch {
      removeImageIds = rawRemove.split(",").map((s) => s.trim()).filter(Boolean);
    }
  } else if (Array.isArray(rawRemove)) {
    removeImageIds = rawRemove;
  }

  if (removeImageIds.length) {
    await imageRepo().delete({
      id: In(removeImageIds),
      propertyId: property.id,
    });
    property.images = (property.images || []).filter(
      (img) => !removeImageIds.includes(img.id)
    );
  }

  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.length) {
    const start = property.images?.length || 0;
    const newImages = files.map((f, index) => {
      const image = new PropertyImage();
      image.url = publicUploadUrl(f.filename);
      image.alt = property.title;
      image.sortOrder = start + index;
      image.isCover = start === 0 && index === 0;
      image.propertyId = property.id;
      return image;
    });
    property.images = [...(property.images || []), ...newImages];
  }

  // Ensure at least one image remains
  if (!(property.images?.length)) {
    throw new AppError("A stay must have at least one image", 400);
  }

  // Keep a cover image if the previous cover was removed
  if (!property.images.some((img) => img.isCover)) {
    property.images[0].isCover = true;
  }

  await propertyRepo().save(property);
  const saved = await propertyRepo().findOne({
    where: { id },
    relations: ["images", "amenities", "host"],
  });
  res.json({ success: true, data: saved });
});

export const deleteAdminProperty = asyncHandler(async (req, res) => {
  const id = param(req.params.id);
  const property = await propertyRepo().findOne({ where: { id } });
  if (!property) throw new AppError("Property not found", 404);
  property.isActive = false;
  await propertyRepo().save(property);
  res.json({ success: true, message: "Property deactivated" });
});
