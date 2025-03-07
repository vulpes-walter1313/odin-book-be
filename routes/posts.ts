import express from "express";
import * as postsController from "@/controllers/postsController";
const router = express.Router();

// All these routes are prefixed by /posts
router.get("/", postsController.getPosts_GET);
router.post("/", postsController.createPost_POST);
router.put("/:postId", postsController.editPost_PUT);
router.delete("/:postId", postsController.deletePost_DELETE);
router.post("/:postId/likes", postsController.likePost_POST);
router.delete("/:postId/likes", postsController.unlikePost_DELETE);
router.get("/:postId/comments", postsController.getComments_GET);
router.post("/:postId/comments", postsController.postComment_POST);
router.put("/:postId/comments/:commentId", postsController.editComment_PUT);
router.delete(
  "/:postId/comments/:commentId",
  postsController.deleteComment_DELETE,
);
router.post(
  "/:postId/comments/:commentId/like",
  postsController.likeComment_POST,
);
router.delete(
  "/:postId/comments/:commentId/like",
  postsController.likeComment_DELETE,
);
export default router;
