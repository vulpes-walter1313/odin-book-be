import type { Request, Response, NextFunction } from "express";
import passport from "passport";
import asyncHandler from "express-async-handler";
import db from "../db/db";
import { AppError } from "@/lib/errors";
import { body, matchedData } from "express-validator";
import { validateErrors } from "@/middleware/validation";
import { upload } from "@/middleware/multer";
import cloudinary from "@/lib/cloudinaryUploader";
import fs from "node:fs/promises";
import { Prisma } from "@prisma/client";
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

// PUT /account/user
export const editAccountInfo_PUT = [
  passport.authenticate("jwt", { session: false }),
  upload.single("profileImg"),
  body("name").isLength({ max: 48 }),
  body("bio").isLength({ max: 512 }).optional(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const name = String(data.name);
    const bio = String(data.bio);

    // Get current user
    const currentUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        profileImg: true,
        profileImgId: true,
      },
    });
    if (!currentUser) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }

    // Upload image if there;
    if (req.file) {
      const filePath = req.file.path;
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        use_filename: true,
        asset_folder: "odin-book/avatars",
      });

      if (currentUser.profileImg) {
        // TODO: check if profileImgId exists as this might throw since
        // users table has profileImgId as nullable.
        await cloudinary.uploader.destroy(currentUser.profileImgId!);
      }
      await db.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          name: name ?? Prisma.skip,
          bio: bio ?? "",
          profileImg: uploadResult.secure_url,
          profileImgId: uploadResult.public_id,
        },
      });
      await fs.rm(req.file.path);
      res.json({ message: "User profile updated" });
      return;
    }

    // issue update without profileImg
    await db.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        name: name ?? Prisma.skip,
        bio: bio ?? "",
      },
    });
    res.json({ message: "User profile updated without profile image" });
  }),
];
