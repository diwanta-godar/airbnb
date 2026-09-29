import { Router } from "express";
import * as whatsappController from "../controllers/whatsappController";

const router = Router();

router.get("/status", whatsappController.getStatus);
router.post("/reset", whatsappController.resetSession);
router.post("/send", whatsappController.sendMessage);
router.get("/messages", whatsappController.getMessages);

export default router;

