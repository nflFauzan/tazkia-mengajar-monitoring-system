import { z } from "zod";

/**
 * The single shape every Server Action returns.
 *
 * Actions never throw at the client. A discriminated union means the caller has
 * to acknowledge the failure case, and `fieldErrors` lets a form highlight the
 * offending input rather than showing one generic banner.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Flattens a Zod error into one message per field.
 *
 * Only the first issue per field is kept: stacking messages under a single
 * input is noise, and the user fixes them one at a time anyway.
 */
export function fromZodError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fail("Periksa kembali data yang diisi.", fieldErrors);
}

/**
 * Logs the real error server-side and returns a human message.
 *
 * Every action funnels unexpected failures through here so a Prisma or driver
 * error never reaches the browser (CLAUDE.md section 30).
 */
export function handleUnexpected(
  context: string,
  error: unknown,
  userMessage: string,
): ActionResult<never> {
  console.error(`[${context}]`, error);
  return fail(userMessage);
}
