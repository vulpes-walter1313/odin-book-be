import multer from "multer";
import { createId } from "@paralleldrive/cuid2";

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const date = new Date(Date.now());
    const newFilename = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}_${createId()}.${ext}`;
    cb(null, newFilename);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 5 * 1048576,
  },
});

export { upload };
