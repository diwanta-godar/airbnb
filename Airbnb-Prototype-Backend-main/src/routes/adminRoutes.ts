import { Router } from "express";
import * as adminController from "../controllers/adminController";
import * as heroController from "../controllers/heroController";
import * as whatsappController from "../controllers/whatsappController";
import * as notificationController from "../controllers/notificationController";
import { authenticate, authorize } from "../middleware/auth";
import { validateBody } from "../middleware/errorHandler";
import { heroImageUpload, propertyImageUpload } from "../middleware/upload";
import { updateBookingStatusSchema } from "../validators/schemas";
import { UserRole } from "../entities/enums";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.get("/stats", adminController.getStats);
router.get("/bookings", adminController.listAllBookings);
router.patch(
  "/bookings/:id/status",
  validateBody(updateBookingStatusSchema),
  adminController.updateBookingStatusAdmin
);
router.get("/customers", adminController.listCustomers);

router.get("/properties", adminController.listAdminProperties);
router.post(
  "/properties",
  propertyImageUpload.array("images", 12),
  adminController.createAdminProperty
);
router.patch(
  "/properties/:id",
  propertyImageUpload.array("images", 12),
  adminController.updateAdminProperty
);
router.delete("/properties/:id", adminController.deleteAdminProperty);

router.get("/hero-slides", heroController.listAdminHeroSlides);
router.get("/hero-slides/:id", heroController.getAdminHeroSlide);
router.post(
  "/hero-slides",
  heroImageUpload.single("image"),
  heroController.createAdminHeroSlide
);
router.patch(
  "/hero-slides/:id",
  heroImageUpload.single("image"),
  heroController.updateAdminHeroSlide
);
router.delete("/hero-slides/:id", heroController.deleteAdminHeroSlide);

router.get("/whatsapp/status", whatsappController.getStatus);
router.post("/whatsapp/reset", whatsappController.resetSession);
router.post("/whatsapp/send", whatsappController.sendMessage);
router.get("/whatsapp/messages", whatsappController.getMessages);

router.get("/notifications", notificationController.listNotifications);
router.patch(
  "/notifications/read-all",
  notificationController.markAllNotificationsRead
);
router.patch(
  "/notifications/:id/read",
  notificationController.markNotificationRead
);

export default router;
