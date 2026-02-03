import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/settings/cluster-mappings
 * Get all cluster mappings
 */
router.get('/cluster-mappings', authenticate, async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT * FROM cluster_affiliate_mapping 
            ORDER BY cluster ASC, affiliate ASC
        `);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Get cluster mappings error:', error);
        res.status(500).json({ error: 'Failed to fetch mappings' });
    }
});

/**
 * POST /api/settings/cluster-mappings
 * Create new cluster mappings (bulk)
 */
router.post('/cluster-mappings', authenticate, async (req: Request, res: Response) => {
    try {
        const mappings = req.body;

        if (!Array.isArray(mappings) || mappings.length === 0) {
            return res.status(400).json({ error: 'mappings array is required' });
        }

        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const m of mappings) {
            if (!m.cluster || !m.affiliate) continue;

            values.push(`($${paramIndex++}, $${paramIndex++})`);
            params.push(m.cluster, m.affiliate);
        }

        if (values.length === 0) {
            return res.status(400).json({ error: 'No valid mappings provided' });
        }

        // On conflict do nothing is useful if duplicate
        const result = await query(
            `INSERT INTO cluster_affiliate_mapping (cluster, affiliate)
             VALUES ${values.join(', ')}
             ON CONFLICT (cluster, affiliate) DO NOTHING
             RETURNING *`,
            params
        );

        res.status(201).json({
            message: 'Mappings created',
            count: result.rowCount
        });
    } catch (error) {
        console.error('Create cluster mappings error:', error);
        res.status(500).json({ error: 'Failed to create mappings' });
    }
});

/**
 * DELETE /api/settings/cluster-mappings/:id
 * Delete a specific mapping
 */
router.delete('/cluster-mappings/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM cluster_affiliate_mapping WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Mapping not found' });
        }

        res.json({ message: 'Mapping deleted' });
    } catch (error) {
        console.error('Delete cluster mapping error:', error);
        res.status(500).json({ error: 'Failed to delete mapping' });
    }
});

export default router;
