const r = require("express").Router();
const c = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { csrfProtection } = require("../middleware/csrf");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const newEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(100),
  name: z.string().min(2).max(220),
  hubId: z.coerce.number().int().positive(),
  departmentId: z.coerce.number().int().positive(),
});
r.use(requireAuth, requireRole("Superadmin"));
r.get("/accounts", c.accounts);
r.post(
  "/accounts",
  csrfProtection,
  validate(
    z.object({
      login: z.string().min(3).max(190),
      password: z.string().min(12).max(200),
      role: z.enum(["Admin", "Superadmin"]),
      employeeId: z.coerce.number().int().positive().nullable().optional(),
      newEmployee: newEmployeeSchema.optional(),
      active: z.boolean().optional(),
    }),
  ),
  c.saveAccount,
);
r.put(
  "/accounts/:id",
  csrfProtection,
  validate(
    z.object({
      login: z.string().min(3).max(190).optional(),
      password: z.string().min(12).max(200).optional(),
      role: z.enum(["Admin", "Superadmin"]),
      employeeId: z.coerce.number().int().positive().nullable().optional(),
      newEmployee: newEmployeeSchema.optional(),
      active: z.boolean().optional(),
    }),
  ),
  c.saveAccount,
);
r.get("/access-logs", c.logs);
r.get("/hubs", c.hubs);
r.post(
  "/hubs",
  csrfProtection,
  validate(z.object({ name: z.string().min(2).max(120) })),
  c.createHub,
);
r.get("/departments", c.departments);
r.post(
  "/departments",
  csrfProtection,
  validate(
    z.object({
      name: z.string().min(2).max(120),
      hubId: z.coerce.number().int().positive(),
    }),
  ),
  c.createDepartment,
);
module.exports = r;
