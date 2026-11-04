# ALI-CARE test checklist

- [ ] Submit two complaints using one Employee ID on a Manila calendar date; third submission returns HTTP 429.
- [ ] Verify remaining count resets at midnight Asia/Manila, not 24 hours after the first submission (use a test clock or seed timestamps around midnight).
- [ ] Report an employee linked to an admin; that admin gets 404 on direct complaint lookup and the complaint is absent from list, dashboard aggregates, search, reports, and exports.
- [ ] Import a CSV with a new Employee ID, an existing Employee ID, a duplicate Employee ID in the same file, and invalid branch/department; verify inserted/updated/skipped/invalid counts.
- [ ] Create a second superadmin; creating a third returns HTTP 409, including under concurrent requests.
- [ ] Superadmin login rejects missing/invalid CAPTCHA, wrong/expired OTP, and reuse of a successful OTP; valid OTP works once.
- [ ] Verify session cookie flags, CSRF rejection, CORS allowlist, login rate limiting, and logout invalidation.
- [ ] Verify no logs contain decrypted complaint text, employee identifiers, passwords, or OTPs.
