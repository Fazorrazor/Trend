import { Router, Request, Response } from 'express';
import { pool, query, getClient } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/tickets
 * Get tickets with pagination and filtering
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const {
            import_id,
            category,
            sub_category,
            service,
            priority,
            status,
            cluster,
            affiliate,
            limit = '1000',
            offset = '0',
        } = req.query;

        const conditions: string[] = [];
        const params: any[] = [];
        let paramCount = 1;

        // Build WHERE conditions
        if (import_id) {
            conditions.push(`import_id = $${paramCount++}`);
            params.push(import_id);
        }
        if (category) {
            conditions.push(`category = $${paramCount++}`);
            params.push(category);
        }
        if (sub_category) {
            conditions.push(`sub_category = $${paramCount++}`);
            params.push(sub_category);
        }
        if (service) {
            conditions.push(`service = $${paramCount++}`);
            params.push(service);
        }
        if (priority) {
            conditions.push(`priority = $${paramCount++}`);
            params.push(priority);
        }
        if (status) {
            conditions.push(`status = $${paramCount++}`);
            params.push(status);
        }
        if (cluster) {
            conditions.push(`cluster = $${paramCount++}`);
            params.push(cluster);
        }
        if (affiliate) {
            conditions.push(`affiliate = $${paramCount++}`);
            params.push(affiliate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get tickets
        const ticketsQuery = `
      SELECT * FROM ticket_data 
      ${whereClause}
      ORDER BY request_time DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
        params.push(parseInt(limit as string), parseInt(offset as string));

        const ticketsResult = await query(ticketsQuery, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM ticket_data ${whereClause}`;
        const countParams = params.slice(0, -2); // Remove limit and offset
        const countResult = await query(countQuery, countParams);

        res.json({
            data: ticketsResult.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            },
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

/**
 * POST /api/tickets/batch
 * Batch insert tickets
 */
router.post('/batch', authenticate, async (req: Request, res: Response) => {
    const client = await getClient();

    try {
        const { tickets, import_id } = req.body;

        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({ error: 'tickets array is required' });
        }

        if (!import_id) {
            return res.status(400).json({ error: 'import_id is required' });
        }

        await client.query('BEGIN');

        // Prepare batch insert
        const values: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const ticket of tickets) {
            const rowValues: string[] = [];

            // Add all parameters for this row
            rowValues.push(`$${paramIndex++}`); params.push(import_id);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.ticket_id);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.request_time);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.week_number || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.week_label || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.initiator || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.affiliate || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.cluster || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.service || ticket.service_record_type || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.category || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.sub_category || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.third_lvl_category || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.title || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.description || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.name || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.support_group || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.process || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.priority || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.status || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.resolution || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.root_cause || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.incident_origin || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.close_time || null);
            rowValues.push(`$${paramIndex++}`); params.push(ticket.sla_indicator || null);

            values.push(`(${rowValues.join(', ')})`);
        }

        const insertQuery = `
      INSERT INTO ticket_data (
        import_id, ticket_id, request_time, week_number, week_label,
        initiator, affiliate, cluster, service, category, sub_category,
        third_lvl_category, title, description, name, support_group, process,
        priority, status, resolution, root_cause, incident_origin, close_time,
        sla_indicator
      ) VALUES ${values.join(', ')}
    `;

        await client.query(insertQuery, params);
        await client.query('COMMIT');

        res.status(201).json({
            message: `Successfully inserted ${tickets.length} tickets`,
            count: tickets.length,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch insert error:', error);
        res.status(500).json({ error: 'Failed to insert tickets' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/tickets/:id
 * Get specific ticket
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query('SELECT * FROM ticket_data WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

/**
 * DELETE /api/tickets
 * Delete tickets by import_id
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { import_id } = req.query;

        if (!import_id) {
            return res.status(400).json({ error: 'import_id is required' });
        }

        const result = await query('DELETE FROM ticket_data WHERE import_id = $1', [import_id]);

        res.json({
            message: 'Tickets deleted successfully',
            deleted: result.rowCount,
        });
    } catch (error) {
        console.error('Delete tickets error:', error);
        res.status(500).json({ error: 'Failed to delete tickets' });
    }
});

export default router;
