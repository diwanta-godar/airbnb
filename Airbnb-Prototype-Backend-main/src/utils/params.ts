import { AppError } from "../middleware/errorHandler";

/** Express 5 params can be string | string[]; normalize to a single string. */
export function param(value: string | string[] | undefined, name = "id"): string {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (!resolved) {
    throw new AppError(`Missing route parameter: ${name}`, 400);
  }
  return resolved;
}
