import jwt from "jsonwebtoken";

export function generateToken(endpoint: string) {
  return jwt.sign(endpoint, process.env.SECRET_KEY!);
}
