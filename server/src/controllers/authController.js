import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { unauthorized, conflict } from '../utils/ApiError.js';
import { toSafeUser } from '../utils/serialize.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function createToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * POST /api/auth/register — validated in the route; here we check the
 * duplicate email (409), create the user (bcrypt via model pre-save) and
 * return the same shape as login: { user, token }.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, department, skills = [], interests = [], bio = '' } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw conflict('An account with this email already exists. Try logging in instead.');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    department,
    skills,
    interests,
    bio,
  });

  res.status(201).json({
    data: { user: toSafeUser(user), token: createToken(user) },
  });
});

/**
 * POST /api/auth/login — one generic failure message whether the email
 * exists or the password is wrong (avoids account enumeration, guide §10).
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  const passwordOk = user ? await user.comparePassword(password) : false;

  if (!user || !passwordOk) {
    // Server-side detail, not shown to the client:
    if (!user) console.info(`[auth] login attempt with unknown email: ${normalizedEmail}`);
    throw unauthorized('Invalid email or password.');
  }

  res.json({
    data: { user: toSafeUser(user), token: createToken(user) },
  });
});

/** GET /api/auth/me — the fresh profile of the token owner. */
export const getMe = asyncHandler(async (req, res) => {
  res.json({ data: { user: toSafeUser(req.user) } });
});
