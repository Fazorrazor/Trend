import { Router, Request, Response } from 'express';
import { pool, query } from '../db/index.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, full_name, display_name } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM user_profiles WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Create user
        const result = await query(
            `INSERT INTO user_profiles (
        email, password_hash, full_name, display_name
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, display_name, created_at`,
            [email, password_hash, full_name || null, display_name || email.split('@')[0]]
        );

        const user = result.rows[0];

        // Generate token
        const token = generateToken({ userId: user.id, email: user.email });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user
        const result = await query(
            `SELECT id, email, password_hash, full_name, display_name
       FROM user_profiles WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update login count and last login
        await query(
            `UPDATE user_profiles 
       SET login_count = login_count + 1, last_login_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
            [user.id]
        );

        // Generate token
        const token = generateToken({ userId: user.id, email: user.email });

        // Remove password hash from response
        delete user.password_hash;

        res.json({
            message: 'Login successful',
            token,
            user,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        // This would use the authenticate middleware
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // For now, return a simple response
        // This will be enhanced with the authenticate middleware
        res.json({ message: 'User profile endpoint' });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
