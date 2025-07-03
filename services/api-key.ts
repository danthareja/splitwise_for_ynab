import { customAlphabet } from "nanoid";

const nanoidAlphaNum = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32,
);

export function generateApiKey(): string {
  return `user_${nanoidAlphaNum()}`;
}
