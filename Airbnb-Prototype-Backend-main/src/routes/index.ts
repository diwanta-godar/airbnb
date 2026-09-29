import { Router } from "express";
import authRoutes from "./authRoutes";
import propertyRoutes from "./propertyRoutes";
import bookingRoutes from "./bookingRoutes";
import reviewRoutes from "./reviewRoutes";
import userRoutes from "./userRoutes";
import adminRoutes from "./adminRoutes";
import heroRoutes from "./heroRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "OK" });
});

router.use("/auth", authRoutes);
router.use("/properties", propertyRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/users", userRoutes);
router.use("/hero-slides", heroRoutes);
router.use("/admin", adminRoutes);

export default router;
