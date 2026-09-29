import { AppDataSource } from "../config/database";
import { Wishlist } from "../entities/Wishlist";
import { Property } from "../entities/Property";
import { User } from "../entities/User";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { sanitizeUser } from "../utils/security";
import { param } from "../utils/params";
import { updateProfileSchema } from "../validators/schemas";

const wishlistRepo = () => AppDataSource.getRepository(Wishlist);
const propertyRepo = () => AppDataSource.getRepository(Property);
const userRepo = () => AppDataSource.getRepository(User);

export const getWishlist = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const items = await wishlistRepo().find({
    where: { userId: authReq.user!.sub },
    relations: ["property", "property.images"],
    order: { createdAt: "DESC" },
  });

  res.json({
    success: true,
    data: items.map((i) => i.property).filter((p) => p?.isActive),
  });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const propertyId = param(req.params.propertyId, "propertyId");

  const property = await propertyRepo().findOne({
    where: { id: propertyId, isActive: true },
  });
  if (!property) {
    throw new AppError("Property not found", 404);
  }

  const existing = await wishlistRepo().findOne({
    where: { userId: authReq.user!.sub, propertyId },
  });
  if (existing) {
    return res.json({ success: true, message: "Already in wishlist" });
  }

  await wishlistRepo().save(
    wishlistRepo().create({ userId: authReq.user!.sub, propertyId })
  );

  res.status(201).json({ success: true, message: "Added to wishlist" });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  await wishlistRepo().delete({
    userId: authReq.user!.sub,
    propertyId: param(req.params.propertyId, "propertyId"),
  });
  res.json({ success: true, message: "Removed from wishlist" });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const body = updateProfileSchema.parse(req.body);
  const user = await userRepo().findOne({ where: { id: authReq.user!.sub } });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  Object.assign(user, body);
  await userRepo().save(user);

  res.json({ success: true, data: sanitizeUser(user) });
});
