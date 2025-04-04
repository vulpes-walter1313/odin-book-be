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
import bcrypt from "bcryptjs";

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

export const updatePassword_PUT = [
  passport.authenticate("jwt", { session: false }),
  body("oldPassword").notEmpty(),
  body("newPassword")
    .isLength({ min: 8, max: 48 })
    .withMessage("New password must be between 8 and 48 characters"),
  body("confirmNewPassword")
    .custom((val, { req }) => {
      return val === req.body.newPassword;
    })
    .withMessage("New password and confirm new passwords don't match"),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const oldPassword = String(data.oldPassword);
    const newPassword = String(data.newPassword);

    const currentUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        password: true,
      },
    });
    if (!currentUser) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }

    const passwordValid = await bcrypt.compare(
      oldPassword,
      currentUser.password,
    );

    if (!passwordValid) {
      throw new AppError(403, "FORBIDDEN", "Password is not valid");
      return;
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        password: newPasswordHash,
      },
    });
    res.json({ message: "Password updated" });
    return;
  }),
];

export const updateUsername_PUT = [
  passport.authenticate("jwt", { session: false }),
  body("newUsername")
    .isLength({ min: 3, max: 32 })
    .custom((val) => {
      // checks if username doesn't have special characters
      // and does not start with an @ symbol
      return /^[a-zA-Z]\w+[^-_$%#@!&*()]$/.test(val);
    }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const newUsername = String(data.newUsername);
    const currentUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        username: true,
      },
    });
    if (!currentUser) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    const isUsernameTaken = await db.user.findUnique({
      where: {
        username: newUsername,
      },
      select: {
        id: true,
        username: true,
      },
    });
    if (isUsernameTaken) {
      throw new AppError(403, "FORBIDDEN", "Username already taken");
      return;
    }
    await db.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        username: newUsername,
      },
    });

    res.json({ message: "Username successfully updated" });
  }),
];

export const deleteAccount_DELETE = [
  passport.authenticate("jwt", { session: false }),
  body("password").notEmpty(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData(req);
    const password = String(data.password);
    const currentUser = await db.user.findUnique({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        username: true,
        password: true,
        profileImgId: true,
      },
    });
    if (!currentUser) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }

    const isValidPassword = await bcrypt.compare(
      password,
      currentUser.password,
    );
    if (!isValidPassword) {
      throw new AppError(403, "FORBIDDEN", "Password is not valid");
    }

    const allPosts = await db.post.findMany({
      where: {
        authorId: currentUser.id,
      },
      select: {
        id: true,
        imageId: true,
      },
    });

    // delete post images
    const imgIds: string[] = [];
    allPosts.forEach((post) => {
      if (post.imageId) {
        imgIds.push(post.imageId);
      }
    });
    const imgIdBatches: string[][] = [];
    const loopTimes = Math.ceil(imgIds.length / 100);
    for (let i = 0; i < loopTimes; i++) {
      const imgIdBatch: string[] = [];
      let round = 1;
      while (round <= 100) {
        round++;
        const imgId = imgIds.pop();
        if (!imgId) break;
        imgIdBatch.push(imgId);
      }
      imgIdBatches.push(imgIdBatch);
    }
    for (const batch of imgIdBatches) {
      const result = await cloudinary.api.delete_resources(batch);
      console.log("deleteAccount_DELETE cloudinary batch delete -> ", result);
    }

    // delete profile avatar
    if (currentUser.profileImgId) {
      const result = await cloudinary.uploader.destroy(
        currentUser.profileImgId,
      );
      console.log("delete profile avatar", result);
    }

    const deletedUser = await db.user.delete({
      where: {
        id: req.user?.id,
      },
      select: {
        id: true,
        username: true,
      },
    });

    res.json({
      message: "Account successfully deleted",
      username: deletedUser.username,
      id: deletedUser.id,
    });
  }),
];
