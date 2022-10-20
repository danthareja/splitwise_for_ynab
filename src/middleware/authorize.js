export function withAuthorization(next) {
  return async function handlerWithAuthorization(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res
        .status(405)
        .json({ data: null, error: "Idk what to do unless you POST" });
      return;
    }

    const { authorization } = req.headers;
    const token = authorization.split("Bearer ")[1];
    const allowedTokens = process.env.API_SECRET_KEY_LIST.split(",");

    if (!allowedTokens.includes(token)) {
      console.log("Rejected token:", token);
      res.status(401).json({ data: null, error: "Sorry, you can't do that" });
      return;
    }

    return next(req, res);
  };
}
