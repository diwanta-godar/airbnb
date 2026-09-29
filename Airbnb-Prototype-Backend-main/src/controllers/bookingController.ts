import { AppDataSource } from "../config/database";
import { Booking } from "../entities/Booking";
import { Property } from "../entities/Property";
import { User } from "../entities/User";
import { BookingStatus } from "../entities/enums";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { nightsBetween, stripHtml } from "../utils/security";
import { param } from "../utils/params";
import { CreateBookingInput, CreatePublicBookingInput } from "../validators/schemas";
import { whatsappService } from "../services/whatsappService";
import { broadcastNewBooking } from "../services/socketService";

const bookingRepo = () => AppDataSource.getRepository(Booking);
const propertyRepo = () => AppDataSource.getRepository(Property);
const userRepo = () => AppDataSource.getRepository(User);

async function assertNoOverlap(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeId?: string
) {
  const qb = bookingRepo()
    .createQueryBuilder("booking")
    .where("booking.propertyId = :propertyId", { propertyId })
    .andWhere("booking.status IN (:...statuses)", {
      statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
    })
    .andWhere("booking.checkIn < :checkOut AND booking.checkOut > :checkIn", {
      checkIn,
      checkOut,
    });

  if (excludeId) {
    qb.andWhere("booking.id != :excludeId", { excludeId });
  }

  const conflict = await qb.getOne();
  if (conflict) {
    throw new AppError("Selected dates are not available", 409);
  }
}

async function notifyBooking(saved: Booking) {
  whatsappService
    .sendBookingAlert({
      customerName: saved.customerName || "Guest",
      customerPhone: saved.customerPhone || "",
      customerEmail: saved.customerEmail || "",
      bookingItem: saved.property?.title || "Property Stay",
      bookingDate: `${saved.checkIn} → ${saved.checkOut}`,
      bookingTime: saved.bookingTime || "14:00",
      customerNotes: saved.guestMessage,
    })
    .catch((err) =>
      console.error("[WhatsApp] Error sending booking alert:", err)
    );

  broadcastNewBooking(saved);
}

export const createPublicBooking = asyncHandler(async (req, res) => {
  const body = req.body as CreatePublicBookingInput;

  const property = await propertyRepo().findOne({
    where: { id: body.propertyId, isActive: true },
  });

  if (!property) {
    throw new AppError("Property not found", 404);
  }

  if (body.guests > property.maxGuests) {
    throw new AppError(`Maximum ${property.maxGuests} guests allowed`, 400);
  }

  const nights = nightsBetween(body.checkIn, body.checkOut);
  if (nights < 1) {
    throw new AppError("Stay must be at least 1 night", 400);
  }

  await assertNoOverlap(property.id, body.checkIn, body.checkOut);

  const pricePerNight = Number(property.pricePerNight);
  const cleaningFee = Number(property.cleaningFee);
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round((subtotal * property.serviceFeePercent) / 100);
  const totalPrice = subtotal + cleaningFee + serviceFee;

  const booking = bookingRepo().create({
    propertyId: property.id,
    guestId: null,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests,
    nights,
    pricePerNight: pricePerNight.toFixed(2),
    cleaningFee: cleaningFee.toFixed(2),
    serviceFee: serviceFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    currency: property.currency,
    status: BookingStatus.PENDING,
    guestMessage: body.guestMessage ? stripHtml(body.guestMessage) : null,
    customerName: stripHtml(body.customerName),
    customerPhone: stripHtml(body.customerPhone),
    customerEmail: stripHtml(body.customerEmail),
    bookingTime: body.bookingTime ? stripHtml(body.bookingTime) : "14:00",
  });

  await bookingRepo().save(booking);

  const saved = await bookingRepo().findOne({
    where: { id: booking.id },
    relations: ["property", "property.images"],
  });

  if (saved) {
    await notifyBooking(saved);
  }

  res.status(201).json({
    success: true,
    message: "Booking received successfully",
    data: saved,
  });
});


export const createBooking = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const body = req.body as CreateBookingInput;

  const property = await propertyRepo().findOne({
    where: { id: body.propertyId, isActive: true },
  });

  if (!property) {
    throw new AppError("Property not found", 404);
  }

  if (body.guests > property.maxGuests) {
    throw new AppError(`Maximum ${property.maxGuests} guests allowed`, 400);
  }

  const nights = nightsBetween(body.checkIn, body.checkOut);
  if (nights < 1) {
    throw new AppError("Stay must be at least 1 night", 400);
  }

  await assertNoOverlap(property.id, body.checkIn, body.checkOut);

  const pricePerNight = Number(property.pricePerNight);
  const cleaningFee = Number(property.cleaningFee);
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round((subtotal * property.serviceFeePercent) / 100);
  const totalPrice = subtotal + cleaningFee + serviceFee;

  const guest = await userRepo().findOne({
    where: { id: authReq.user!.sub },
  });

  const customerName =
    `${guest?.firstName || "Guest"} ${guest?.lastName || ""}`.trim();
  const customerPhone = guest?.phone || "";
  const customerEmail = guest?.email || authReq.user!.email;

  const booking = bookingRepo().create({
    propertyId: property.id,
    guestId: authReq.user!.sub,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests,
    nights,
    pricePerNight: pricePerNight.toFixed(2),
    cleaningFee: cleaningFee.toFixed(2),
    serviceFee: serviceFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    currency: property.currency,
    status: BookingStatus.PENDING,
    guestMessage: body.guestMessage ? stripHtml(body.guestMessage) : null,
    customerName,
    customerPhone,
    customerEmail,
    bookingTime: "14:00",
  });

  await bookingRepo().save(booking);

  const saved = await bookingRepo().findOne({
    where: { id: booking.id },
    relations: ["property", "property.images", "guest"],
  });

  if (saved) {
    await notifyBooking(saved);
  }

  res.status(201).json({ success: true, data: saved });
});

export const myBookings = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const bookings = await bookingRepo().find({
    where: { guestId: authReq.user!.sub },
    relations: ["property", "property.images"],
    order: { createdAt: "DESC" },
  });

  res.json({ success: true, data: bookings });
});

export const getBooking = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const booking = await bookingRepo().findOne({
    where: { id: param(req.params.id) },
    relations: ["property", "property.images", "property.host", "guest"],
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  const isGuest = booking.guestId === authReq.user!.sub;
  const isAdmin = authReq.user!.role === "admin";

  if (!isGuest && !isAdmin) {
    throw new AppError("Access denied", 403);
  }

  res.json({ success: true, data: booking });
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { status, cancellationReason } = req.body as {
    status: BookingStatus;
    cancellationReason?: string;
  };

  const booking = await bookingRepo().findOne({
    where: { id: param(req.params.id) },
    relations: ["property"],
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  const isGuest = booking.guestId === authReq.user!.sub;
  const isAdmin = authReq.user!.role === "admin";

  if (status === BookingStatus.CANCELLED) {
    if (!isGuest && !isAdmin) {
      throw new AppError("Access denied", 403);
    }
    if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
      throw new AppError("Booking cannot be cancelled", 400);
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = cancellationReason
      ? stripHtml(cancellationReason)
      : null;
  } else if (
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.REJECTED ||
    status === BookingStatus.COMPLETED
  ) {
    if (!isAdmin) {
      throw new AppError("Only admin can update this status", 403);
    }
    if (status === BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      throw new AppError("Only pending bookings can be confirmed", 400);
    }
    if (status === BookingStatus.REJECTED && booking.status !== BookingStatus.PENDING) {
      throw new AppError("Only pending bookings can be rejected", 400);
    }
    booking.status = status;
  } else {
    throw new AppError("Invalid status transition", 400);
  }

  await bookingRepo().save(booking);

  res.json({ success: true, data: booking });
});
