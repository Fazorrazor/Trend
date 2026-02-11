import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
    userId: string;
    email: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN as any });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}
