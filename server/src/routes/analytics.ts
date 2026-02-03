import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/analytics/key-findings
 * Get key findings for a service/import
 */
router.get('/key-findings', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { service_key, import_id = 'all' } = req.query;

        const conditions: string[] = ['user_id = $1'];
        const params: any[] = [userId];
        let paramCount = 2;

        if (service_key) {
            conditions.push(`service_key = $${paramCount++}`);
            params.push(service_key);
        }

        if (import_id) {
            conditions.push(`import_id = $${paramCount++}`);
            params.push(import_id);
        }

        const result = await query(
            `SELECT * FROM key_findings 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
            params
        );

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Get key findings error:', error);
        res.status(500).json({ error: 'Failed to fetch key findings' });
    }
});

/**
 * POST /api/analytics/key-findings
 * Create or update key finding
 */
router.post('/key-findings', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { service_key, import_id = 'all', finding_text } = req.body;

        if (!service_key || !finding_text) {
            return res.status(400).json({ error: 'service_key and finding_text are required' });
        }

        const result = await query(`
      INSERT INTO key_findings (
        user_id, service_key, import_id, finding_text
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, service_key, import_id, finding_text]);

        res.status(201).json({ data: result.rows[0] });
    } catch (error) {
        console.error('Create key finding error:', error);
        res.status(500).json({ error: 'Failed to create key finding' });
    }
});

/**
 * POST /api/analytics/key-findings/batch
 * Batch replace key findings for a specific context
 */
router.post('/key-findings/batch', authenticate, async (req: Request, res: Response) => {
    const client = await import('../db/index.js').then(m => m.getClient());

    try {
        await client.query('BEGIN');

        const userId = req.user?.userId;
        const { service_key, import_id = 'all', findings } = req.body; // findings is array of { text }

        if (!service_key || !Array.isArray(findings)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'service_key and findings array required' });
        }

        // Delete existing for this context
        await client.query(
            `DELETE FROM key_findings 
             WHERE user_id = $1 AND service_key = $2 AND import_id = $3`,
            [userId, service_key, import_id]
        );

        // Insert new ones
        if (findings.length > 0) {
            for (const finding of findings) {
                if (finding.text && finding.text.trim()) {
                    await client.query(
                        `INSERT INTO key_findings (user_id, service_key, import_id, finding_text)
                         VALUES ($1, $2, $3, $4)`,
                        [userId, service_key, import_id, finding.text]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Key findings updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch update key findings error:', error);
        res.status(500).json({ error: 'Failed to update key findings' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/analytics/key-findings/:id
 * Delete key finding
 */
router.delete('/key-findings/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        const result = await query(
            'DELETE FROM key_findings WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        res.json({ message: 'Finding deleted successfully' });
    } catch (error) {
        console.error('Delete key finding error:', error);
        res.status(500).json({ error: 'Failed to delete finding' });
    }
});

/**
 * GET /api/analytics/detailed-analysis
 * Get detailed analysis for service/category
 */
router.get('/detailed-analysis', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { service_key, category, import_id = 'all' } = req.query;

        const conditions: string[] = ['user_id = $1'];
        const params: any[] = [userId];
        let paramCount = 2;

        if (service_key) {
            conditions.push(`service_key = $${paramCount++}`);
            params.push(service_key);
        }

        if (category) {
            conditions.push(`category = $${paramCount++}`);
            params.push(category);
        }

        if (import_id) {
            conditions.push(`import_id = $${paramCount++}`);
            params.push(import_id);
        }

        const result = await query(
            `SELECT * FROM detailed_analysis 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
            params
        );

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Get detailed analysis error:', error);
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});

/**
 * POST /api/analytics/detailed-analysis
 * Create or update detailed analysis
 */
router.post('/detailed-analysis', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { service_key, category, import_id = 'all', root_cause, recommendation } = req.body;

        if (!service_key || !category) {
            return res.status(400).json({ error: 'service_key and category are required' });
        }

        // Use INSERT ... ON CONFLICT for upsert
        const result = await query(`
      INSERT INTO detailed_analysis (
        user_id, service_key, category, import_id, root_cause, recommendation
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, service_key, category, import_id)
      DO UPDATE SET 
        root_cause = EXCLUDED.root_cause,
        recommendation = EXCLUDED.recommendation,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, service_key, category, import_id, root_cause || null, recommendation || null]);

        res.status(201).json({ data: result.rows[0] });
    } catch (error) {
        console.error('Save detailed analysis error:', error);
        res.status(500).json({ error: 'Failed to save analysis' });
    }
});

/**
 * DELETE /api/analytics/detailed-analysis
 * Delete detailed analysis (reset to default)
 */
router.delete('/detailed-analysis', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { service_key, category, import_id = 'all' } = req.query;

        // Using string() to ensure they are strings
        const pServiceKey = String(service_key);
        const pCategory = String(category);
        const pImportId = String(import_id);

        if (!service_key || !category) {
            return res.status(400).json({ error: 'service_key and category are required' });
        }

        const result = await query(
            `DELETE FROM detailed_analysis 
             WHERE user_id = $1 AND service_key = $2 AND category = $3 AND import_id = $4`,
            [userId, pServiceKey, pCategory, pImportId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        console.error('Delete detailed analysis error:', error);
        res.status(500).json({ error: 'Failed to delete analysis' });
    }
});

export default router;
