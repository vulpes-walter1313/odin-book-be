import express from "express";
import * as profileController from "../controllers/profilesController";

const router = express.Router();

// All routes will be prefixed with `/profiles
router.get("/", profileController.profiles_GET);
router.get("/:username", profileController.profile_GET);

export default router;
