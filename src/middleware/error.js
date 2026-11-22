export function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err, req, res, next) {
  const dev = process.env.NODE_ENV !== "production";
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    const msg = keys.includes("email") ? "This email is already registered."
              : keys.includes("job") ? "You already applied to this job."
              : "This already exists.";
    return res.status(409).json({ error: msg });
  }
  if (err.name === "ValidationError" || err.name === "CastError") {
    console.error("⚠️", err.message);
    return res.status(400).json({ error: dev ? err.message : "Invalid data." });
  }
  console.error(err);
  res.status(500).json({ error: dev ? err.message : "Server error. Please try again." });
}