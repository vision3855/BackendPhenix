import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError, TokenReuseError } from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export async function register({ name, email, password, role }) {
  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('Email is already registered');

  const count = await User.countDocuments();
  const passwordHash = await User.hashPassword(password);

  // First user is always an Admin; roles are only settable by Admins afterwards.
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: count === 0 ? 'Admin' : (role ?? 'Cashier'),
  });

  return { user: publicUser(user) };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  return issueTokenPair(user);
}

async function issueTokenPair(user, familyId = crypto.randomUUID()) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti: crypto.randomUUID() });

  const decoded = verifyRefreshToken(refreshToken); // to obtain exp reliably
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(refreshToken),
    familyId,
    expiresAt: new Date(decoded.exp * 1000),
  });

  return {
    user: publicUser(user),
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: new Date(decoded.exp * 1000),
  };
}

/**
 * Refresh-token rotation with reuse detection.
 * A presented (non-revoked) token is revoked and replaced by a new one in
 * the same family. If a *revoked* token is presented again, the whole
 * family is revoked — classic reuse attack mitigation.
 */
export async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = sha256(refreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) throw ApiError.unauthorized('Unknown refresh token');

  if (stored.revokedAt) {
    // Reuse of a rotated token -> compromise; kill the entire family.
    await RefreshToken.updateMany(
      { familyId: stored.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    throw new TokenReuseError();
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('User no longer active');

  const next = await issueTokenPair(user, stored.familyId);

  stored.revokedAt = new Date();
  stored.replacedByHash = sha256(next.refreshToken);
  await stored.save();

  return next;
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  await RefreshToken.updateOne(
    { tokenHash: sha256(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function logoutAll(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
