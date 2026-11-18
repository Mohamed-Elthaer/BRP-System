import jwt from "jsonwebtoken";

export default async (payload) => {
  const token = await jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: "7d",
  });
  return token;
};
