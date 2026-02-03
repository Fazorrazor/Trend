import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type FilterOperator = 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'neq' | 'like' | 'ilike';

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Fetch all records from a table using pagination to bypass the 1000-record limit.
 * Supabase has a default max page size of 1000, so we need to paginate for larger datasets.
 */
export async function fetchAllRecords<T = any>(
  table: string,
  select: string = '*',
  filters?: QueryFilter[]
): Promise<{ data: T[] | null; error: any }> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      let query = supabase
        .from(table)
        .select(select)
        .range(from, from + PAGE_SIZE - 1);

      // Apply filters if provided
      if (filters) {
        filters.forEach(({ column, operator, value }) => {
          switch (operator) {
            case 'eq':
              query = query.eq(column, value);
              break;
            case 'gte':
              query = query.gte(column, value);
              break;
            case 'lte':
              query = query.lte(column, value);
              break;
            case 'gt':
              query = query.gt(column, value);
              break;
            case 'lt':
              query = query.lt(column, value);
              break;
            case 'neq':
              query = query.neq(column, value);
              break;
            case 'like':
              query = query.like(column, value);
              break;
            case 'ilike':
              query = query.ilike(column, value);
              break;
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error };
      }

      if (data && data.length > 0) {
        allData = allData.concat(data as T[]);
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE; // Continue if we got a full page
      } else {
        hasMore = false;
      }
    }

    return { data: allData, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
