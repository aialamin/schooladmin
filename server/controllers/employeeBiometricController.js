'use strict';
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} = require('@simplewebauthn/server');
const Employee = require('../models/Employee');
const { isAdmin, isFinance } = require('../utils/access');

const RP_ID   = process.env.WEBAUTHN_RP_ID  || 'localhost';
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'School Manager';

function expectedOrigins() {
  const origin = process.env.WEBAUTHN_ORIGIN;
  if (origin) return [origin];
  return [
    'http://localhost',
    ...Array.from({ length: 20 }, (_, i) => `http://localhost:${5001 + i}`),
  ];
}

// ── GET /api/employees/:id/biometric/register-options ─────────────────────────
async function getRegisterOptions(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) {
      return res.status(403).json({ message: 'Only admin or accounts users can register employee biometrics.' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const existingCredentials = (employee.biometricCredentials || []).map((c) => ({
      id:         Buffer.from(c.credentialID, 'base64url'),
      type:       'public-key',
      transports: c.transports || [],
    }));

    const options = await generateRegistrationOptions({
      rpName:                 RP_NAME,
      rpID:                   RP_ID,
      userID:                 Buffer.from(employee._id.toString()),
      userName:               employee.contactInfo?.email || employee.name,
      userDisplayName:        employee.name,
      timeout:                60000,
      attestationType:        'none',
      excludeCredentials:     existingCredentials,
      authenticatorSelection: {
        residentKey:      'preferred',
        userVerification: 'preferred',
      },
    });

    employee.biometricChallenge = options.challenge;
    await employee.save();

    return res.json(options);
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/employees/:id/biometric/register ────────────────────────────────
async function verifyRegister(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) {
      return res.status(403).json({ message: 'Only admin or accounts users can register employee biometrics.' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const { credential, deviceName } = req.body;

    if (!employee.biometricChallenge) {
      return res.status(400).json({ message: 'No pending challenge. Request register-options first.' });
    }

    const verification = await verifyRegistrationResponse({
      response:                credential,
      expectedChallenge:       employee.biometricChallenge,
      expectedOrigin:          expectedOrigins(),
      expectedRPID:            RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Biometric registration failed.' });
    }

    const { credential: regCred } = verification.registrationInfo;

    employee.biometricCredentials.push({
      credentialID:        Buffer.from(regCred.id).toString('base64url'),
      credentialPublicKey: Buffer.from(regCred.publicKey).toString('base64'),
      counter:             regCred.counter,
      transports:          credential.response?.transports || [],
      deviceName:          String(deviceName || 'Device').slice(0, 50),
    });
    employee.biometricChallenge = null;
    await employee.save();

    return res.json({ message: 'Biometric registered successfully.' });
  } catch (err) {
    return next(err);
  }
}

// ── DELETE /api/employees/:id/biometric/:credentialId ─────────────────────────
async function removeCredential(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) {
      return res.status(403).json({ message: 'Only admin or accounts users can remove employee biometrics.' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const before = employee.biometricCredentials.length;
    employee.biometricCredentials = employee.biometricCredentials.filter(
      (c) => c.credentialID !== req.params.credentialId,
    );
    if (employee.biometricCredentials.length === before) {
      return res.status(404).json({ message: 'Credential not found.' });
    }
    await employee.save();
    return res.json({ message: 'Biometric credential removed.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getRegisterOptions, removeCredential, verifyRegister };
