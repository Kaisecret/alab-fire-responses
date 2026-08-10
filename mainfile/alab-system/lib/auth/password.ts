import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, encodedSalt, encodedHash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedHash) return false;

  const expectedHash = Buffer.from(encodedHash, "base64url");
  const actualHash = await deriveKey(password, Buffer.from(encodedSalt, "base64url"));
  return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
}
