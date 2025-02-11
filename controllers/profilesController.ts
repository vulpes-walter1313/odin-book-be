import { validateErrors } from "@/middleware/validation";
import asyncHandler from "express-async-handler";
import { matchedData, param, query } from "express-validator";
import passport from "passport";
import { type Request, type Response, type NextFunction } from "express";
import db from "@/db/db";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

// GET /profiles
export const profiles_GET = [
  passport.authenticate("jwt", { session: false }),
  query("page")
    .isInt({ min: 1 })
    .withMessage("page should be a positive number"),
  query("search").isLength({ max: 32 }).optional(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const LIMIT = 25;
    const data = matchedData(req);
    let page = parseInt(data.page);
    const search = String(data.search || "");

    const totalUsers = await db.user.count({
      where: { username: search },
    });
    const totalPages = Math.ceil(totalUsers / LIMIT);
    if (totalPages > page) page = totalPages;
    const offset = (page - 1) * LIMIT;

    const whereOptions: Prisma.UserWhereInput = {};

    if (search) {
      whereOptions.username = { contains: search };
    }
    const allUsers = await db.user.findMany({
      where: whereOptions,
      skip: offset,
      take: LIMIT,
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profileImg: true,
        _count: {
          select: {
            followedBy: true,
          },
        },
        followedBy: {
          select: {
            id: true,
          },
        },
      },
    });
    // TODO: check if logged in user follows them or not
    const finalUsers = allUsers.map((user) => {
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        _count: {
          followedBy: user._count.followedBy,
        },
        areFollowing: user.followedBy.some((user) => user.id === req.user?.id),
      };
    });

    res.json({
      success: true,
      users: finalUsers,
      currentPage: page,
      totalPages: totalPages,
    });
    return;
  }),
];

// GET /profiles/:username
export const profile_GET = [
  passport.authenticate("jwt", { session: false }),
  param("username").isLength({ max: 32 }).withMessage("not a valid username"),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const userProfile = await db.user.findUnique({
      where: {
        username: data.username,
      },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        _count: {
          select: {
            posts: true,
            followedBy: true,
            following: true,
          },
        },
      },
    });

    if (!userProfile) {
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

    res.json({
      success: true,
      user: userProfile,
    });
  }),
];
