type CodeType =
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "BANNED"
  | "UNAUTHORIZED"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND";
export class AppError extends Error {
  status: number;
  code: CodeType;
  details: any | undefined;
  constructor(status = 500, code: CodeType, msg: string, details?: any) {
    super(msg);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
