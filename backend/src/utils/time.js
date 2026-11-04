function manilaDateRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    start: `${o.year}-${o.month}-${o.day} 00:00:00`,
    end: `${o.year}-${o.month}-${o.day} 23:59:59`,
  };
}
module.exports = { manilaDateRange };
