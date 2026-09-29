import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/errorHandler";
import { updateProfileSchema } from "../validators/schemas";

const router = Router();

router.use(authenticate);

router.patch("/me", validateBody(updateProfileSchema), userController.updateProfile);
router.get("/wishlist", userController.getWishlist);
router.post("/wishlist/:propertyId", userController.addToWishlist);
router.delete("/wishlist/:propertyId", userController.removeFromWishlist);

export default router;
