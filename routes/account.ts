import express from "express";
import * as accountController from "../controllers/accountController";

const router = express.Router();

// All routes prefixed with /account
router.get("/", accountController.account_GET);
export default router;
