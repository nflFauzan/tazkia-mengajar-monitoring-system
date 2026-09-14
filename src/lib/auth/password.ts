import bcrypt from "bcryptjs";

/**
 * Cost 12. High enough that a leaked hash is expensive to attack, low enough
 * that a login stays well under a serverless function's time budget.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * bcrypt.compare is constant-time with respect to the hash, so this does not
 * leak how much of the password matched.
 */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
