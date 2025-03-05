import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createServer } from "http";
import HttpError from "./lib/httpError";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import authRouter from "./routes/auth";
import profilesRouter from "./routes/profiles";
import postRouter from "./routes/posts";

import morgan from "morgan";
import db from "@/db/db";
import cors from "cors";
import { AppError } from "./lib/errors";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000");

app.use(
  cors({
    origin: process.env.FE_URL!,
    optionsSuccessStatus: 200,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

passport.use(
  new JwtStrategy(
    {
      secretOrKey: process.env.JWT_SECRET!,
      algorithms: ["HS256"],
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    },
    async function (jwt_payload, done) {
      try {
        const user = await db.user.findUnique({
          where: {
            id: jwt_payload.sub,
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            bannedUntil: true,
            profileImg: true,
            role: true,
          },
        });
        if (!user) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

app.use("/auth", authRouter);
app.use("/profiles", profilesRouter);
app.use("/posts", postRouter);

// catch all 404 and forward to Error Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new HttpError("Page does not exist.", 404));
});

// error handler
app.use(
  (
    err: HttpError | AppError,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (err instanceof AppError) {
      res.status(err.status).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
      },
    });
  },
);

const server = createServer(app);
server.listen(PORT);
server.on("error", onError);
server.on("listening", onListening);
async function onError(error: Error & { syscall?: string; code?: string }) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      // await db.$disconnect();
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      // await db.$disconnect();
      process.exit(1);
      break;
    default:
      // await db.$disconnect();
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
  console.log("Listening on " + bind);
}

//graceful shutdowns
process.on("SIGHUP", async () => {
  // await db.$disconnect();
  server.close((err) => {
    console.log(err);
  });
  process.exit(1);
});

process.on("SIGINT", async () => {
  // await db.$disconnect();
  server.close((err) => {
    console.log(err);
  });
  process.exit(1);
});

process.on("SIGTERM", async () => {
  // await db.$disconnect();
  server.close((err) => {
    console.log(err);
  });
  process.exit(1);
});

process.on("exit", async () => {
  // await db.$disconnect();
  server.close((err) => {
    console.log(err);
  });
  process.exit(0);
});
