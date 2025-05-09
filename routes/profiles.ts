import express from "express";
import * as profileController from "../controllers/profilesController.ts";

const router = express.Router();

// All routes will be prefixed with `/profiles
router.get("/", profileController.profiles_GET);
router.get("/:username", profileController.profile_GET);
router.post("/:username/follow", profileController.profileFollow_POST);
router.delete("/:username/follow", profileController.profileUnfollow_DELETE);
router.get("/:username/following", profileController.profileFollowing_GET);
router.get("/:username/followers", profileController.profileFollowers_GET);

export default router;
