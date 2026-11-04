const db = require("../config/db");
async function logAccess({
  accountId = null,
  role = null,
  loginBidx = null,
  event,
  req,
}) {
  await db.execute(
    "INSERT INTO access_logs(account_id,role,login_bidx,event,ip_address,user_agent) VALUES(?,?,?,?,?,?)",
    [
      accountId,
      role,
      loginBidx,
      event,
      req.ip,
      String(req.get("user-agent") || "").slice(0, 500),
    ],
  );
}
module.exports = { logAccess };
