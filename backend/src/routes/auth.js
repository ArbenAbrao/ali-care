const r = require("express").Router();
const rate = require("express-rate-limit");
const c = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { issueCsrf } = require("../middleware/csrf");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const authRate = rate({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});
r.get("/csrf", issueCsrf);
r.post(
  "/admin/login",
  authRate,
  validate(
    z.object({
      login: z.string().min(1).max(190),
      password: z.string().min(1).max(200),
    }),
  ),
  c.adminLogin,
);
r.post(
  "/superadmin/request-otp",
  authRate,
  validate(
    z.object({
      email: z.string().email().max(190),
      captchaToken: z.string().min(1),
    }),
  ),
  c.requestOtp,
);
r.post(
  "/superadmin/verify-otp",
  authRate,
  validate(z.object({ otp: z.string().regex(/^\d{6}$/) })),
  c.verifyOtp,
);
r.post("/logout", requireAuth, c.logout);
r.get("/me", c.me);
module.exports = r;
