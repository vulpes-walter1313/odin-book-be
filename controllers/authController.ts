import { type Request, type Response, type NextFunction } from "express";
import { body, matchedData } from "express-validator";
import db from "../db/db.ts";
import { validateErrors } from "../middleware/validation.ts";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AppError } from "../lib/errors.ts";
import passport from "passport";
import status from "http-status";

// POST /auth/signup
export const signup_POST = [
  body("name")
    .isLength({ min: 3, max: 48 })
    .withMessage("Name must be between 3 and 48 characters."),
  body("username")
    .isLength({ min: 3, max: 32 })
    .withMessage("username must be between 3 and 32 characters")
    .custom(async (value) => {
      const user = await db.user.findUnique({
        where: {
          username: value,
        },
      });
      if (user) {
        throw new Error("Username taken");
      }
    }),
  body("email")
    .isEmail()
    .custom(async (value) => {
      const user = await db.user.findUnique({
        where: {
          email: value,
        },
      });
      if (user) {
        throw new Error("Email already registered");
      }
    }),
  body("password").isLength({ min: 8, max: 64 }),
  body("confirmPassword").custom((value, { req }) => {
    return value === req.body.password;
  }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // At this point, we know there are no validation errors.

    const { name, username, email, password } = matchedData(req);

    const account = await db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "CREDENTIALS",
          providerAccountId: email,
        },
      },
    });
    if (account) {
      throw new AppError(
        status.CONFLICT,
        status[status.CONFLICT],
        "Account already exists",
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const [newUser, newAccount] = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          username,
          email,
          password: hash,
        },
      });

      const newAccount = await tx.account.create({
        data: {
          userId: newUser.id,
          provider: "CREDENTIALS",
          providerAccountId: newUser.email!,
        },
      });
      return [newUser, newAccount];
    });

    jwt.sign(
      { sub: newUser.id, username: newUser.username, name: newUser.name },
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "5m",
      },
      (err, accessToken) => {
        if (err) {
          next(err);
          return;
        }
        jwt.sign(
          { sub: newUser.id },
          process.env.JWT_SECRET!,
          {
            algorithm: "HS256",
            expiresIn: "7d",
          },
          (err, refreshToken) => {
            if (err) {
              next(err);
              return;
            }
            res.json({ success: true, accessToken, refreshToken });
            return;
          },
        );
      },
    );
  }),
];

// POST /auth/signin
export const signin_POST = [
  body("email").isEmail(),
  body("password").isLength({ min: 1, max: 64 }),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // At this point we know there is no validation errors.
    // TODO: See if user exists
    const { email, password } = matchedData(req);
    const user = await db.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        name: true,
        username: true,
        bannedUntil: true,
        password: true,
        email: true,
      },
    });
    if (!user) {
      const error = new AppError(
        401,
        "UNAUTHORIZED",
        "Email or password is incorrect",
      );
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    const passwordsMatch = await bcrypt.compare(password, user.password!);
    if (!passwordsMatch) {
      const error = new AppError(
        401,
        "UNAUTHORIZED",
        "Email or password is incorrect",
      );
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    // TODO: Check if user is banned
    const isBanned =
      user.bannedUntil != null && user.bannedUntil > new Date(Date.now());
    if (isBanned) {
      const error = new AppError(403, "BANNED", "You are currently banned.", {
        bannedUntil: user.bannedUntil,
      });
      res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }
    // TODO: issue access JWT and refresh token
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLogin: new Date(Date.now()),
      },
    });

    jwt.sign(
      { sub: user.id, username: user.username, name: user.name },
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "5m",
      },
      (err, accessToken) => {
        if (err) {
          next(err);
          return;
        }
        jwt.sign(
          { sub: user.id },
          process.env.JWT_SECRET!,
          {
            algorithm: "HS256",
            expiresIn: "7d",
          },
          (err, refreshToken) => {
            if (err) {
              next(err);
              return;
            }
            res.json({ success: true, accessToken, refreshToken });
            return;
          },
        );
      },
    );
  }),
];

// POST /auth/refresh
export const refreshToken_POST = [
  body("refreshToken").isJWT(),
  validateErrors,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = matchedData(req);
    jwt.verify(
      refreshToken,
      process.env.JWT_SECRET!,
      {
        algorithms: ["HS256"],
      },
      async (err, payload) => {
        if (err) {
          next(err);
          return;
        }
        if (!payload) {
          throw new AppError(
            500,
            "INTERNAL_SERVER_ERROR",
            "JWT Payload is undefined",
          );
        }
        if (typeof payload === "string") {
          throw new AppError(
            500,
            "INTERNAL_SERVER_ERROR",
            "JWT payload is string instead of object",
          );
        }
        // check if user exists
        const user = await db.user.findUnique({
          where: {
            id: payload.sub,
          },
        });
        if (!user) {
          throw new AppError(404, "NOT_FOUND", "User Not found");
        }
        // chech is user is banned
        const isBanned =
          user.bannedUntil != null && user.bannedUntil > new Date(Date.now());
        if (isBanned) {
          const error = new AppError(
            403,
            "BANNED",
            "You are banned and can not get an access token",
            { bannedUntil: user.bannedUntil },
          );
          res.status(error.status).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          });
          return;
        }
        // All OK: issue new tokens
        const userPayload = {
          sub: user.id,
          username: user.username,
          name: user.name,
        };

        jwt.sign(
          userPayload,
          process.env.JWT_SECRET!,
          {
            algorithm: "HS256",
            expiresIn: "5m",
          },
          (err, newAccessToken) => {
            if (err) {
              next(err);
              return;
            }
            jwt.sign(
              { sub: user.id },
              process.env.JWT_SECRET!,
              {
                algorithm: "HS256",
                expiresIn: "7d",
              },
              (err, newRefreshToken) => {
                if (err) {
                  next(err);
                  return;
                }
                res.json({
                  success: true,
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken,
                });
              },
            );
          },
        );
      },
    );
  }),
];

// GET /auth/check
export const check_GET = [
  passport.authenticate("jwt", { session: false }),
  (req: Request, res: Response, next: NextFunction) => {
    res.json({
      success: true,
      message: "You are authenticated",
      // @ts-ignore
      username: req.user?.username,
      //@ts-ignore
      name: req.user?.name,
      // @ts-ignore
      profileImg: req.user?.profileImg,
      isAdmin: req.user?.role && req.user.role === "ADMIN" ? true : false,
    });
  },
];

// GET /auth/google
export const googleLogin_GET = [
  passport.authenticate("google", { session: false, scope: ["profile"] }),
];

// GET /auth/google/callback
export const googleLoginCallback_GET = [
  passport.authenticate("google", { session: false }),
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    jwt.sign(
      { sub: req.user?.id, username: req.user?.username, name: req.user?.name },
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "5m",
      },
      (err, accessToken) => {
        if (err) {
          next(err);
          return;
        }
        jwt.sign(
          { sub: req.user?.id },
          process.env.JWT_SECRET!,
          {
            algorithm: "HS256",
            expiresIn: "7d",
          },
          (err, refreshToken) => {
            if (err) {
              next(err);
              return;
            }
            res.redirect(
              `${process.env.FE_URL}/oauth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`,
            );
            return;
          },
        );
      },
    );
  }),
];
