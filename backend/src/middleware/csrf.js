const crypto = require("crypto");
function issueCsrf(req, res) {
  if (!req.session.csrfToken)
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  res.json({ csrfToken: req.session.csrfToken });
}
function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const supplied = req.get("x-csrf-token");
  const expected = req.session?.csrfToken;
  if (
    !supplied ||
    !expected ||
    String(supplied).length !== String(expected).length ||
    !crypto.timingSafeEqual(
      Buffer.from(String(supplied)),
      Buffer.from(String(expected)),
    )
  )
    return res.status(403).json({ error: "Invalid CSRF token" });
  next();
}
module.exports = { issueCsrf, csrfProtection };
