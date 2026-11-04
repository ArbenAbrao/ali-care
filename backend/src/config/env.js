require("dotenv").config();
const required = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "AES_KEY_HEX",
  "HMAC_KEY_HEX",
  "SESSION_SECRET",
];
for (const k of required)
  if (!process.env[k]) throw new Error(`Missing environment variable: ${k}`);
for (const k of ["AES_KEY_HEX", "HMAC_KEY_HEX"])
  if (!/^[a-f0-9]{64}$/i.test(process.env[k]))
    throw new Error(`${k} must be 64 hexadecimal characters`);
if (
  process.env.AES_KEY_HEX.toLowerCase() ===
  process.env.HMAC_KEY_HEX.toLowerCase()
)
  throw new Error("AES_KEY_HEX and HMAC_KEY_HEX must be different keys");
module.exports = process.env;
