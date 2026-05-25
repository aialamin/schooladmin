'use strict';
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const User        = require('../models/User');
const { createSession } = require('../utils/session');
const { publicUser }    = require('../utils/users');

// rpID must match the hostname the app runs on.
// Electron loads from http://localhost so rpID = 'localhost'.
const RP_ID     = process.env.WEBAUTHN_RP_ID   || 'localhost';
const RP_NAME   = process.env.WEBAUTHN_RP_NAME  || 'School Manager';
const ORIGIN    = process.env.WEBAUTHN_ORIGIN   || `http://localhost`;

// ── Helper: expected origins (allow any localhost port for Electron) ──────────
function expectedOrigins(origin) {
  if (origin) return [origin];
  // Electron may load on any port (5001, 5002, …) — accept all localhost origins
  return [
    'http://localhost',
    ...Array.from({ length: 20 }, (_, i) => `http://localhost:${5001 + i}`),
  ];
}

// ── GET /api/auth/webauthn/register-options ───────────────────────────────────
async function registerOptions(req, res, next) {
  try {
    const user = req.user;

    const existingCredentials = (user.webauthnCredentials || []).map((c) => ({
      id:         Buffer.from(c.credentialID, 'base64url'),
      type:       'public-key',
      transports: c.transports || [],
    }));

    const options = await generateRegistrationOptions({
      rpName:                  RP_NAME,
      rpID:                    RP_ID,
      userID:                  Buffer.from(user.id),
      userName:                user.email,
      userDisplayName:         user.name,
      timeout:                 60000,
      attestationType:         'none',
      excludeCredentials:      existingCredentials,
      authenticatorSelection:  {
        residentKey:      'preferred',
        userVerification: 'required',   // requires biometric / PIN
      },
    });

    // Persist challenge for verification step
    user.webauthnChallenge = options.challenge;
    await user.save();

    return res.json(options);
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/auth/webauthn/register ─────────────────────────────────────────
async function registerVerify(req, res, next) {
  try {
    const user       = req.user;
    const { credential, deviceName } = req.body;

    if (!user.webauthnChallenge) {
      return res.status(400).json({ message: 'No pending challenge. Request options first.' });
    }

    const verification = await verifyRegistrationResponse({
      response:          credential,
      expectedChallenge: user.webauthnChallenge,
      expectedOrigin:    expectedOrigins(process.env.WEBAUTHN_ORIGIN),
      expectedRPID:      RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Biometric registration failed.' });
    }

    const { credential: regCred } = verification.registrationInfo;

    user.webauthnCredentials.push({
      credentialID:        Buffer.from(regCred.id).toString('base64url'),
      credentialPublicKey: Buffer.from(regCred.publicKey).toString('base64'),
      counter:             regCred.counter,
      transports:          credential.response?.transports || [],
      deviceName:          String(deviceName || 'Device').slice(0, 50),
    });
    user.webauthnChallenge = null;
    await user.save();

    return res.json({ message: 'Biometric registered successfully.' });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/auth/webauthn/login-options ──────────────────────────────────────
async function loginOptions(req, res, next) {
  try {
    const options = await generateAuthenticationOptions({
      rpID:             RP_ID,
      timeout:          60000,
      userVerification: 'required',
      // Empty allowCredentials = browser shows all registered credentials
    });

    // Store challenge in a short-lived in-memory map keyed by challenge string
    challengeStore.set(options.challenge, { ts: Date.now() });
    cleanChallengeStore();

    return res.json(options);
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/auth/webauthn/login ─────────────────────────────────────────────
async function loginVerify(req, res, next) {
  try {
    const { assertion } = req.body;
    if (!assertion?.id) {
      return res.status(400).json({ message: 'Invalid assertion.' });
    }

    // Find user by credential ID
    const user = await User.findOne({
      'webauthnCredentials.credentialID': assertion.id,
    });
    if (!user) {
      return res.status(401).json({ message: 'Biometric not recognised. Please use your password.' });
    }

    const cred = user.webauthnCredentials.find((c) => c.credentialID === assertion.id);
    if (!cred) {
      return res.status(401).json({ message: 'Credential not found.' });
    }

    // Retrieve and consume the challenge
    const clientData  = JSON.parse(Buffer.from(assertion.response.clientDataJSON, 'base64').toString());
    const challenge   = clientData.challenge;
    if (!challengeStore.has(challenge)) {
      return res.status(400).json({ message: 'Challenge expired or invalid. Please try again.' });
    }
    challengeStore.delete(challenge);

    const verification = await verifyAuthenticationResponse({
      response:          assertion,
      expectedChallenge: challenge,
      expectedOrigin:    expectedOrigins(process.env.WEBAUTHN_ORIGIN),
      expectedRPID:      RP_ID,
      requireUserVerification: true,
      credential: {
        id:         Buffer.from(cred.credentialID, 'base64url'),
        publicKey:  Buffer.from(cred.credentialPublicKey, 'base64'),
        counter:    cred.counter,
        transports: cred.transports || [],
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ message: 'Biometric verification failed.' });
    }

    // Update counter to prevent replay attacks
    cred.counter = verification.authenticationInfo.newCounter;
    await user.save();

    return res.json({
      token: createSession(user),
      user:  publicUser(user),
    });
  } catch (err) {
    return next(err);
  }
}

// ── DELETE /api/auth/webauthn/credential/:credentialID ────────────────────────
async function removeCredential(req, res, next) {
  try {
    const user = req.user;
    const { credentialID } = req.params;

    const before = user.webauthnCredentials.length;
    user.webauthnCredentials = user.webauthnCredentials.filter(
      (c) => c.credentialID !== credentialID,
    );
    if (user.webauthnCredentials.length === before) {
      return res.status(404).json({ message: 'Credential not found.' });
    }
    await user.save();
    return res.json({ message: 'Biometric credential removed.' });
  } catch (err) {
    return next(err);
  }
}

// ── Challenge store (in-memory, TTL 5 minutes) ────────────────────────────────
const challengeStore = new Map();
function cleanChallengeStore() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [k, v] of challengeStore) {
    if (v.ts < cutoff) challengeStore.delete(k);
  }
}

module.exports = {
  registerOptions,
  registerVerify,
  loginOptions,
  loginVerify,
  removeCredential,
};
