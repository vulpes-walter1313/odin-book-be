import { AppError } from "@/lib/errors";
import { type Request, type Response, type NextFunction } from "express";
import { validationResult } from "express-validator";

export const validateErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const valResult = validationResult(req);
  if (!valResult.isEmpty()) {
    const error = new AppError(
      400,
      "VALIDATION_ERROR",
      "There was an error in data validation",
    );
    res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      validationErrors: valResult.mapped(),
    });
    return;
  } else {
    next();
  }
};
