const env = require("./config/env");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const cookieParser = require("cookie-parser");
const db = require("./config/db");
const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employee");
const complaintRoutes = require("./routes/complaints");
const adminRoutes = require("./routes/admin");
const errors = require("./middleware/errors");
const { csrfProtection } = require("./middleware/csrf");
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: (env.FRONTEND_ORIGINS || "http://localhost:5173")
      .split(",")
      .map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
const store = new MySQLStore(
  { createDatabaseTable: true, schema: { tableName: "sessions" } },
  db,
);
app.use(
  session({
    name: "ali.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Number(env.SESSION_IDLE_MINUTES || 30) * 60000,
    },
  }),
);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/complaints", csrfProtection, complaintRoutes);
app.use("/api/admin", csrfProtection, adminRoutes);
app.use(errors);
app.use((req, res) => res.status(404).json({ error: "Not found" }));
const server = app.listen(Number(env.PORT || 5000), () =>
  console.log(`ALI-CARE API listening on ${env.PORT || 5000}`),
);
process.on("SIGTERM", () =>
  server.close(() => {
    db.end();
    process.exit(0);
  }),
);
