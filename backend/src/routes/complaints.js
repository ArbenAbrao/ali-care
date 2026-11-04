const r = require("express").Router();
const c = require("../controllers/complaintController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { csrfProtection } = require("../middleware/csrf");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
r.use(requireAuth, requireRole("Admin", "Superadmin"));
r.get("/dashboard", c.dashboard);
r.get("/reports", c.report);
r.get("/lookups", c.hubs);
r.get("/", c.list);
r.get("/:id", c.detail);
r.post(
  "/",
  csrfProtection,
  validate(
    z.object({
      employeeId: z.string().min(1).max(100),
      hubId: z.coerce.number().int().positive(),
      departmentId: z
        .union([z.coerce.number().int().positive(), z.null()])
        .optional(),
      severity: z.enum(["Low", "Medium", "High", "Critical"]),
      subject: z.string().max(2000).optional(),
      message: z.string().min(5).max(20000),
      reportedEmployeeIds: z
        .array(z.coerce.number().int().positive())
        .min(1)
        .max(20),
    }),
  ),
  c.create,
);
module.exports = r;
