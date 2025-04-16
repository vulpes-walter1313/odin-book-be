import express from "express";
import * as adminController from "../controllers/adminController";

const router = express.Router();

// All these routes are prefixed with /admin
router.delete("/users/:username", adminController.deleteUser_DELETE);
router.post("/users/ban", adminController.banUser_POST);

export default router;
