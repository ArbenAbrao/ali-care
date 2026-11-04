const service = require("../services/complaints");
const db = require("../config/db");
const { asyncHandler } = require("../utils/http");
const list = asyncHandler(async (req, res) =>
  res.json(await service.listComplaints(req.session.account.id, req.query)),
);
const detail = asyncHandler(async (req, res) =>
  res.json(
    await service.complaintDetail(req.session.account.id, req.params.id),
  ),
);
const dashboard = asyncHandler(async (req, res) =>
  res.json(await service.dashboard(req.session.account.id)),
);
const report = asyncHandler(async (req, res) => {
  const rows = await service.report(req.session.account.id, req.query);
  if (req.query.format === "pdf") {
    const PDFDocument = require("pdfkit");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ali-care-report.pdf",
    );
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    doc.fontSize(18).text("ALI-CARE Complaint Report");
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor("#475569")
      .text(
        `Generated: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })} | Records: ${rows.length}`,
      );
    doc.moveDown();
    rows.forEach((x, i) => {
      if (doc.y > 720) doc.addPage();
      doc
        .fillColor("#0f766e")
        .fontSize(12)
        .text(`Concern #${x.id} — ${x.severity}`);
      doc
        .fillColor("#111827")
        .fontSize(9)
        .text(
          `Reported employee(s): ${x.reportedEmployees.map((p) => p.full_name).join(", ")}`,
        );
      doc.text(`Hub / Department: ${x.hub || ""} / ${x.department || ""}`);
      doc.text(`Date: ${x.createdAt}`);
      doc.text(`Subject: ${x.subject || "(none)"}`);
      doc.text(`Message: ${x.message}`, { width: 510 });
      doc.moveDown();
      doc.strokeColor("#cbd5e1").moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
    });
    doc.end();
    return;
  }
  res.json({ items: rows });
});
async function create(req, res) {
  const {
    employeeId,
    hubId,
    departmentId,
    severity,
    subject,
    message,
    reportedEmployeeIds,
  } = req.body;
  const result = await service.createComplaint({
    employeeId,
    hubId,
    departmentId,
    severity,
    subject,
    message,
    reportedEmployeeIds,
    accountId: req.session.account.id,
  });
  res.status(201).json({ complaintId: result.id });
}
async function hubs(req, res) {
  const [h] = await db.execute(
    "SELECT id,name FROM hubs WHERE active=1 ORDER BY name",
  );
  const [d] = await db.execute(
    "SELECT id,hub_id,name FROM departments WHERE active=1 ORDER BY name",
  );
  const [e] = await db.execute(
    "SELECT id,full_name,hub_id,department_id FROM employees WHERE status='Active' ORDER BY full_name",
  );
  res.json({ hubs: h, departments: d, employees: e });
}
module.exports = { list, detail, dashboard, report, create, hubs };
