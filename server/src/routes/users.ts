import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/users
 * List all users (admin debug)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        // limit sensitive info
        const result = await query(`
            SELECT id, email, full_name, display_name, role, created_at, last_login_at 
            FROM user_profiles 
            ORDER BY created_at DESC
        `);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        const result = await query(`
      SELECT 
        id, email, full_name, display_name, job_title, department,
        phone_number, avatar_url, theme, language, timezone, date_format,
        email_notifications, import_notifications, weekly_digest,
        default_view, items_per_page, show_tutorial, bio, notes,
        created_at, updated_at, last_login_at, login_count
      FROM user_profiles WHERE id = $1
    `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const updates = req.body;

        // Build dynamic update query
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        const allowedFields = [
            'full_name', 'display_name', 'job_title', 'department', 'phone_number',
            'avatar_url', 'theme', 'language', 'timezone', 'date_format',
            'email_notifications', 'import_notifications', 'weekly_digest',
            'default_view', 'items_per_page', 'show_tutorial', 'bio', 'notes'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                fields.push(`${field} = $${paramCount++}`);
                values.push(updates[field]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(userId);
        const updateQuery = `
      UPDATE user_profiles 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

        const result = await query(updateQuery, values);

        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * GET /api/users/activity
 * Get user activity log
 */
router.get('/activity', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { limit = '50', offset = '0' } = req.query;

        const result = await query(`
      SELECT * FROM user_activity_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)]);

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

/**
 * POST /api/users/activity
 * Log user activity
 */
router.post('/activity', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { activity_type, activity_description, metadata } = req.body;

        if (!activity_type) {
            return res.status(400).json({ error: 'activity_type is required' });
        }

        const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
        const user_agent = req.headers['user-agent'] || null;

        await query(`
      INSERT INTO user_activity_log (
        user_id, activity_type, activity_description, metadata,
        ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
            userId,
            activity_type,
            activity_description || null,
            metadata ? JSON.stringify(metadata) : null,
            ip_address,
            user_agent
        ]);

        res.status(201).json({ message: 'Activity logged successfully' });
    } catch (error) {
        console.error('Log activity error:', error);
        res.status(500).json({ error: 'Failed to log activity' });
    }
});

export default router;
