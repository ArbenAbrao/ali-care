const db = require("../config/db");
const { blindIndex, encrypt } = require("../utils/crypto");
const { createComplaint } = require("../services/complaints");
const XLSX = require("xlsx");
const { parse } = require("csv-parse/sync");
const crypto = require("crypto");
async function context(req, res) {
  const token = req.params.token;
  const [h] = await db.execute(
    "SELECT id,name FROM hubs WHERE qr_token=? AND active=1",
    [token],
  );
  if (h.length) {
    return res.json({
      hub: { id: h[0].id, name: h[0].name },
      department: null,
    });
  }
  const [d] = await db.execute(
    "SELECT d.id,d.name,d.hub_id,h.name hub_name FROM departments d JOIN hubs h ON h.id=d.hub_id WHERE d.qr_token=? AND d.active=1 AND h.active=1",
    [token],
  );
  if (!d.length)
    return res.status(404).json({ error: "QR code is invalid or inactive" });
  res.json({
    hub: { id: d[0].hub_id, name: d[0].hub_name },
    department: { id: d[0].id, name: d[0].name },
  });
}
async function reportingLookups(req, res) {
  const [hubs] = await db.execute(
    "SELECT id,name FROM hubs WHERE active=1 ORDER BY name",
  );
  const [departments] = await db.execute(
    "SELECT id,hub_id,name FROM departments WHERE active=1 ORDER BY name",
  );
  const [employees] = await db.execute(
    "SELECT id,full_name,hub_id,department_id FROM employees WHERE status='Active' ORDER BY full_name",
  );
  res.json({ hubs, departments, employees });
}
async function lookup(req, res) {
  const b = blindIndex(req.body.employeeId);
  const [e] = await db.execute(
    "SELECT id,full_name,hub_id,department_id FROM employees WHERE employee_id_bidx=? AND status='Active'",
    [b],
  );
  if (!e.length)
    return res.status(404).json({ error: "Employee ID not found or inactive" });
  const [count] = await db.execute(
    "SELECT COUNT(*) n FROM complaints WHERE complainant_employee_bidx=? AND DATE(created_at)=DATE(NOW())",
    [b],
  );
  res.json({
    employee: { name: e[0].full_name },
    remaining: Math.max(0, 2 - Number(count[0].n)),
  });
}
async function submit(req, res) {
  const {
    employeeId,
    hubId,
    departmentId,
    severity,
    subject,
    message,
    reportedEmployeeIds,
  } = req.body;
  const out = await createComplaint({
    employeeId,
    hubId,
    departmentId,
    severity,
    subject,
    message,
    reportedEmployeeIds,
  });
  res
    .status(201)
    .json({
      complaintId: out.id,
      message: "Your complaint was submitted confidentially.",
    });
}
function safeToken() {
  return crypto.randomBytes(32).toString("hex");
}
async function listEmployees(req, res) {
  const page = Math.max(1, Number(req.query.page || 1)),
    limit = Math.min(100, Math.max(1, Number(req.query.limit || 20))),
    search = String(req.query.search || "");
  const args = [];
  let where = "1=1";
  if (search) {
    where = "(full_name LIKE ?)";
    args.push(`%${search}%`);
  }
  const [count] = await db.execute(
    `SELECT COUNT(*) total FROM employees WHERE ${where}`,
    args,
  );
  const [rows] = await db.execute(
    `SELECT e.id,e.full_name,e.status,e.hub_id,e.department_id,h.name hub_name,d.name department_name FROM employees e JOIN hubs h ON h.id=e.hub_id JOIN departments d ON d.id=e.department_id WHERE ${where} ORDER BY e.full_name LIMIT ? OFFSET ?`,
    [...args, limit, (page - 1) * limit],
  );
  res.json({ items: rows, page, limit, total: Number(count[0].total) });
}
async function hasActiveAccount(employeeId) {
  const [r] = await db.execute(
    "SELECT 1 FROM accounts WHERE employee_id=? AND active=1 LIMIT 1",
    [employeeId],
  );
  return r.length > 0;
}
async function saveEmployee(req, res) {
  const { employeeId, name, status, hubId, departmentId } = req.body;
  const b = blindIndex(employeeId),
    c = encrypt(employeeId);
  const [dep] = await db.execute(
    "SELECT id FROM departments WHERE id=? AND hub_id=?",
    [departmentId, hubId],
  );
  if (!dep.length)
    return res
      .status(400)
      .json({ error: "Department must belong to selected hub" });
  if (req.params.id) {
    const id = Number(req.params.id);
    // Admin/superadmin records must stay reportable, so they cannot be deactivated here.
    if (status === "Inactive" && (await hasActiveAccount(id)))
      return res.status(409).json({
        error:
          "This employee is linked to an active admin/superadmin account and cannot be set to Inactive",
      });
    await db.execute(
      "UPDATE employees SET employee_id_ciphertext=?,employee_id_iv=?,employee_id_tag=?,employee_id_bidx=?,full_name=?,status=?,hub_id=?,department_id=? WHERE id=?",
      [c.ciphertext, c.iv, c.tag, b, name, status, hubId, departmentId, id],
    );
    return res.json({ message: "Employee updated" });
  }
  await db.execute(
    "INSERT INTO employees(employee_id_ciphertext,employee_id_iv,employee_id_tag,employee_id_bidx,full_name,status,hub_id,department_id) VALUES(?,?,?,?,?,?,?,?)",
    [c.ciphertext, c.iv, c.tag, b, name, status, hubId, departmentId],
  );
  res.status(201).json({ message: "Employee created" });
}
async function importEmployees(req, res) {
  if (!req.file)
    return res.status(400).json({ error: "Upload a CSV or XLSX file" });
  let records = [];
  if (req.file.originalname.toLowerCase().endsWith(".csv"))
    records = parse(req.file.buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  else {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    records = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
      defval: "",
    });
  }
  const seen = new Set();
  const summary = {
    inserted: 0,
    updated: 0,
    skippedDuplicates: 0,
    invalid: [],
    rows: records.length,
  };
  for (let i = 0; i < records.length; i++) {
    const r = records[i],
      row = i + 2;
    const name = String(r.Name || r.name || "").trim(),
      status = String(r.Status || r.status || "").trim(),
      branch = String(r.Branch || r.branch || "").trim(),
      department = String(r.Department || r.department || "").trim(),
      employeeId = String(r["Employee ID"] || r.employee_id || "").trim();
    if (
      !name ||
      !employeeId ||
      !["Active", "Inactive"].includes(status) ||
      !branch ||
      !department
    ) {
      summary.invalid.push({
        row,
        reason: "Required fields missing or Status must be Active/Inactive",
      });
      continue;
    }
    const b = blindIndex(employeeId);
    if (seen.has(b)) {
      summary.skippedDuplicates++;
      continue;
    }
    seen.add(b);
    const [h] = await db.execute("SELECT id FROM hubs WHERE name=?", [branch]);
    if (!h.length) {
      summary.invalid.push({ row, reason: `Unknown Branch: ${branch}` });
      continue;
    }
    const [d] = await db.execute(
      "SELECT id FROM departments WHERE hub_id=? AND name=?",
      [h[0].id, department],
    );
    if (!d.length) {
      summary.invalid.push({
        row,
        reason: `Unknown Department: ${department} for ${branch}`,
      });
      continue;
    }
    const c = encrypt(employeeId);
    const [existing] = await db.execute(
      "SELECT id FROM employees WHERE employee_id_bidx=?",
      [b],
    );
    if (existing.length) {
      if (status === "Inactive" && (await hasActiveAccount(existing[0].id))) {
        summary.invalid.push({
          row,
          reason: "Linked to an active admin/superadmin account; cannot be Inactive",
        });
        continue;
      }
      await db.execute(
        "UPDATE employees SET employee_id_ciphertext=?,employee_id_iv=?,employee_id_tag=?,full_name=?,status=?,hub_id=?,department_id=? WHERE id=?",
        [
          c.ciphertext,
          c.iv,
          c.tag,
          name,
          status,
          h[0].id,
          d[0].id,
          existing[0].id,
        ],
      );
      summary.updated++;
    } else {
      await db.execute(
        "INSERT INTO employees(employee_id_ciphertext,employee_id_iv,employee_id_tag,employee_id_bidx,full_name,status,hub_id,department_id) VALUES(?,?,?,?,?,?,?,?)",
        [c.ciphertext, c.iv, c.tag, b, name, status, h[0].id, d[0].id],
      );
      summary.inserted++;
    }
  }
  res.json(summary);
}
async function qrList(req, res) {
  const [h] = await db.execute(
    "SELECT id,name,qr_token FROM hubs ORDER BY name",
  );
  const [d] = await db.execute(
    "SELECT d.id,d.name,d.qr_token,h.name hub_name FROM departments d JOIN hubs h ON h.id=d.hub_id ORDER BY h.name,d.name",
  );
  res.json({ hubs: h, departments: d });
}
async function qrCreate(req, res) {
  const { type, id } = req.body;
  const table =
    type === "hub" ? "hubs" : type === "department" ? "departments" : null;
  if (!table) return res.status(400).json({ error: "Invalid QR type" });
  const token = safeToken();
  await db.execute(`UPDATE ${table} SET qr_token=? WHERE id=?`, [token, id]);
  res.json({
    url: `${process.env.FRONTEND_PUBLIC_URL || "http://localhost:5173"}/report/${token}`,
  });
}
module.exports = {
  context,
  reportingLookups,
  lookup,
  submit,
  listEmployees,
  saveEmployee,
  importEmployees,
  qrList,
  qrCreate,
};
