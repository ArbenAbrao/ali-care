const r = require("express").Router();
const rate = require("express-rate-limit");
const multer = require("multer");
const c = require("../controllers/employeeController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { csrfProtection } = require("../middleware/csrf");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, /\.(csv|xlsx)$/i.test(file.originalname)),
});
const submissionRate = rate({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
});
r.get("/context/:token", c.context);
r.get("/reporting-lookups", c.reportingLookups);
r.post(
  "/lookup",
  submissionRate,
  validate(z.object({ employeeId: z.string().min(1).max(100) })),
  c.lookup,
);
r.post(
  "/submit",
  submissionRate,
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
  c.submit,
);
r.get("/", requireAuth, requireRole("Admin", "Superadmin"), c.listEmployees);
r.post(
  "/",
  requireAuth,
  requireRole("Admin", "Superadmin"),
  csrfProtection,
  validate(
    z.object({
      employeeId: z.string().min(1).max(100),
      name: z.string().min(2).max(220),
      status: z.enum(["Active", "Inactive"]),
      hubId: z.coerce.number().int().positive(),
      departmentId: z.coerce.number().int().positive(),
    }),
  ),
  c.saveEmployee,
);
r.put(
  "/:id",
  requireAuth,
  requireRole("Admin", "Superadmin"),
  csrfProtection,
  validate(
    z.object({
      employeeId: z.string().min(1).max(100),
      name: z.string().min(2).max(220),
      status: z.enum(["Active", "Inactive"]),
      hubId: z.coerce.number().int().positive(),
      departmentId: z.coerce.number().int().positive(),
    }),
  ),
  c.saveEmployee,
);
r.post(
  "/import",
  requireAuth,
  requireRole("Admin", "Superadmin"),
  csrfProtection,
  upload.single("file"),
  c.importEmployees,
);
r.get("/qr", requireAuth, requireRole("Admin", "Superadmin"), c.qrList);
r.post(
  "/qr",
  requireAuth,
  requireRole("Admin", "Superadmin"),
  csrfProtection,
  c.qrCreate,
);
module.exports = r;
