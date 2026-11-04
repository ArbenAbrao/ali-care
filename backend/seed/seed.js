const db = require("../src/config/db");
const env = require("../src/config/env");
const { encrypt, blindIndex } = require("../src/utils/crypto");
const argon2 = require("argon2");
const crypto = require("crypto");
(async () => {
  try {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const hubs = [
        ["Marilao Hub", "Operations", "Warehouse"],
        ["Taguig Hub", "Administration", "Transport"],
        ["Cebu Hub", "Operations", "Customer Support"],
      ];
      for (const [hn, ...deps] of hubs) {
        const [old] = await conn.execute("SELECT id FROM hubs WHERE name=?", [
          hn,
        ]);
        let hid;
        if (old.length) hid = old[0].id;
        else {
          const [r] = await conn.execute(
            "INSERT INTO hubs(name,qr_token) VALUES(?,?)",
            [hn, crypto.randomBytes(32).toString("hex")],
          );
          hid = r.insertId;
        }
        for (const dn of deps) {
          const [d] = await conn.execute(
            "SELECT id FROM departments WHERE hub_id=? AND name=?",
            [hid, dn],
          );
          if (!d.length)
            await conn.execute(
              "INSERT INTO departments(name,hub_id,qr_token) VALUES(?,?,?)",
              [dn, hid, crypto.randomBytes(32).toString("hex")],
            );
        }
      }
      const sample = [
        ["100001", "Santos, Maria", "Marilao Hub", "Operations"],
        ["100002", "Dela Cruz, Juan", "Marilao Hub", "Warehouse"],
        ["100003", "Reyes, Ana", "Taguig Hub", "Administration"],
        ["100004", "Garcia, Miguel", "Taguig Hub", "Transport"],
        ["100005", "Lim, Sofia", "Cebu Hub", "Customer Support"],
      ];
      for (const [eid, name, hn, dn] of sample) {
        const [h] = await conn.execute("SELECT id FROM hubs WHERE name=?", [
          hn,
        ]);
        const [d] = await conn.execute(
          "SELECT id FROM departments WHERE hub_id=? AND name=?",
          [h[0].id, dn],
        );
        const b = blindIndex(eid),
          c = encrypt(eid);
        const [ex] = await conn.execute(
          "SELECT id FROM employees WHERE employee_id_bidx=?",
          [b],
        );
        if (!ex.length)
          await conn.execute(
            "INSERT INTO employees(employee_id_ciphertext,employee_id_iv,employee_id_tag,employee_id_bidx,full_name,status,hub_id,department_id) VALUES(?,?,?,?,?,?,?,?)",
            [c.ciphertext, c.iv, c.tag, b, name, "Active", h[0].id, d[0].id],
          );
      }
      if (env.SEED_SUPERADMIN_EMAIL && env.SEED_SUPERADMIN_PASSWORD) {
        const b = blindIndex(env.SEED_SUPERADMIN_EMAIL);
        const [ex] = await conn.execute(
          "SELECT id FROM accounts WHERE login_bidx=?",
          [b],
        );
        if (!ex.length) {
          const [count] = await conn.execute(
            "SELECT COUNT(*) n FROM accounts WHERE role='Superadmin'",
          );
          if (Number(count[0].n) < 2) {
            const c = encrypt(env.SEED_SUPERADMIN_EMAIL),
              hash = await argon2.hash(env.SEED_SUPERADMIN_PASSWORD, {
                type: argon2.argon2id,
              });
            await conn.execute(
              "INSERT INTO accounts(role,login_ciphertext,login_iv,login_tag,login_bidx,password_hash) VALUES(?,?,?,?,?,?)",
              ["Superadmin", c.ciphertext, c.iv, c.tag, b, hash],
            );
          }
        }
      }
      await conn.commit();
      console.log(
        "Seed completed. Sample hubs, departments and employees are available.",
      );
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("Seed failed:", e.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
