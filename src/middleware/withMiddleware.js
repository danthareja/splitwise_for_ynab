export function withMiddleware(
  middleware,
  handler,
  handleError = defaultErrorHandler
) {
  if (!Array.isArray(middleware) || middleware.length < 1) {
    throw new Error(
      "Must pass an array of functions as the first argument to `withMiddleware`"
    );
  }

  return async function runWithMiddleware(...args) {
    try {
      await runAsyncStack([...middleware, handler], ...args);
    } catch (e) {
      await handleError(e, ...args);
    }
  };
}

function defaultErrorHandler(e, req, res) {
  console.error(e);
  return res.status(500).json({ data: e?.response?.data, error: e.message });
}

async function runAsyncStack(fns, ...args) {
  if (fns.length === 0) {
    return fn[0](...args);
  }
  const fn = fns[0];
  return fn(...args, async function next() {
    await runAsyncStack(fns.slice(1), ...args);
  });
}
