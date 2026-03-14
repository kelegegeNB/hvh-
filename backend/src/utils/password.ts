import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const hashPassword = (password: string) => {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

export const verifyPassword = (password: string, hashed: string) => {
  const [saltHex, hashHex] = hashed.split(":");
  if (!saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  const test = scryptSync(password, salt, 64);
  return timingSafeEqual(hash, test);
};
