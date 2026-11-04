
const db = require('../config/db');
const argon2 = require('argon2');
const crypto = require('crypto');
const axios = require('axios');

const {
  blindIndex,
  hashOtp,
  decrypt
} = require('../utils/crypto');

const { sendOtp } = require('../services/mailer');
const { logAccess } = require('../services/accessLog');
const env = require('../config/env');

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function safeHashCompare(actual, expected) {
  if (
    typeof actual !== 'string' ||
    typeof expected !== 'string' ||
    actual.length !== 64 ||
    expected.length !== 64
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(actual, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

async function adminLogin(req, res) {
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');
  const bidx = blindIndex(login);

  const [rows] = await db.execute(
    `SELECT *
     FROM accounts
     WHERE login_bidx = ?
       AND role = 'Admin'
       AND active = 1
     LIMIT 1`,
    [bidx]
  );

  if (
    !rows.length ||
    !(await argon2.verify(rows[0].password_hash, password))
  ) {
    await logAccess({
      loginBidx: bidx,
      event: 'login_failure',
      req
    });

    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  const account = rows[0];

  await regenerateSession(req);

  req.session.account = {
    id: account.id,
    role: account.role
  };

  req.session.createdAt = Date.now();
  req.session.lastActivity = Date.now();

  await saveSession(req);

  await logAccess({
    accountId: account.id,
    role: account.role,
    loginBidx: bidx,
    event: 'login_success',
    req
  });

  return res.json({
    account: {
      id: account.id,
      role: account.role
    }
  });
}

async function requestOtp(req, res) {
  const email = String(req.body.email || '').trim();
  const captchaToken = String(req.body.captchaToken || '');
  const bidx = blindIndex(email);

  const [rows] = await db.execute(
    `SELECT *
     FROM accounts
     WHERE login_bidx = ?
       AND role = 'Superadmin'
       AND active = 1
     LIMIT 1`,
    [bidx]
  );

  if (!rows.length) {
    await logAccess({
      loginBidx: bidx,
      event: 'login_failure',
      req
    });

    return res.status(401).json({
      error: 'Unable to start sign-in'
    });
  }

  const account = rows[0];

  if (!env.TURNSTILE_SECRET_KEY || !captchaToken) {
    return res.status(400).json({
      error: 'CAPTCHA verification is required'
    });
  }

  try {
    const form = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: captchaToken,
      remoteip: req.ip
    });

    const verification = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      form.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    if (!verification.data.success) {
      throw new Error('Turnstile verification failed');
    }
  } catch (error) {
    await logAccess({
      accountId: account.id,
      role: 'Superadmin',
      loginBidx: bidx,
      event: 'login_failure',
      req
    });

    return res.status(400).json({
      error: 'CAPTCHA verification failed'
    });
  }

  const destination = decrypt(account, 'login_');

  const otp = String(
    crypto.randomInt(0, 1000000)
  ).padStart(6, '0');

  const otpHash = hashOtp(otp);
  const minutes = Math.max(
    1,
    Math.min(15, Number(env.SUPERADMIN_OTP_MINUTES || 5))
  );

  await db.execute(
    `UPDATE superadmin_otps
     SET consumed_at = NOW()
     WHERE account_id = ?
       AND consumed_at IS NULL`,
    [account.id]
  );

  const [insert] = await db.execute(
    `INSERT INTO superadmin_otps
       (account_id, otp_hash, expires_at)
     VALUES
       (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [account.id, otpHash, minutes]
  );

  try {
    await sendOtp(destination, otp);
  } catch (error) {
    await db.execute(
      `UPDATE superadmin_otps
       SET consumed_at = NOW()
       WHERE id = ? AND consumed_at IS NULL`,
      [insert.insertId]
    );

    console.error('OTP email delivery failed:', error.message);

    return res.status(503).json({
      error: 'Unable to send verification email. Check SMTP configuration.'
    });
  }

  // Create a fresh session containing only the pending login.
  await regenerateSession(req);

  req.session.pendingSuperadminId = account.id;
  req.session.pendingOtpId = insert.insertId;
  req.session.pendingCreatedAt = Date.now();

  await saveSession(req);

  return res.json({
    message: 'Verification code sent.',
    expiresInMinutes: minutes
  });
}

async function verifyOtp(req, res) {
  const accountId = req.session?.pendingSuperadminId;
  const otpId = req.session?.pendingOtpId;
  const otp = String(req.body.otp || '');

  if (
    !accountId ||
    !otpId ||
    !/^\d{6}$/.test(otp)
  ) {
    return res.status(400).json({
      error: 'Invalid or expired verification code'
    });
  }

  const [rows] = await db.execute(
    `SELECT *
     FROM superadmin_otps
     WHERE id = ?
       AND account_id = ?
       AND consumed_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [otpId, accountId]
  );

  if (
    !rows.length ||
    rows[0].attempts >= 5 ||
    !safeHashCompare(rows[0].otp_hash, hashOtp(otp))
  ) {
    if (rows.length) {
  await db.execute(
    `UPDATE superadmin_otps
     SET consumed_at = CASE
       WHEN attempts >= 4 THEN NOW()
       ELSE consumed_at
     END,
     attempts = attempts + 1
     WHERE id = ?
       AND consumed_at IS NULL`,
    [otpId]
  );
}

    await logAccess({
      accountId,
      role: 'Superadmin',
      event: 'otp_failure',
      req
    });

    return res.status(401).json({
      error: 'Invalid or expired verification code'
    });
  }

  const [consumed] = await db.execute(
    `UPDATE superadmin_otps
     SET consumed_at = NOW()
     WHERE id = ?
       AND account_id = ?
       AND consumed_at IS NULL
       AND expires_at > NOW()
       AND attempts < 5`,
    [otpId, accountId]
  );

  if (consumed.affectedRows !== 1) {
    return res.status(401).json({
      error: 'Invalid or expired verification code'
    });
  }

  const [accounts] = await db.execute(
    `SELECT id, role
     FROM accounts
     WHERE id = ?
       AND role = 'Superadmin'
       AND active = 1
     LIMIT 1`,
    [accountId]
  );

  if (!accounts.length) {
    return res.status(401).json({
      error: 'Superadmin account unavailable'
    });
  }

  await regenerateSession(req);

  req.session.account = {
    id: accounts[0].id,
    role: accounts[0].role
  };

  req.session.createdAt = Date.now();
  req.session.lastActivity = Date.now();

  await saveSession(req);

  await logAccess({
    accountId,
    role: 'Superadmin',
    event: 'login_success',
    req
  });

  return res.json({
    account: {
      id: accounts[0].id,
      role: 'Superadmin'
    }
  });
}

async function logout(req, res) {
  if (req.session?.account) {
    await logAccess({
      accountId: req.session.account.id,
      role: req.session.account.role,
      event: 'logout',
      req
    });
  }

  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({
        error: 'Unable to end session'
      });
    }

    res.clearCookie('ali.sid', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.status(204).end();
  });
}

async function me(req, res) {
  return res.json({
    account: req.session?.account || null
  });
}

module.exports = {
  adminLogin,
  requestOtp,
  verifyOtp,
  logout,
  me
};
