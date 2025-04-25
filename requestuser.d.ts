import * as express from "express";
// check what shape a user object is being passed into passport on app.ts
declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      username: string;
      email: string | null;
      profileImg: string | null;
      bannedUntil: Date | null;
      role: "ADMIN" | "USER";
    }
  }
}
