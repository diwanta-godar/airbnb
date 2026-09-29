import { Response } from "express";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import { UserRole } from "../entities/enums";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import {
  comparePassword,
  hashPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  sanitizeUser,
} from "../utils/security";
import { RegisterInput, LoginInput } from "../validators/schemas";

const userRepo = () => AppDataSource.getRepository(User);
const tokenRepo = () => AppDataSource.getRepository(RefreshToken);

async function issueTokens(user: User, req: AuthenticatedRequest, res: Response) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user.id });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await tokenRepo().save(
    tokenRepo().create({
      tokenHash: hashToken(refreshToken),
      expiresAt,
      userId: user.id,
      ipAddress: req.ip?.slice(0, 45) ?? null,
      userAgent: req.get("user-agent")?.slice(0, 255) ?? null,
    })
  );

  setAuthCookies(res, accessToken, refreshToken);

  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req, res) => {
  const body = req.body as RegisterInput;
  const existing = await userRepo().findOne({ where: { email: body.email } });
  if (existing) {
    throw new AppError("Email is already registered", 409);
  }

  const user = userRepo().create({
    email: body.email,
    passwordHash: await hashPassword(body.password),
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone ?? null,
    role: UserRole.USER,
  });

  await userRepo().save(user);
  const tokens = await issueTokens(user, req as AuthenticatedRequest, res);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user: sanitizeUser(user), ...tokens },
  });
});

export const login = asyncHandler(async (req, res) => {
  const body = req.body as LoginInput;
  const user = await userRepo()
    .createQueryBuilder("user")
    .addSelect("user.passwordHash")
    .where("user.email = :email", { email: body.email })
    .getOne();

  if (!user || !(await comparePassword(body.password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  const tokens = await issueTokens(user, req as AuthenticatedRequest, res);

  res.json({
    success: true,
    message: "Logged in successfully",
    data: { user: sanitizeUser(user), ...tokens },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const raw =
    (req.body?.refreshToken as string | undefined) ||
    (req.cookies?.refreshToken as string | undefined);

  if (!raw) {
    throw new AppError("Refresh token required", 401);
  }

  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(raw);
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }

  const stored = await tokenRepo().findOne({
    where: { tokenHash: hashToken(raw), userId: payload.sub, revoked: false },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError("Refresh token expired or revoked", 401);
  }

  // Rotate: revoke current, issue new pair
  stored.revoked = true;
  await tokenRepo().save(stored);

  const user = await userRepo().findOne({ where: { id: payload.sub, isActive: true } });
  if (!user) {
    throw new AppError("User not found", 401);
  }

  const tokens = await issueTokens(user, req as AuthenticatedRequest, res);

  res.json({
    success: true,
    data: { user: sanitizeUser(user), ...tokens },
  });
});

export const logout = asyncHandler(async (req, res) => {
  const raw =
    (req.cookies?.refreshToken as string | undefined) ||
    (req.body?.refreshToken as string | undefined);

  if (raw) {
    await tokenRepo().update({ tokenHash: hashToken(raw) }, { revoked: true });
  }

  clearAuthCookies(res);
  res.json({ success: true, message: "Logged out successfully" });
});

export const me = asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const user = await userRepo().findOne({ where: { id: authReq.user!.sub } });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.json({ success: true, data: sanitizeUser(user) });
});
