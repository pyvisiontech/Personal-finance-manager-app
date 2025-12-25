import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { FamilyGroup, GroupMember } from '../../../lib/types';

export function useGroups(userId: string) {
  return useQuery({
    queryKey: ['groups', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get all groups where user is a member
      const { data: memberships, error: membersError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          family_groups (
            id,
            name,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (membersError) {
        console.error('Error fetching group memberships:', membersError);
        throw membersError;
      }

      // Transform the data to extract groups
      const groups = (memberships || []).map((m: any) => m.family_groups).filter(Boolean) as FamilyGroup[];
      
      return groups;
    },
    enabled: !!userId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, userId }: { name: string; userId: string }) => {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert([{ name, created_by: userId }])
        .select()
        .single();

      if (groupError) {
        console.error('Error creating group:', groupError);
        throw groupError;
      }

      // Add creator as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{ group_id: group.id, user_id: userId }]);

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        throw memberError;
      }

      return group as FamilyGroup;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.userId] });
    },
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['groupMembers', groupId, 'v2'], // Added 'v2' to force cache refresh
    queryFn: async () => {
      if (!groupId) {
        console.log('🔍 useGroupMembers: No groupId provided');
        return [];
      }

      console.log('🔍 useGroupMembers: Fetching members for group:', groupId);

      // First, fetch group members (NO JOIN - just basic fields)
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, joined_at')
        .eq('group_id', groupId);

      if (membersError) {
        console.error('❌ Error fetching group members:', membersError);
        throw membersError;
      }

      console.log('✅ Fetched group members:', members?.length || 0);

      if (!members || members.length === 0) {
        return [];
      }

      // Get all user IDs
      const userIds = members.map(m => m.user_id).filter(Boolean);
      console.log('🔍 Fetching client info for user IDs:', userIds);

      // Fetch client information for all users (separate query)
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (clientsError) {
        console.error('❌ Error fetching client info:', clientsError);
        // Don't throw - we can still return members without client info
      } else {
        console.log('✅ Fetched client info:', clients?.length || 0);
      }

      // Create a map of user_id -> client for quick lookup
      const clientMap = new Map(
        (clients || []).map(client => [client.id, client])
      );

      // Combine members with client data
      const result = members.map((member: any) => ({
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id,
        joined_at: member.joined_at,
        user: clientMap.get(member.user_id) ? {
          id: clientMap.get(member.user_id)!.id,
          email: clientMap.get(member.user_id)!.email,
          first_name: clientMap.get(member.user_id)!.first_name,
          last_name: clientMap.get(member.user_id)!.last_name,
        } : undefined,
      })) as GroupMember[];

      console.log('✅ Returning combined members:', result.length);
      return result;
    },
    enabled: !!groupId,
  });
}

