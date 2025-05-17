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

const MAX_FILESIZE = 9 * 1_048_576;
const upload = multer({
  storage: storage,
  limits: {
    fieldSize: MAX_FILESIZE, // max size for non file fields
    fileSize: MAX_FILESIZE, // max size for all individual files
  },
  fileFilter: (req, file, callback) => {
    const acceptedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ];

    console.log(
      "multer config -> mimetype uploaded to verify: ",
      file.mimetype,
    );
    const valid = acceptedMimeTypes.includes(file.mimetype);
    if (valid) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
});

export { upload };
