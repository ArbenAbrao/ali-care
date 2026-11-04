const db = require("../config/db");
// The current account is excluded if any reported employee is linked to it.
const visibilitySql = `NOT EXISTS (SELECT 1 FROM complaint_reported_employees cre JOIN accounts blocked ON blocked.employee_id=cre.employee_id WHERE cre.complaint_id=c.id AND blocked.id=?)`;
async function visibleComplaint(accountId, complaintId) {
  const [r] = await db.execute(
    `SELECT c.id FROM complaints c WHERE c.id=? AND ${visibilitySql}`,
    [complaintId, accountId],
  );
  return r.length > 0;
}
module.exports = { visibilitySql, visibleComplaint };
