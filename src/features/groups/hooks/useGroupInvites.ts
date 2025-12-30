import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { GroupInvite } from '../../../lib/types';
import { Alert } from 'react-native';

export function useGroupInvites(groupId: string) {
  return useQuery({
    queryKey: ['groupInvites', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          *,
          family_groups (
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('group_id', groupId)
        .in('status', ['pending', 'accepted', 'rejected', 'expired']) // Get all statuses for filtering
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching group invites:', error);
        throw error;
      }

      return (data || []) as GroupInvite[];
    },
    enabled: !!groupId,
  });
}

export function useCreateGroupInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      invitedBy,
      inviteeEmail,
    }: {
      groupId: string;
      invitedBy: string;
      inviteeEmail: string;
    }) => {
      // Generate a unique invite token
      const inviteToken = `${groupId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('group_invites')
        .insert([
          {
            group_id: groupId,
            invited_by: invitedBy,
            invite_token: inviteToken,
            invitee_email: inviteeEmail,
            invitee_name: null, // Name is optional, will be set when user accepts
            expires_at: expiresAt.toISOString(),
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating invite:', error);
        throw error;
      }

      // Get group name and inviter name for notification
      const { data: group } = await supabase
        .from('family_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      const { data: inviter } = await supabase
        .from('clients')
        .select('first_name, last_name')
        .eq('id', invitedBy)
        .single();

      const groupName = group?.name || 'a group';
      const inviterName = inviter 
        ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || 'Someone'
        : 'Someone';

      // Find user by email to create notification
      // Query clients table to find user by email
      const { data: inviteeClient, error: clientLookupError } = await supabase
        .from('clients')
        .select('id, email')
        .eq('email', inviteeEmail.toLowerCase().trim())
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

      console.log('🔍 Looking up user by email:', inviteeEmail);
      console.log('🔍 Client lookup result:', { inviteeClient, clientLookupError });

      // If user exists, create a notification for them
      if (inviteeClient?.id) {
        console.log('✅ User found, creating notification for user_id:', inviteeClient.id);
        
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .insert([
            {
              user_id: inviteeClient.id,
              type: 'group_invite',
              title: `Invited to join ${groupName}`,
              message: `${inviterName} has invited you to join the group "${groupName}"`,
              data: {
                group_id: groupId,
                invite_id: data.id,
                invite_token: inviteToken,
                group_name: groupName,
                inviter_name: inviterName,
              },
              status: 'unread',
            },
          ])
          .select()
          .single();

        if (notificationError) {
          console.error('❌ Error creating notification:', notificationError);
          console.error('❌ Notification error details:', JSON.stringify(notificationError, null, 2));
          // Don't throw - invite was created successfully, notification is optional
        } else {
          console.log('✅ Notification created successfully:', notificationData);
        }
      } else {
        console.log('⚠️ User not found with email:', inviteeEmail);
        console.log('⚠️ Client lookup error:', clientLookupError);
        console.log('ℹ️ Invite created, but no notification (user will see it when they sign up)');
        
        // Also try to find by auth.users email as fallback
        // Note: This requires checking if we can query auth.users directly
        // For now, we'll just log that the user doesn't exist in clients table
      }

      return { invite: data as GroupInvite };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groupInvites', variables.groupId] });
      
      // Show success message
      Alert.alert(
        'Invite Sent! ✅',
        `An invitation has been sent to ${variables.inviteeEmail}. They will receive a notification in the app.`,
        [{ text: 'OK' }]
      );
    },
  });
}

export function useAcceptGroupInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteToken, userId }: { inviteToken: string; userId: string }) => {
      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('group_invites')
        .select('*, family_groups(*)')
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invite) {
        throw new Error('Invite not found or already used');
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new Error('Invite has expired');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', invite.group_id)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        throw new Error('You are already a member of this group');
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{ group_id: invite.group_id, user_id: userId }]);

      if (memberError) {
        throw memberError;
      }

      // Update invite status
      const { error: updateError } = await supabase
        .from('group_invites')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (updateError) {
        console.error('Error updating invite status:', updateError);
        // Don't throw - member was added successfully
      }

      return invite;
    },
    onSuccess: (data, variables) => {
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups', variables.userId] });
      // Invalidate group invites to remove from pending list
      queryClient.invalidateQueries({ queryKey: ['groupInvites', data.group_id] });
      // Invalidate group members to add to members list
      queryClient.invalidateQueries({ queryKey: ['groupMembers', data.group_id] });
    },
  });
}

