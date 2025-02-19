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
