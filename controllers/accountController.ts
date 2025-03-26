import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import asyncHandler from "express-async-handler";
import db from "../db/db";
import { AppError } from "@/lib/errors";

// GET /account/user
export const account_GET = [
  passport.authenticate("jwt", { session: false }),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        profileImg: true,
      },
    });

    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User Not found");
    }
    res.json({
      user: user,
    });
  }),
];
