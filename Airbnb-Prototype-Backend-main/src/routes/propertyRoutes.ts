import { Router } from "express";
import * as propertyController from "../controllers/propertyController";
import { validateQuery } from "../middleware/errorHandler";
import { propertyQuerySchema } from "../validators/schemas";

const router = Router();

// Public catalog — create/update/delete live under /api/admin/properties
router.get("/", validateQuery(propertyQuerySchema), propertyController.listProperties);
router.get("/amenities/all", propertyController.listAmenities);
router.get("/:id/availability", propertyController.getAvailability);
router.get("/:idOrSlug", propertyController.getProperty);

export default router;
