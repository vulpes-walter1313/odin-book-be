import express from "express";
import * as accountController from "../controllers/accountController.ts";

const router = express.Router();

// All routes prefixed with /account
router.get("/user", accountController.account_GET);
router.put("/user", accountController.editAccountInfo_PUT);
router.delete("/user", accountController.deleteAccount_DELETE);
router.put("/password", accountController.updatePassword_PUT);
router.put("/username", accountController.updateUsername_PUT);
export default router;
