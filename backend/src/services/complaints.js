const db = require("../config/db");
const { encrypt, decrypt, blindIndex } = require("../utils/crypto");
const { manilaDateRange } = require("../utils/time");
const { visibilitySql } = require("./visibility");
async function createComplaint({
  employeeId,
  hubId,
  departmentId,
  severity,
  subject,
  message,
  reportedEmployeeIds,
  accountId = null,
}) {
  const bidx = blindIndex(employeeId);
  const [emp] = await db.execute(
    "SELECT id,employee_id_ciphertext,employee_id_iv,employee_id_tag FROM employees WHERE employee_id_bidx=? AND status='Active'",
    [bidx],
  );
  if (!emp.length)
    throw Object.assign(new Error("Employee ID not found or inactive"), {
      status: 404,
    });
  const range = manilaDateRange();
  const [count] = await db.execute(
    "SELECT COUNT(*) n FROM complaints WHERE complainant_employee_bidx=? AND created_at BETWEEN ? AND ?",
    [bidx, range.start, range.end],
  );
  if (Number(count[0].n) >= 2)
    throw Object.assign(new Error("Daily complaint limit reached"), {
      status: 429,
    });
  if (!reportedEmployeeIds?.length)
    throw Object.assign(
      new Error("Select at least one employee being reported"),
      { status: 400 },
    );
  const ids = [...new Set(reportedEmployeeIds.map(Number))];
  const [reported] = await db.query(
    `SELECT id FROM employees WHERE status='Active' AND id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  if (reported.length !== ids.length)
    throw Object.assign(
      new Error("One or more reported employees are invalid or inactive"),
      { status: 400 },
    );
  const cEmp = encrypt(employeeId),
    cSub = subject ? encrypt(subject) : null,
    cMsg = encrypt(message);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      "INSERT INTO complaints(context_hub_id,context_department_id,complainant_employee_bidx,complainant_employee_ciphertext,complainant_employee_iv,complainant_employee_tag,severity,subject_ciphertext,subject_iv,subject_tag,message_ciphertext,message_iv,message_tag,created_by_account_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        hubId,
        departmentId || null,
        bidx,
        cEmp.ciphertext,
        cEmp.iv,
        cEmp.tag,
        severity,
        cSub?.ciphertext || null,
        cSub?.iv || null,
        cSub?.tag || null,
        cMsg.ciphertext,
        cMsg.iv,
        cMsg.tag,
        accountId,
      ],
    );
    for (const id of ids)
      await conn.execute(
        "INSERT INTO complaint_reported_employees(complaint_id,employee_id) VALUES(?,?)",
        [ins.insertId, id],
      );
    await conn.commit();
    return { id: ins.insertId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
async function listComplaints(
  accountId,
  {
    page = 1,
    limit = 20,
    search = "",
    severity = "",
    hubId = "",
    departmentId = "",
    from = "",
    to = "",
    sort = "created_at",
    order = "DESC",
  } = {},
) {
  page = Math.max(1, Number(page));
  limit = Math.min(100, Math.max(1, Number(limit)));
  const where = [visibilitySql];
  const args = [accountId];
  if (severity) {
    where.push("c.severity=?");
    args.push(severity);
  }
  if (hubId) {
    where.push("c.context_hub_id=?");
    args.push(Number(hubId));
  }
  if (departmentId) {
    where.push("c.context_department_id=?");
    args.push(Number(departmentId));
  }
  if (from) {
    where.push("DATE(c.created_at)>=?");
    args.push(from);
  }
  if (to) {
    where.push("DATE(c.created_at)<=?");
    args.push(to);
  }
  if (search) {
    where.push("(CAST(c.id AS CHAR) LIKE ? OR e.full_name LIKE ?)");
    args.push(`%${search}%`, `%${search}%`);
  }
  const clause = where.join(" AND ");
  const allowedSort = ["created_at", "id", "severity"];
  const sortCol = allowedSort.includes(sort) ? sort : "created_at";
  const direction = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";
  const [ct] = await db.execute(
    `SELECT COUNT(DISTINCT c.id) total FROM complaints c LEFT JOIN complaint_reported_employees cre ON cre.complaint_id=c.id LEFT JOIN employees e ON e.id=cre.employee_id WHERE ${clause}`,
    args,
  );
  const [rows] = await db.execute(
    `SELECT c.id,c.severity,c.created_at,h.name hub_name,d.name department_name,GROUP_CONCAT(DISTINCT e.full_name ORDER BY e.full_name SEPARATOR ', ') reported_names FROM complaints c JOIN hubs h ON h.id=c.context_hub_id LEFT JOIN departments d ON d.id=c.context_department_id LEFT JOIN complaint_reported_employees cre ON cre.complaint_id=c.id LEFT JOIN employees e ON e.id=cre.employee_id WHERE ${clause} GROUP BY c.id ORDER BY c.${sortCol} ${direction} LIMIT ? OFFSET ?`,
    [...args, limit, (page - 1) * limit],
  );
  return {
    items: rows.map((r) => ({ ...r, reported_names: r.reported_names || "" })),
    page,
    limit,
    total: Number(ct[0].total),
  };
}
async function complaintDetail(accountId, id) {
  const [rows] = await db.execute(
    `SELECT c.*,h.name hub_name,d.name department_name FROM complaints c JOIN hubs h ON h.id=c.context_hub_id LEFT JOIN departments d ON d.id=c.context_department_id WHERE c.id=? AND ${visibilitySql}`,
    [id, accountId],
  );
  if (!rows.length)
    throw Object.assign(new Error("Complaint not found"), { status: 404 });
  const r = rows[0];
  const [people] = await db.execute(
    "SELECT e.id,e.full_name,e.status FROM complaint_reported_employees cre JOIN employees e ON e.id=cre.employee_id WHERE cre.complaint_id=?",
    [id],
  );
  return {
    id: r.id,
    severity: r.severity,
    subject: r.subject_ciphertext ? decrypt(r, "subject_") : "",
    message: decrypt(r, "message_"),
    createdAt: r.created_at,
    hub: r.hub_name,
    department: r.department_name,
    reportedEmployees: people,
  };
}
async function dashboard(accountId) {
  const [severity] = await db.execute(
    `SELECT c.severity label,COUNT(*) value FROM complaints c WHERE ${visibilitySql} GROUP BY c.severity`,
    [accountId],
  );
  const [hubs] = await db.execute(
    `SELECT h.name label,COUNT(*) value FROM complaints c JOIN hubs h ON h.id=c.context_hub_id WHERE ${visibilitySql} GROUP BY h.id`,
    [accountId],
  );
  const [days] = await db.execute(
    `SELECT DATE(c.created_at) label,COUNT(*) value FROM complaints c WHERE c.created_at>=DATE_SUB(CURDATE(),INTERVAL 30 DAY) AND ${visibilitySql} GROUP BY DATE(c.created_at) ORDER BY DATE(c.created_at)`,
    [accountId],
  );
  const [total] = await db.execute(
    `SELECT COUNT(*) total FROM complaints c WHERE ${visibilitySql}`,
    [accountId],
  );
  return {
    total: Number(total[0].total),
    bySeverity: severity,
    byHub: hubs,
    overTime: days,
  };
}
async function report(accountId, filters = {}) {
  const full = [];
  let page = 1;
  while (true) {
    const result = await listComplaints(accountId, {
      ...filters,
      page,
      limit: 100,
    });
    for (const row of result.items) {
      full.push({ ...row, ...(await complaintDetail(accountId, row.id)) });
    }
    if (page * 100 >= result.total || result.items.length === 0) break;
    page++;
  }
  return full;
}
module.exports = {
  createComplaint,
  listComplaints,
  complaintDetail,
  dashboard,
  report,
};
