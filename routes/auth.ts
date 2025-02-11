import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

router.post("/signup", authController.signup_POST);
router.post("/signin", authController.signin_POST);
router.post("/refresh", authController.refreshToken_POST);
router.get("/check", authController.check_GET);

export default router;
