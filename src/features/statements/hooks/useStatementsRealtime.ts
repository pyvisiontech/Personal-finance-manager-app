import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { StatementImport } from '../../../lib/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useStatementsRealtime(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['statement_imports', userId],
    queryFn: async () => {
      if (!userId) {
        console.warn('No user ID provided to useStatementsRealtime');
        return [];
      }

      console.log('Fetching statements for user:', userId);
      
      try {
        const { data, error } = await supabase
          .from('statement_imports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(error.message || 'Failed to fetch statements');
        }
        
        console.log('Fetched statements:', data?.length);
        return (data || []) as StatementImport[];
      } catch (error) {
        console.error('Error fetching statements:', error);
        throw error;
      }
    },
    enabled: !!userId,
    // Still poll every 10 seconds as backup (in case Realtime fails)
    refetchInterval: (query) => {
      const statements = query.state.data as StatementImport[] | undefined;
      if (!statements || statements.length === 0) return false;
      
      const hasProcessingStatements = statements.some(
        (stmt) => stmt.status === 'processing' || stmt.status === 'uploaded'
      );
      
      return hasProcessingStatements ? 10000 : false; // Poll every 10 seconds as backup
    },
  });

  useEffect(() => {
    if (!userId) return;

    console.log('Setting up Realtime subscription for statements...');

    // Subscribe to realtime updates for statement_imports table
    const channel: RealtimeChannel = supabase
      .channel(`statement_imports:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'statement_imports',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📡 Realtime update received:', payload.eventType, payload.new || payload.old);
          
          // Invalidate and refetch queries to get latest data
          queryClient.invalidateQueries({ queryKey: ['statement_imports', userId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime subscription error - falling back to polling');
        }
      });

    // Cleanup: unsubscribe when component unmounts
    return () => {
      console.log('Cleaning up Realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
