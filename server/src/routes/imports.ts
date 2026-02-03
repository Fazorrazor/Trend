import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/imports
 * Get all data imports
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const result = await query(`
      SELECT * FROM data_imports 
      ORDER BY imported_at DESC
    `);

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Get imports error:', error);
        res.status(500).json({ error: 'Failed to fetch imports' });
    }
});

/**
 * GET /api/imports/:id
 * Get specific import
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM data_imports WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Import not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error('Get import error:', error);
        res.status(500).json({ error: 'Failed to fetch import' });
    }
});

/**
 * POST /api/imports
 * Create new import record
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { import_name, total_records, import_month, import_year, month_label, notes } = req.body;

        if (!import_name || !total_records) {
            return res.status(400).json({ error: 'import_name and total_records are required' });
        }

        const userId = req.user?.userId;

        const result = await query(
            `INSERT INTO data_imports (
        import_name, imported_by, total_records, status,
        import_month, import_year, month_label, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                import_name,
                userId,
                total_records,
                'completed',
                import_month || null,
                import_year || null,
                month_label || null,
                notes || null
            ]
        );

        res.status(201).json({ data: result.rows[0] });
    } catch (error) {
        console.error('Create import error:', error);
        res.status(500).json({ error: 'Failed to create import' });
    }
});

/**
 * PUT /api/imports/:id
 * Update import record
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { import_month, import_year, month_label } = req.body;

        const result = await query(
            `UPDATE data_imports 
             SET import_month = $1, import_year = $2, month_label = $3
             WHERE id = $4
             RETURNING *`,
            [import_month, import_year, month_label, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Import not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error('Update import error:', error);
        res.status(500).json({ error: 'Failed to update import' });
    }
});

/**
 * DELETE /api/imports/:id
 * Delete import and associated tickets
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if import exists
        const checkResult = await query('SELECT id FROM data_imports WHERE id = $1', [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Import not found' });
        }

        // Delete (tickets will be deleted via CASCADE)
        await query('DELETE FROM data_imports WHERE id = $1', [id]);

        res.json({ message: 'Import deleted successfully' });
    } catch (error) {
        console.error('Delete import error:', error);
        res.status(500).json({ error: 'Failed to delete import' });
    }
});

export default router;
