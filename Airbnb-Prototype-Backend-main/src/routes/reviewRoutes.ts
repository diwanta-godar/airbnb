import { Router } from "express";
import * as reviewController from "../controllers/reviewController";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/errorHandler";
import { createReviewSchema } from "../validators/schemas";

const router = Router();

router.get("/property/:propertyId", reviewController.listPropertyReviews);
router.post(
  "/",
  authenticate,
  validateBody(createReviewSchema),
  reviewController.createReview
);

export default router;
