const db = require("../config/db");
const argon2 = require("argon2");
const { encrypt, decrypt, blindIndex } = require("../utils/crypto");
const { logAccess } = require("../services/accessLog");
async function accounts(req, res) {
  const [rows] = await db.execute(
    "SELECT a.id,a.role,a.login_ciphertext,a.login_iv,a.login_tag,a.employee_id,a.active,a.created_at,e.full_name employee_name FROM accounts a LEFT JOIN employees e ON e.id=a.employee_id ORDER BY a.id",
  );
  const items = rows.map(({ login_ciphertext, login_iv, login_tag, ...r }) => {
    let login = "";
    try {
      login = decrypt({ login_ciphertext, login_iv, login_tag }, "login_");
    } catch {
      login = "(unreadable)";
    }
    return { ...r, login };
  });
  res.json({ items });
}
// Every admin/superadmin account must be tied to an employee record.
// That record is what lets users report the admin, and what hides those
// complaints from that admin (see services/visibility.js).
async function resolveEmployeeLink(conn, { employeeId, newEmployee }) {
  if (newEmployee) {
    const { employeeCode, name, hubId, departmentId } = newEmployee;
    const [dep] = await conn.execute(
      "SELECT id FROM departments WHERE id=? AND hub_id=?",
      [departmentId, hubId],
    );
    if (!dep.length)
      throw Object.assign(new Error("Department must belong to selected hub"), {
        status: 400,
      });
    const b = blindIndex(employeeCode),
      c = encrypt(employeeCode);
    const [dupe] = await conn.execute(
      "SELECT id FROM employees WHERE employee_id_bidx=?",
      [b],
    );
    if (dupe.length)
      throw Object.assign(
        new Error("Employee ID already exists. Link the existing record instead."),
        { status: 409 },
      );
    const [r] = await conn.execute(
      "INSERT INTO employees(employee_id_ciphertext,employee_id_iv,employee_id_tag,employee_id_bidx,full_name,status,hub_id,department_id) VALUES(?,?,?,?,?,'Active',?,?)",
      [c.ciphertext, c.iv, c.tag, b, name, hubId, departmentId],
    );
    return r.insertId;
  }
  if (employeeId) {
    const [e] = await conn.execute(
      "SELECT id FROM employees WHERE id=? AND status='Active'",
      [employeeId],
    );
    if (!e.length)
      throw Object.assign(new Error("Linked employee record not found or inactive"), {
        status: 400,
      });
    return Number(employeeId);
  }
  return null;
}
async function saveAccount(req, res) {
  const { login, password, role, employeeId, newEmployee, active } = req.body;
  if (!["Admin", "Superadmin"].includes(role))
    return res.status(400).json({ error: "Invalid role" });
  const id = req.params.id ? Number(req.params.id) : null;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (role === "Superadmin") {
      const [n] = await conn.query(
        "SELECT COUNT(*) n FROM accounts WHERE role='Superadmin' AND active=1 AND id<>COALESCE(?,0) FOR UPDATE",
        [id],
      );
      if (Number(n[0].n) >= 2 && (!id || req.body.active !== false))
        throw Object.assign(
          new Error("Maximum of two active superadmin accounts"),
          { status: 409 },
        );
    }
    let hash = null;
    if (password) hash = await argon2.hash(password, { type: argon2.argon2id });
    const c = login ? encrypt(login) : null;
    const b = login ? blindIndex(login) : null;
    if (id) {
      const [cur] = await conn.execute(
        "SELECT employee_id FROM accounts WHERE id=? FOR UPDATE",
        [id],
      );
      if (!cur.length)
        throw Object.assign(new Error("Account not found"), { status: 404 });
      let link = cur[0].employee_id; // keep the existing link by default
      if (employeeId || newEmployee) {
        // An account may not change its own link, otherwise a reported
        // admin could unlink themselves and start seeing complaints about them.
        if (id === req.session.account.id && link)
          throw Object.assign(
            new Error("You cannot change your own linked employee record"),
            { status: 403 },
          );
        link = await resolveEmployeeLink(conn, { employeeId, newEmployee });
      }
      if (!link)
        throw Object.assign(
          new Error(
            "Link this account to an employee record so it can be reported",
          ),
          { status: 400 },
        );
      const fields = [],
        args = [];
      if (c) {
        fields.push(
          "login_ciphertext=?",
          "login_iv=?",
          "login_tag=?",
          "login_bidx=?",
        );
        args.push(c.ciphertext, c.iv, c.tag, b);
      }
      if (hash) {
        fields.push("password_hash=?");
        args.push(hash);
      }
      fields.push("role=?", "employee_id=?", "active=?");
      args.push(role, link, active !== false, id);
      await conn.execute(
        `UPDATE accounts SET ${fields.join(",")} WHERE id=?`,
        args,
      );
    } else {
      if (!c || !hash)
        throw Object.assign(new Error("Login and password are required"), {
          status: 400,
        });
      const link = await resolveEmployeeLink(conn, { employeeId, newEmployee });
      if (!link)
        throw Object.assign(
          new Error(
            "Every admin/superadmin account must be linked to an employee record so it can be reported",
          ),
          { status: 400 },
        );
      await conn.execute(
        "INSERT INTO accounts(role,login_ciphertext,login_iv,login_tag,login_bidx,password_hash,employee_id,active) VALUES(?,?,?,?,?,?,?,?)",
        [role, c.ciphertext, c.iv, c.tag, b, hash, link, active !== false],
      );
    }
    await conn.commit();
    res
      .status(id ? 200 : 201)
      .json({ message: id ? "Account updated" : "Account created" });
  } catch (e) {
    await conn.rollback();
    if (e.code === "ER_DUP_ENTRY")
      e = Object.assign(new Error("Login already exists"), { status: 409 });
    throw e;
  } finally {
    conn.release();
  }
}
async function logs(req, res) {
  const [rows] = await db.execute(
    "SELECT l.id,l.account_id,l.role,l.event,l.ip_address,l.user_agent,l.created_at FROM access_logs l ORDER BY l.created_at DESC LIMIT 500",
  );
  res.json({ items: rows });
}
async function hubs(req, res) {
  const [rows] = await db.execute(
    "SELECT id,name,active,qr_token FROM hubs ORDER BY name",
  );
  res.json({ items: rows });
}
async function departments(req, res) {
  const [rows] = await db.execute(
    "SELECT d.id,d.name,d.active,d.qr_token,d.hub_id,h.name hub_name FROM departments d JOIN hubs h ON h.id=d.hub_id ORDER BY h.name,d.name",
  );
  res.json({ items: rows });
}
async function createHub(req, res) {
  const { name } = req.body;
  const crypto = require("crypto");
  const [r] = await db.execute("INSERT INTO hubs(name,qr_token) VALUES(?,?)", [
    name,
    crypto.randomBytes(32).toString("hex"),
  ]);
  res.status(201).json({ id: r.insertId });
}
async function createDepartment(req, res) {
  const { name, hubId } = req.body;
  const crypto = require("crypto");
  const [r] = await db.execute(
    "INSERT INTO departments(name,hub_id,qr_token) VALUES(?,?,?)",
    [name, hubId, crypto.randomBytes(32).toString("hex")],
  );
  res.status(201).json({ id: r.insertId });
}
module.exports = {
  accounts,
  saveAccount,
  logs,
  hubs,
  departments,
  createHub,
  createDepartment,
};
