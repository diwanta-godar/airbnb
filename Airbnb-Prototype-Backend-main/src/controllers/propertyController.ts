import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Property } from "../entities/Property";
import { PropertyImage } from "../entities/PropertyImage";
import { Amenity } from "../entities/Amenity";
import { Booking } from "../entities/Booking";
import { BookingStatus } from "../entities/enums";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { slugify, stripHtml } from "../utils/security";
import { param } from "../utils/params";
import {
  CreatePropertyInput,
  PropertyQuery,
  updatePropertySchema,
} from "../validators/schemas";
import { Request } from "express";

const propertyRepo = () => AppDataSource.getRepository(Property);
const amenityRepo = () => AppDataSource.getRepository(Amenity);
const bookingRepo = () => AppDataSource.getRepository(Booking);

export const listProperties = asyncHandler(async (req, res) => {
  const query = (req as Request & { validatedQuery: PropertyQuery }).validatedQuery;
  const qb = propertyRepo()
    .createQueryBuilder("property")
    .leftJoinAndSelect("property.images", "images")
    .leftJoinAndSelect("property.amenities", "amenities")
    .leftJoinAndSelect("property.host", "host")
    .where("property.isActive = true");

  if (query.city) {
    qb.andWhere("LOWER(property.city) = LOWER(:city)", { city: query.city });
  }
  if (query.country) {
    qb.andWhere("LOWER(property.country) = LOWER(:country)", { country: query.country });
  }
  if (query.guests) {
    qb.andWhere("property.maxGuests >= :guests", { guests: query.guests });
  }
  if (query.minPrice !== undefined) {
    qb.andWhere("property.pricePerNight >= :minPrice", { minPrice: query.minPrice });
  }
  if (query.maxPrice !== undefined) {
    qb.andWhere("property.pricePerNight <= :maxPrice", { maxPrice: query.maxPrice });
  }
  if (query.propertyType) {
    qb.andWhere("property.propertyType = :propertyType", {
      propertyType: query.propertyType,
    });
  }
  if (query.featured) {
    qb.andWhere("property.isFeatured = true");
  }
  if (query.search) {
    qb.andWhere(
      "(property.title ILIKE :search OR property.description ILIKE :search OR property.city ILIKE :search)",
      { search: `%${query.search}%` }
    );
  }

  if (query.checkIn && query.checkOut) {
    const overlapping = await bookingRepo()
      .createQueryBuilder("booking")
      .select("booking.propertyId", "propertyId")
      .where("booking.status IN (:...statuses)", {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere("booking.checkIn < :checkOut AND booking.checkOut > :checkIn", {
        checkIn: query.checkIn,
        checkOut: query.checkOut,
      })
      .getRawMany<{ propertyId: string }>();

    const blockedIds = overlapping.map((b) => b.propertyId);
    if (blockedIds.length) {
      qb.andWhere("property.id NOT IN (:...blockedIds)", { blockedIds });
    }
  }

  switch (query.sort) {
    case "price_asc":
      qb.orderBy("property.pricePerNight", "ASC");
      break;
    case "price_desc":
      qb.orderBy("property.pricePerNight", "DESC");
      break;
    case "rating":
      qb.orderBy("property.averageRating", "DESC");
      break;
    default:
      qb.orderBy("property.createdAt", "DESC");
  }

  qb.addOrderBy("images.sortOrder", "ASC");

  const page = query.page;
  const limit = query.limit;
  qb.skip((page - 1) * limit).take(limit);

  const [items, total] = await qb.getManyAndCount();

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export const getProperty = asyncHandler(async (req, res) => {
  const idOrSlug = param(req.params.idOrSlug, "idOrSlug");
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

  const qb = propertyRepo()
    .createQueryBuilder("property")
    .leftJoinAndSelect("property.images", "images")
    .leftJoinAndSelect("property.amenities", "amenities")
    .leftJoinAndSelect("property.host", "host")
    .leftJoinAndSelect("property.reviews", "reviews")
    .leftJoinAndSelect("reviews.author", "reviewAuthor")
    .where("property.isActive = true");

  if (isUuid) {
    qb.andWhere("(property.id = :id OR property.slug = :slug)", {
      id: idOrSlug,
      slug: idOrSlug,
    });
  } else {
    qb.andWhere("property.slug = :slug", { slug: idOrSlug });
  }

  qb.orderBy("images.sortOrder", "ASC").addOrderBy("reviews.createdAt", "DESC");

  const property = await qb.getOne();
  if (!property) {
    throw new AppError("Property not found", 404);
  }

  // Strip sensitive host fields
  const host = property.host
    ? {
        id: property.host.id,
        firstName: property.host.firstName,
        lastName: property.host.lastName,
        avatarUrl: property.host.avatarUrl,
        bio: property.host.bio,
        createdAt: property.host.createdAt,
      }
    : null;

  res.json({
    success: true,
    data: { ...property, host },
  });
});

export const createProperty = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const body = req.body as CreatePropertyInput;

  let slug = slugify(body.title);
  const existingSlug = await propertyRepo().findOne({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  let amenities: Amenity[] = [];
  if (body.amenityIds?.length) {
    amenities = await amenityRepo().findBy({ id: In(body.amenityIds) });
  }

  const property = propertyRepo().create({
    title: stripHtml(body.title),
    slug,
    description: stripHtml(body.description),
    propertyType: body.propertyType,
    address: stripHtml(body.address),
    city: body.city,
    state: body.state,
    country: body.country,
    latitude: body.latitude?.toString() ?? null,
    longitude: body.longitude?.toString() ?? null,
    pricePerNight: body.pricePerNight.toFixed(2),
    currency: body.currency,
    maxGuests: body.maxGuests,
    bedrooms: body.bedrooms,
    beds: body.beds,
    bathrooms: body.bathrooms.toString(),
    cleaningFee: body.cleaningFee,
    serviceFeePercent: body.serviceFeePercent,
    isFeatured: body.isFeatured ?? false,
    hostId: authReq.user!.sub,
    amenities,
    images: body.images.map((img, index) => {
      const image = new PropertyImage();
      image.url = img.url;
      image.alt = img.alt ?? body.title;
      image.sortOrder = index;
      image.isCover = img.isCover ?? index === 0;
      return image;
    }),
  });

  await propertyRepo().save(property);

  const saved = await propertyRepo().findOne({
    where: { id: property.id },
    relations: ["images", "amenities", "host"],
  });

  res.status(201).json({ success: true, data: saved });
});

export const updateProperty = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const property = await propertyRepo().findOne({
    where: { id: param(req.params.id) },
    relations: ["images", "amenities"],
  });

  if (!property) {
    throw new AppError("Property not found", 404);
  }

  if (property.hostId !== authReq.user!.sub && authReq.user!.role !== "admin") {
    throw new AppError("You can only edit your own listings", 403);
  }

  const body = updatePropertySchema.parse(req.body);

  if (body.title) property.title = stripHtml(body.title);
  if (body.description) property.description = stripHtml(body.description);
  if (body.propertyType) property.propertyType = body.propertyType;
  if (body.address) property.address = stripHtml(body.address);
  if (body.city) property.city = body.city;
  if (body.state) property.state = body.state;
  if (body.country) property.country = body.country;
  if (body.latitude !== undefined) property.latitude = body.latitude.toString();
  if (body.longitude !== undefined) property.longitude = body.longitude.toString();
  if (body.pricePerNight !== undefined) {
    property.pricePerNight = body.pricePerNight.toFixed(2);
  }
  if (body.currency) property.currency = body.currency;
  if (body.maxGuests !== undefined) property.maxGuests = body.maxGuests;
  if (body.bedrooms !== undefined) property.bedrooms = body.bedrooms;
  if (body.beds !== undefined) property.beds = body.beds;
  if (body.bathrooms !== undefined) property.bathrooms = body.bathrooms.toString();
  if (body.cleaningFee !== undefined) property.cleaningFee = body.cleaningFee;
  if (body.serviceFeePercent !== undefined) {
    property.serviceFeePercent = body.serviceFeePercent;
  }
  if (body.isFeatured !== undefined) property.isFeatured = body.isFeatured;

  if (body.amenityIds) {
    property.amenities = await amenityRepo().findBy({ id: In(body.amenityIds) });
  }

  await propertyRepo().save(property);

  const saved = await propertyRepo().findOne({
    where: { id: property.id },
    relations: ["images", "amenities", "host"],
  });

  res.json({ success: true, data: saved });
});

export const deleteProperty = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const property = await propertyRepo().findOne({ where: { id: param(req.params.id) } });

  if (!property) {
    throw new AppError("Property not found", 404);
  }

  if (property.hostId !== authReq.user!.sub && authReq.user!.role !== "admin") {
    throw new AppError("You can only delete your own listings", 403);
  }

  property.isActive = false;
  await propertyRepo().save(property);

  res.json({ success: true, message: "Property deactivated" });
});

export const getAvailability = asyncHandler(async (req, res) => {
  const bookings = await bookingRepo().find({
    where: {
      propertyId: param(req.params.id),
      status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
    },
    select: ["checkIn", "checkOut", "status"],
  });

  res.json({
    success: true,
    data: bookings.map((b) => ({
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
    })),
  });
});

export const listAmenities = asyncHandler(async (_req, res) => {
  const amenities = await amenityRepo().find({ order: { category: "ASC", name: "ASC" } });
  res.json({ success: true, data: amenities });
});
