import express from "express";
import * as adminController from "../controllers/adminController";

const router = express.Router();

// All these routes are prefixed with /admin
router.post("/users/ban", adminController.banUser_POST);
router.delete("/users/ban", adminController.unbanUser_DELETE);
router.delete("/users/:username", adminController.deleteUser_DELETE);

export default router;
