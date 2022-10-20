export function checkMethod(method = "POST") {
  return async function runCheckMethod(req, res, next) {
    if (req.method !== method) {
      res.setHeader("Allow", method);
      res.status(405).json({ error: `Idk what to do unless you ${method}` });
      return;
    }
    return next();
  };
}
