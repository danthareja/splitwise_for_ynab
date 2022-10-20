export async function authorize(req, res, next) {
  const { authorization } = req.headers;
  const token = authorization.split("Bearer ")[1];
  const allowedTokens = process.env.API_SECRET_KEY_LIST.split(",");

  if (!allowedTokens.includes(token)) {
    console.log("Rejected token:", token);
    res.status(401).json({ data: null, error: "You're not authorized" });
    return;
  }

  return next();
}
