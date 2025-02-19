import express from "express";
import * as postsController from "@/controllers/postsController";
const router = express.Router();

// All these routes are prefixed by /posts
router.get("/", postsController.getPosts_GET);
router.post("/:postId/likes", postsController.likePost_POST);
router.delete("/:postId/likes", postsController.unlikePost_DELETE);
export default router;
