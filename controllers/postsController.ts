import { type Request, type Response, type NextFunction } from "express";
import passport from "passport";
import { matchedData, query } from "express-validator";
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
        },
        orderBy: [orderByValue, { id: "asc" }],
      });
      res.json({
        success: true,
        posts: posts,
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
        },
        orderBy: [orderByValue, { id: "asc" }],
      });
      res.json({
        success: true,
        posts: posts,
        currentPage: page,
        totalPages: totalPages,
      });
      return;
    }
    // handle logic for personal feed posts
    if (feed === "personal") {
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

      // const usersFollowing = await db.user.findUnique({
      //   where: {
      //     id: req.user?.id
      //   },
      //   select: {
      //     following: {
      //       select: {
      //         id: true
      //       }
      //     }
      //   }
      // });
      // if (!usersFollowing) {
      //   const error = new AppError(404, "NOT_FOUND", "Current User Not Found");
      //   res.status(error.status).json({
      //     success: false,
      //     error: {
      //       code: error.code,
      //       message: error.message
      //     }
      //   });
      //   return;
      // }
      // const followingIds = usersFollowing.following.map(user => user.id);

      const posts = await db.post.findMany({
        where: {
          // authorId: {
          //   in: followingIds
          // }
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
        },
        orderBy: [orderByValue, { id: "asc" }],
      });
      res.json({
        success: true,
        posts: posts,
        currentPage: page,
        totalPages: totalPages,
      });
      return;
    }
  }),
];
