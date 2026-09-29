import { AppDataSource } from "../config/database";
import { Review } from "../entities/Review";
import { Booking } from "../entities/Booking";
import { Property } from "../entities/Property";
import { BookingStatus } from "../entities/enums";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { stripHtml } from "../utils/security";
import { param } from "../utils/params";
import { CreateReviewInput } from "../validators/schemas";

const reviewRepo = () => AppDataSource.getRepository(Review);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);

async function recalculatePropertyRating(propertyId: string) {
  const result = await reviewRepo()
    .createQueryBuilder("review")
    .select("AVG(review.rating)", "avg")
    .addSelect("COUNT(review.id)", "count")
    .where("review.propertyId = :propertyId", { propertyId })
    .getRawOne<{ avg: string; count: string }>();

  await propertyRepo().update(propertyId, {
    averageRating: Number(result?.avg ?? 0).toFixed(2),
    reviewCount: Number(result?.count ?? 0),
  });
}

export const createReview = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const body = req.body as CreateReviewInput;

  const booking = await bookingRepo().findOne({
    where: { id: body.bookingId },
    relations: ["property"],
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  if (booking.guestId !== authReq.user!.sub) {
    throw new AppError("You can only review your own stays", 403);
  }

  if (
    booking.status !== BookingStatus.COMPLETED &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    throw new AppError("You can only review confirmed or completed stays", 400);
  }

  if (new Date(booking.checkOut) > new Date()) {
    throw new AppError("You can review after checkout", 400);
  }

  const existing = await reviewRepo().findOne({
    where: { bookingId: booking.id, authorId: authReq.user!.sub },
  });

  if (existing) {
    throw new AppError("You already reviewed this stay", 409);
  }

  const review = reviewRepo().create({
    bookingId: booking.id,
    propertyId: booking.propertyId,
    authorId: authReq.user!.sub,
    rating: body.rating,
    comment: stripHtml(body.comment),
    cleanliness: body.cleanliness ?? null,
    communication: body.communication ?? null,
    location: body.location ?? null,
    value: body.value ?? null,
  });

  await reviewRepo().save(review);
  await recalculatePropertyRating(booking.propertyId);

  if (booking.status === BookingStatus.CONFIRMED) {
    booking.status = BookingStatus.COMPLETED;
    await bookingRepo().save(booking);
  }

  const saved = await reviewRepo().findOne({
    where: { id: review.id },
    relations: ["author"],
  });

  res.status(201).json({ success: true, data: saved });
});

export const listPropertyReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewRepo().find({
    where: { propertyId: param(req.params.propertyId, "propertyId") },
    relations: ["author"],
    order: { createdAt: "DESC" },
  });

  res.json({
    success: true,
    data: reviews.map((r) => ({
      ...r,
      author: {
        id: r.author.id,
        firstName: r.author.firstName,
        lastName: r.author.lastName,
        avatarUrl: r.author.avatarUrl,
      },
    })),
  });
});
