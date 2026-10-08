import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

const REFRESH_COOKIE = 'rt';

function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd || env.COOKIE_SECURE, // Secure in production
    sameSite: 'strict',
    expires: expiresAt,
    path: '/api/auth', // narrow scope: only refresh/logout endpoints can read it
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict', path: '/api/auth' });
}

export const register = asyncHandler(async (req, res) => {
  const { user } = await authService.register(req.body);
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
    await authService.login(req.body);

  setRefreshCookie(res, refreshToken, refreshTokenExpiresAt);
  res.json({ success: true, data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

  const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
    await authService.refresh(token);

  setRefreshCookie(res, refreshToken, refreshTokenExpiresAt);
  res.json({ success: true, data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out of all sessions' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
