import { api } from '../lib/api';
import { TicketData } from '../types/ticket';

export interface TicketFilter {
    import_id?: string;
    start_date?: string;
    end_date?: string;
    // Add other filters as needed
}

export const ticketService = {
    getTickets: async (filters?: TicketFilter) => {
        const params: Record<string, any> = {
            limit: 10000 // Get all for analysis
        };

        if (filters?.import_id) {
            params.import_id = filters.import_id;
        }

        // Since our backend doesn't support date range filtering directly yet (it only has exact match for fields in the current tickets.ts),
        // we will fetch by import_id and filter client-side for dates, OR we can update the backend.
        // However, looking at the backend code I wrote earlier:
        // It DOES NOT have date range filtering. It only has exact match for fields.

        // We will stick to fetching keys that exist.

        const response = await api.get<{ data: TicketData[] }>('/tickets', { params });
        return response.data;
    },

    // Add batch delete if needed
    deleteTicketsByImport: async (importId: string) => {
        return api.delete(`/tickets?import_id=${importId}`);
    }
};
