import { z } from "zod";
import { PropertyType, BookingStatus, UserRole } from "../entities/enums";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.toLowerCase().trim()),
  password: passwordSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  phone: z.string().min(7).max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

export const createPropertySchema = z.object({
  title: z.string().min(5).max(200).trim(),
  description: z.string().min(20).max(10000).trim(),
  propertyType: z.nativeEnum(PropertyType).default(PropertyType.ENTIRE_HOME),
  address: z.string().min(5).max(255).trim(),
  city: z.string().min(2).max(100).default("Kathmandu"),
  state: z.string().min(2).max(100).default("Bagmati"),
  country: z.string().min(2).max(100).default("Nepal"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  pricePerNight: z.number().positive().max(1_000_000),
  currency: z.string().length(3).default("NPR"),
  maxGuests: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(0).max(50),
  beds: z.number().int().min(1).max(50),
  bathrooms: z.number().min(0.5).max(50),
  cleaningFee: z.number().min(0).max(100_000).default(0),
  serviceFeePercent: z.number().min(0).max(30).default(10),
  isFeatured: z.boolean().optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url().max(1000),
        alt: z.string().max(255).optional(),
        isCover: z.boolean().optional(),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyQuerySchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.coerce.number().int().min(1).max(50).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(["price_asc", "price_desc", "rating", "newest"]).default("newest"),
  search: z.string().max(100).optional(),
});

export const createBookingSchema = z
  .object({
    propertyId: z.string().uuid(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.number().int().min(1).max(50),
    guestMessage: z.string().max(2000).optional(),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  })
  .refine((data) => new Date(data.checkIn) >= new Date(new Date().toDateString()), {
    message: "Check-in cannot be in the past",
    path: ["checkIn"],
  });

export const createPublicBookingSchema = z
  .object({
    propertyId: z.string().uuid(),
    customerName: z.string().min(2).max(150).trim(),
    customerPhone: z.string().min(6).max(50).trim(),
    customerEmail: z
      .string()
      .email()
      .max(255)
      .transform((e) => e.toLowerCase().trim()),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    guests: z.coerce.number().int().min(1).max(50).default(1),
    bookingTime: z.string().max(50).optional().default("14:00"),
    guestMessage: z.string().max(2000).optional(),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  })
  .refine((data) => new Date(data.checkIn) >= new Date(new Date().toDateString()), {
    message: "Check-in cannot be in the past",
    path: ["checkIn"],
  });

export const updateBookingStatusSchema = z.object({
  status: z.enum([
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.REJECTED,
    BookingStatus.COMPLETED,
  ]),
  cancellationReason: z.string().max(1000).optional(),
});

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000).trim(),
  cleanliness: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  location: z.number().int().min(1).max(5).optional(),
  value: z.number().int().min(1).max(5).optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(7).max(30).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type PropertyQuery = z.infer<typeof propertyQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreatePublicBookingInput = z.infer<typeof createPublicBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
