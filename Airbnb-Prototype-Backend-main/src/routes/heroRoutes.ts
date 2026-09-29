import { Router } from "express";
import * as heroController from "../controllers/heroController";

const router = Router();

router.get("/", heroController.listPublicHeroSlides);

export default router;
