import { Router } from "express";
import { getConfig } from "../controllers/configController.js";

const router = Router();

router.get("/config", async (req, res) => {
  try {
    await getConfig(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting config.", error });
  }
});

export default router;
