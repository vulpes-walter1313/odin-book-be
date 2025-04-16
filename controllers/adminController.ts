import passport from "passport";
import { type Request, type Response, type NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { AppError } from "@/lib/errors";
import { status } from "http-status";
import db from "@/db/db";
import { body, matchedData, param } from "express-validator";
import { validateErrors } from "@/middleware/validation";
import { createIdBatchesForDeletion } from "@/lib/utils";
import cloudinary from "@/lib/cloudinaryUploader";

// DELETE /admin/users/:username
export const deleteUser_DELETE = [
  passport.authenticate("jwt", { session: false }),
  param("username").isLength({ max: 32 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const currentUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        role: true,
      },
    });

    const username = String(data.username);

    if (!currentUser) {
      throw new AppError(
        status.FORBIDDEN,
        "FORBIDDEN",
        "User not found in jwt",
      );
    }
    const canDelete = currentUser.role === "ADMIN";
    if (!canDelete) {
      throw new AppError(
        status.FORBIDDEN,
        "FORBIDDEN",
        "You are not allowed to perform this action",
      );
    }

    const userToBeDeleted = await db.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true,
        username: true,
        profileImgId: true,
      },
    });

    if (!userToBeDeleted) {
      throw new AppError(status.NOT_FOUND, "NOT_FOUND", "User not found");
    }

    // delete cloudinary images from user's posts.
    const allUsersPosts = await db.post.findMany({
      where: {
        authorId: userToBeDeleted.id,
      },
      select: {
        imageId: true,
      },
    });
    const imgIds: string[] = [];
    allUsersPosts.forEach((post) => {
      if (post.imageId) {
        imgIds.push(post.imageId);
      }
    });

    // delete images from posts
    const imgIdBatches = createIdBatchesForDeletion(imgIds, 100);
    for (const batch of imgIdBatches) {
      const result = await cloudinary.api.delete_resources(batch);
      console.log("deleting images", result);
    }

    // delete avatar pic
    if (userToBeDeleted.profileImgId) {
      const result = await cloudinary.uploader.destroy(
        userToBeDeleted.profileImgId,
      );
      console.log(
        `deleting profile avatar from ${userToBeDeleted.username}`,
        result,
      );
    }

    // Delete user from db.
    const deletedUser = await db.user.delete({
      where: {
        id: userToBeDeleted.id,
      },
      select: {
        id: true,
        username: true,
      },
    });

    res.json({
      message: "User successfully deleted",
      username: deletedUser.username,
      userId: deletedUser.id,
    });
  }),
];

// POST /admin/users/ban
export const banUser_POST = [
  passport.authenticate("jwt", { session: false }),
  body("username").isLength({ max: 32 }),
  body("banUntil").isISO8601(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const authUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
    if (!authUser) {
      throw new AppError(
        status.FORBIDDEN,
        "FORBIDDEN",
        "Authed user not found",
      );
    }
    if (authUser.role !== "ADMIN") {
      throw new AppError(
        status.FORBIDDEN,
        "FORBIDDEN",
        "You don't have the privilages to perform this action",
      );
    }
    const userToBan = await db.user.findUnique({
      where: {
        username: data.username,
      },
      select: {
        id: true,
      },
    });
    if (!userToBan) {
      throw new AppError(status.NOT_FOUND, "NOT_FOUND", "User not found");
    }

    const banDate = new Date(data.banUntil);
    const bannedUser = await db.user.update({
      where: {
        id: userToBan.id,
      },
      data: {
        bannedUntil: banDate,
      },
      select: {
        id: true,
        username: true,
        bannedUntil: true,
      },
    });

    res.json({
      message: "Ban user to be implemented",
      username: bannedUser.username,
      bannedUntil: bannedUser.bannedUntil,
    });
  }),
];
