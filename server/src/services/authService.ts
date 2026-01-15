import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel, UserDocument } from '../models/User.js';
import { PlayerModel } from '../models/Player.js';
import { config } from '../config/index.js';

const SALT_ROUNDS = 12;

export interface TokenPayload {
  userId: string;
  playerId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RegisterInput {
  email: string;
  password: string;
  username: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function register(
  input: RegisterInput
): Promise<{ user: UserDocument; tokens: AuthTokens }> {
  const { email, password, username } = input;

  const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AuthError('Email already registered', 'EMAIL_EXISTS', 409);
  }

  const existingPlayer = await PlayerModel.findOne({ username });
  if (existingPlayer) {
    throw new AuthError('Username already taken', 'USERNAME_EXISTS', 409);
  }

  const player = new PlayerModel({ username });
  await player.save();

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = new UserModel({
    email: email.toLowerCase(),
    passwordHash,
    playerId: player._id,
  });

  const tokens = generateTokens({
    userId: user._id.toString(),
    playerId: player._id.toString(),
    email: user.email,
  });

  user.refreshTokens = [tokens.refreshToken];
  await user.save();

  return { user, tokens };
}

export async function login(
  input: LoginInput
): Promise<{ user: UserDocument; tokens: AuthTokens }> {
  const { email, password } = input;

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  if (!user.isActive) {
    throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED', 403);
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  const tokens = generateTokens({
    userId: user._id.toString(),
    playerId: user.playerId.toString(),
    email: user.email,
  });

  user.refreshTokens = [...user.refreshTokens.slice(-4), tokens.refreshToken];
  user.lastLogin = new Date();
  await user.save();

  return { user, tokens };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const payload = jwt.verify(
      refreshToken,
      config.jwt.refreshSecret
    ) as TokenPayload;

    const user = await UserModel.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      throw new AuthError('Invalid refresh token', 'INVALID_TOKEN', 401);
    }

    const tokens = generateTokens({
      userId: user._id.toString(),
      playerId: user.playerId.toString(),
      email: user.email,
    });

    user.refreshTokens = user.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(tokens.refreshToken);
    await user.save();

    return tokens;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Invalid refresh token', 'INVALID_TOKEN', 401);
  }
}

export async function logout(
  userId: string,
  refreshToken?: string
): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) return;

  if (refreshToken) {
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
  } else {
    user.refreshTokens = [];
  }
  await user.save();
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  } catch {
    throw new AuthError('Invalid access token', 'INVALID_TOKEN', 401);
  }
}

function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as unknown as number,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as unknown as number,
  });

  return { accessToken, refreshToken };
}
