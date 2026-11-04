function requireAuth(req, res, next) {
  if (!req.session?.account)
    return res.status(401).json({ error: "Authentication required" });
  if (
    Date.now() - req.session.lastActivity >
    Number(process.env.SESSION_IDLE_MINUTES || 30) * 60000
  ) {
    return req.session.destroy(() =>
      res.status(401).json({ error: "Session expired" }),
    );
  }
  if (
    Date.now() - req.session.createdAt >
    Number(process.env.SESSION_ABSOLUTE_HOURS || 8) * 3600000
  ) {
    return req.session.destroy(() =>
      res.status(401).json({ error: "Session expired" }),
    );
  }
  req.session.lastActivity = Date.now();
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.account || !roles.includes(req.session.account.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
module.exports = { requireAuth, requireRole };
