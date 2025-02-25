import { type Request, type Response, type NextFunction } from "express";
import passport from "passport";
import { body, matchedData, param, query } from "express-validator";
import { validateErrors } from "@/middleware/validation";
import asyncHandler from "express-async-handler";
import db from "@/db/db";
import { AppError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

// GET /posts
export const getPosts_GET = [
  passport.authenticate("jwt", { session: false }),
  query("feed")
    .custom((value) => {
      return ["personal", "explore", "user"].includes(value);
    })
    .withMessage("feed must be: personal, explore, or user"),
  query("sort")
    .custom((value) => {
      return ["popular", "latest", "oldest"].includes(value);
    })
    .withMessage("sort must be: popular, latest, or oldest"),
  query("username")
    .custom((value, { req }) => {
      // this ensures we know that username is set if feed=user
      if (req.query?.feed && req.query.feed === "user" && !value) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage("Query param username must be set if feed is set to user"),
  query("page").isInt({ gt: 0 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    let page: number = parseInt(data.page);
    const feed = String(data.feed);
    const sort = String(data.sort);
    const LIMIT = 25;
    const { username } = data;
    // handle logic for user posts
    if (feed === "user") {
      const user = await db.user.findUnique({
        where: {
          username: username,
        },
        select: {
          id: true,
        },
      });
      if (!user) {
        const error = new AppError(404, "NOT_FOUND", "User not found");
        res.status(error.status).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }
      const totalPosts = await db.post.count({
        where: {
          authorId: user.id,
        },
      });
      const totalPages = Math.ceil(totalPosts / LIMIT);
      if (page > totalPages) page = totalPages;

      const offset = (page - 1) * LIMIT;

      const orderByValue: {
        userLikes?: { _count: "asc" | "desc" };
        createdAt?: "asc" | "desc";
      } = {};
      if (sort === "popular") {
        orderByValue.userLikes = { _count: "desc" };
      } else if (sort === "latest") {
        orderByValue.createdAt = "desc";
      } else if (sort === "oldest") {
        orderByValue.createdAt = "asc";
      } else {
        orderByValue.userLikes = { _count: "desc" };
      }

      const posts = await db.post.findMany({
        where: {
          authorId: user.id,
        },
        skip: offset,
        take: LIMIT,
        select: {
          id: true,
          caption: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              userLikes: true,
              comments: true,
            },
          },
          userLikes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [orderByValue, { id: "asc" }],
      });
      // TODO: transform the posts to include a boolean true
      // if loggedin user likes the post
      //
      const finalPost = posts.map((post) => {
        return {
          id: post.id,
          _count: {
            userLikes: post._count.userLikes,
            comments: post._count.comments,
          },
          caption: post.caption,
          imageUrl: post.imageUrl,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          likedByUser: post.userLikes.some((user) => user.id === req.user?.id),
        };
      });
      res.json({
        success: true,
        posts: finalPost,
        currentPage: page,
        totalPages: totalPages,
      });
      return;
    }
    // handle logic for explore posts
    if (feed === "explore") {
      const totalPosts = await db.post.count();
      const totalPages = Math.ceil(totalPosts / LIMIT);
      if (page > totalPages) page = totalPages;

      const offset = (page - 1) * LIMIT;

      const orderByValue: {
        userLikes?: { _count: "asc" | "desc" };
        createdAt?: "asc" | "desc";
      } = {};
      if (sort === "popular") {
        orderByValue.userLikes = { _count: "desc" };
      } else if (sort === "latest") {
        orderByValue.createdAt = "desc";
      } else if (sort === "oldest") {
        orderByValue.createdAt = "asc";
      } else {
        orderByValue.userLikes = { _count: "desc" };
      }

      const posts = await db.post.findMany({
        skip: offset,
        take: LIMIT,
        select: {
          id: true,
          caption: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              name: true,
              username: true,
              profileImg: true,
            },
          },
          _count: {
            select: {
              userLikes: true,
              comments: true,
            },
          },
          userLikes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [orderByValue, { id: "asc" }],
      });

      const finalPosts = posts.map((post) => {
        return {
          id: post.id,
          caption: post.caption,
          imageUrl: post.imageUrl,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: {
            username: post.author.username,
            name: post.author.name,
            profileImg: post.author.profileImg,
          },
          _count: {
            userLikes: post._count.userLikes,
            comments: post._count.comments,
          },
          likedByUser: post.userLikes.some((user) => user.id === req.user?.id),
        };
      });
      res.json({
        success: true,
        posts: finalPosts,
        currentPage: page,
        totalPages: totalPages,
      });
      return;
    }
    // handle logic for personal feed posts
    if (feed === "personal") {
      // TODO: add where clause to count only personal feed posts.
      const totalPosts = await db.post.count({
        where: {
          author: {
            followedBy: {
              some: {
                id: req.user?.id,
              },
            },
          },
        },
      });
      const totalPages = Math.ceil(totalPosts === 0 ? 1 : totalPosts / LIMIT);
      if (page > totalPages) page = totalPages;

      const offset = (page - 1) * LIMIT;

      const orderByValue: {
        userLikes?: { _count: "asc" | "desc" };
        createdAt?: "asc" | "desc";
      } = {};
      if (sort === "popular") {
        orderByValue.userLikes = { _count: "desc" };
      } else if (sort === "latest") {
        orderByValue.createdAt = "desc";
      } else if (sort === "oldest") {
        orderByValue.createdAt = "asc";
      } else {
        orderByValue.userLikes = { _count: "desc" };
      }

      const posts = await db.post.findMany({
        where: {
          author: {
            followedBy: {
              some: {
                id: req.user?.id,
              },
            },
          },
        },
        skip: offset,
        take: LIMIT,
        select: {
          id: true,
          caption: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              name: true,
              username: true,
              profileImg: true,
            },
          },
          _count: {
            select: {
              userLikes: true,
              comments: true,
            },
          },
          userLikes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [orderByValue, { id: "asc" }],
      });
      const finalPosts = posts.map((post) => {
        return {
          id: post.id,
          caption: post.caption,
          imageUrl: post.imageUrl,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: {
            username: post.author.username,
            name: post.author.name,
            profileImg: post.author.profileImg,
          },
          _count: {
            userLikes: post._count.userLikes,
            comments: post._count.comments,
          },
          likedByUser: post.userLikes.some((user) => user.id === req.user?.id),
        };
      });
      res.json({
        success: true,
        posts: finalPosts,
        currentPage: page,
        totalPages: totalPages,
      });
      return;
    }
  }),
];

// POST /posts/:postId/likes
export const likePost_POST = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const postId = parseInt(data.postId);
    console.log({ data, postId });

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      const error = new AppError(404, "NOT_FOUND", "post not found");
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    await db.post.update({
      where: {
        id: post.id,
      },
      data: {
        userLikes: {
          connect: {
            id: req.user?.id,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "post liked",
    });
  }),
];

// DELETE /posts/:postId/like
export const unlikePost_DELETE = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const postId = parseInt(data.postId);

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      const error = new AppError(404, "NOT_FOUND", "post not found");
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    await db.post.update({
      where: {
        id: post.id,
      },
      data: {
        userLikes: {
          disconnect: {
            id: req.user?.id,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "post unliked",
    });
  }),
];

// GET /posts/:postId/comments
export const getComments_GET = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt(),
  query("page").isInt({ gt: 0 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const postId = parseInt(data.postId);
    let page = parseInt(data.page);
    const LIMIT = 25;

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
    });
    if (!post) {
      const error = new AppError(404, "NOT_FOUND", "Post Not Found");
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    const totalComments = await db.comment.count({
      where: {
        postId: postId,
      },
    });
    const totalPages = Math.ceil(totalComments / LIMIT);
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * LIMIT;

    const comments = await db.comment.findMany({
      where: {
        postId: postId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: LIMIT,
      select: {
        id: true,
        author: {
          select: {
            id: true,
            name: true,
            profileImg: true,
          },
        },
        message: true,
        createdAt: true,
        updatedAt: true,
        postId: true,
        _count: {
          select: {
            userLikes: true,
          },
        },
        userLikes: {
          select: {
            id: true,
          },
        },
      },
    });
    const finalComments = comments.map((comment) => ({
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      message: comment.message,
      postId: comment.postId,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        profileImg: comment.author.profileImg,
      },
      _count: {
        userLikes: comment._count.userLikes,
      },
      userLikedComment: comment.userLikes.some(
        (user) => user.id === req.user?.id,
      ),
      userIsAuthor: comment.author.id === req.user?.id,
    }));

    res.json({
      success: true,
      comments: finalComments,
      totalPages: totalPages,
      currentPage: page,
    });
    return;
  }),
];

// POST /posts/:postId/comments
export const postComment_POST = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt({ gt: 0 }),
  body("message")
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage("Comment should be less than 2048 characters"),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const postId = parseInt(data.postId);
    const message = String(data.message);

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
      },
    });
    if (!post) {
      const error = new AppError(404, "NOT_FOUND", "Post not found");
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    const result = await db.comment.create({
      data: {
        authorId: req.user?.id!,
        message: message,
        postId: postId,
      },
    });
    res.json({
      success: true,
      message: "Comment created",
      comment: result,
    });
  }),
];

// PUT /posts/:postId/comments/:commentId
export const editComment_PUT = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt({ gt: 0 }),
  param("commentId").isInt({ gt: 0 }),
  body("message")
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage("message must be between 1 and 2048 characters"),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);

    const postId = parseInt(data.postId);
    const commentId = parseInt(data.commentId);
    const message = String(data.message);

    const originalComment = await db.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });
    if (!originalComment) {
      const error = new AppError(404, "NOT_FOUND", "Comment not found");
      next(error);
      return;
    }
    const user = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (!user) {
      const error = new AppError(401, "UNAUTHORIZED", "User not found");
      next(error);
      return;
    }
    const canEdit =
      user.role === "ADMIN" || originalComment.authorId === user.id;
    if (!canEdit) {
      const error = new AppError(
        403,
        "FORBIDDEN",
        "You are forbidden from performing this action",
      );
      next(error);
      return;
    }
    await db.comment.update({
      where: {
        id: originalComment.id,
      },
      data: {
        message: message,
      },
    });
    res.json({
      success: true,
      message: "comment updated successfully",
    });
  }),
];

// DELETE /posts/:postId/comments/:commentId
export const deleteComment_DELETE = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt({ gt: 0 }),
  param("commentId").isInt({ gt: 0 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);

    const postId = parseInt(data.postId);
    const commentId = parseInt(data.commentId);

    const comment = await db.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });
    if (!comment) {
      const error = new AppError(404, "NOT_FOUND", "Comment not found");
      next(error);
      return;
    }
    const user = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (!user) {
      const error = new AppError(401, "UNAUTHORIZED", "User not in db");
      next(error);
      return;
    }

    const canDelete = user.role === "ADMIN" || user.id === comment.authorId;
    if (!canDelete) {
      const error = new AppError(
        403,
        "FORBIDDEN",
        "You are not admin nor the author of this comment",
      );
      next(error);
      return;
    }

    await db.comment.delete({
      where: {
        id: comment.id,
      },
    });
    res.json({
      success: true,
      message: "Successfully deleted comment",
    });
  }),
];

// POST /posts/:postId/comments/:commentId/like
export const likeComment_POST = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt({ gt: 0 }),
  param("commentId").isInt({ gt: 0 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);

    const postId = parseInt(data.postId);
    const commentId = parseInt(data.commentId);

    const comment = await db.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
      },
    });

    if (!comment) {
      const error = new AppError(404, "NOT_FOUND", "Comment not found");
      next(error);
      return;
    }

    await db.comment.update({
      where: {
        id: commentId,
      },
      data: {
        userLikes: {
          connect: {
            id: req.user?.id,
          },
        },
      },
    });
    res.json({
      success: true,
      message: "Comment Liked successfully",
    });
  }),
];

// DELETE /posts/:postId/comments/:commentId/like
export const likeComment_DELETE = [
  passport.authenticate("jwt", { session: false }),
  param("postId").isInt({ gt: 0 }),
  param("commentId").isInt({ gt: 0 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);

    const postId = parseInt(data.postId);
    const commentId = parseInt(data.commentId);

    const comment = await db.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
      },
    });

    if (!comment) {
      const error = new AppError(404, "NOT_FOUND", "Comment not found");
      next(error);
      return;
    }

    await db.comment.update({
      where: {
        id: commentId,
      },
      data: {
        userLikes: {
          disconnect: {
            id: req.user?.id,
          },
        },
      },
    });
    res.json({
      success: true,
      message: "Comment Unliked successfully",
    });
  }),
];
