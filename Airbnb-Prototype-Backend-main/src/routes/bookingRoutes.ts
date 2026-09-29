import { Router } from "express";
import * as bookingController from "../controllers/bookingController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/errorHandler";
import {
  createBookingSchema,
  createPublicBookingSchema,
  updateBookingStatusSchema,
} from "../validators/schemas";

const router = Router();

// Guest booking — no login required
router.post(
  "/public",
  validateBody(createPublicBookingSchema),
  bookingController.createPublicBooking
);

router.use(authenticate);

router.post("/", validateBody(createBookingSchema), bookingController.createBooking);
router.get("/me", bookingController.myBookings);
router.get("/:id", bookingController.getBooking);
router.patch(
  "/:id/status",
  validateBody(updateBookingStatusSchema),
  bookingController.updateBookingStatus
);

export default router;
