export class AppError extends Error {
  status: number;
  code: string;
  details: any | undefined;
  constructor(status = 500, code: string, msg: string, details?: any) {
    super(msg);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
