import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useAuth } from '../../../context/AuthContext';
import { useGroupContext } from '../../../context/GroupContext';
import { useGroupMembers, useRemoveGroupMember } from '../hooks/useGroups';
import { useGroupInvites } from '../hooks/useGroupInvites';
import { GroupMember, GroupInvite } from '../../../lib/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';

type GroupDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupDetails'>;

export function GroupDetailsScreen() {
  const navigation = useNavigation<GroupDetailsScreenNavigationProp>();
  const { user } = useAuth();
  const { currentGroupId, currentGroupName } = useGroupContext();
  const { data: members = [], isLoading } = useGroupMembers(currentGroupId || '');
  const { data: invites = [], isLoading: isLoadingInvites } = useGroupInvites(currentGroupId || '');
  const removeMemberMutation = useRemoveGroupMember();
  
  // Get member emails to check if invitee is already a member
  const memberEmails = new Set(
    members.map(member => member.user?.email?.toLowerCase().trim()).filter(Boolean)
  );
  
  // Filter pending invites and exclude those who are already members
  const pendingInvitesFiltered = invites.filter(invite => {
    // Only show pending invites
    if (invite.status !== 'pending') return false;
    
    // Exclude if invitee is already a member
    const inviteeEmail = invite.invitee_email?.toLowerCase().trim();
    if (inviteeEmail && memberEmails.has(inviteeEmail)) {
      return false;
    }
    
    return true;
  });
  
  // Remove duplicates by email (keep the most recent one)
  const uniquePendingInvites = Array.from(
    new Map(
      pendingInvitesFiltered
        .sort((a, b) => moment.utc(b.created_at).valueOf() - moment.utc(a.created_at).valueOf())
        .map(invite => [invite.invitee_email?.toLowerCase().trim(), invite])
    ).values()
  );
  
  const pendingInvites = uniquePendingInvites;

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: currentGroupName || 'Group Details',
    });
  }, [navigation, currentGroupName]);

  const handleInviteMember = () => {
    if (currentGroupId) {
      navigation.navigate('CreateGroup', {
        groupId: currentGroupId,
        groupName: currentGroupName || '',
      } as never);
    }
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (!currentGroupId) return;

    const memberName = member.user?.first_name && member.user?.last_name
      ? `${member.user.first_name} ${member.user.last_name}`
      : member.user?.email || 'this member';

    // Don't allow removing yourself
    if (member.user_id === user?.id) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself from the group.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberMutation.mutateAsync({
                memberId: member.id,
                groupId: currentGroupId,
              });
              Alert.alert('Success', 'Member removed from group.');
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!currentGroupId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Group Selected</Text>
          <Text style={styles.emptySubtitle}>
            Please select a group to view its details
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading || isLoadingInvites) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007a33" />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Group Info Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.groupHeader}>
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={32} color="#007a33" />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{currentGroupName || 'Unnamed Group'}</Text>
              <Text style={styles.memberCount}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.membersHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <TouchableOpacity
              onPress={handleInviteMember}
              style={styles.inviteButton}
            >
              <Ionicons name="person-add" size={18} color="#007a33" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {members.length > 0 ? (
            <View style={styles.membersList}>
              {members.map((member, index) => {
                const isCurrentUser = member.user_id === user?.id;
                const memberName = member.user?.first_name && member.user?.last_name
                  ? `${member.user.first_name} ${member.user.last_name}`
                  : member.user?.email || 'Unknown User';

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberItem,
                      index === members.length - 1 && styles.memberItemLast,
                    ]}
                  >
                    <View style={styles.memberLeft}>
                      <View style={styles.memberAvatar}>
                        <Ionicons name="person" size={20} color="#007a33" />
                      </View>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{memberName}</Text>
                          {isCurrentUser && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.memberEmail}>{member.user?.email || ''}</Text>
                        {member.joined_at && (
                          <Text style={styles.memberJoined}>
                            Joined {moment.utc(member.joined_at).local().format('M/D/YYYY')}
                          </Text>
                        )}
                      </View>
                    </View>
                    {!isCurrentUser && (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member)}
                        style={styles.removeButton}
                        disabled={removeMemberMutation.isPending}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyMembers}>
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyMembersText}>No members yet</Text>
              <Text style={styles.emptyMembersSubtext}>
                Invite members to start sharing finances with your group
              </Text>
              <TouchableOpacity
                onPress={handleInviteMember}
                style={styles.inviteEmptyButton}
              >
                <Ionicons name="person-add" size={18} color="#007a33" />
                <Text style={styles.inviteEmptyButtonText}>Invite First Member</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.membersHeader}>
              <Text style={styles.sectionTitle}>Pending Invites</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingInvites.length}</Text>
              </View>
            </View>

            <View style={styles.membersList}>
              {pendingInvites.map((invite, index) => {
                const inviteeName = invite.invitee_name || invite.invitee_email.split('@')[0];
                const isExpired = invite.expires_at && moment.utc(invite.expires_at).local().isBefore(moment());

                return (
                  <View
                    key={invite.id}
                    style={[
                      styles.memberItem,
                      index === pendingInvites.length - 1 && styles.memberItemLast,
                    ]}
                  >
                    <View style={styles.memberLeft}>
                      <View style={[styles.memberAvatar, styles.pendingAvatar]}>
                        <Ionicons name="mail-outline" size={20} color="#f59e0b" />
                      </View>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{inviteeName}</Text>
                          {isExpired && (
                            <View style={styles.expiredBadge}>
                              <Text style={styles.expiredBadgeText}>Expired</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.memberEmail}>{invite.invitee_email}</Text>
                        <Text style={styles.memberJoined}>
                          Invited {moment.utc(invite.created_at).local().format('M/D/YYYY')}
                          {invite.expires_at && !isExpired && (
                            <Text style={styles.expiresText}>
                              {' • Expires '}
                              {moment.utc(invite.expires_at).local().format('M/D/YYYY')}
                            </Text>
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.pendingIcon}>
                      <Ionicons name="time-outline" size={20} color="#f59e0b" />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f1e3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f1e3',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  groupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e6f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e6f5f0',
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#007a33',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  membersList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberItemLast: {
    borderBottomWidth: 0,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  youBadge: {
    backgroundColor: '#e6f5f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007a33',
  },
  memberEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  memberJoined: {
    fontSize: 11,
    color: '#9ca3af',
  },
  removeButton: {
    padding: 4,
  },
  emptyMembers: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyMembersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyMembersSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  inviteEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#e6f5f0',
    borderRadius: 8,
  },
  inviteEmptyButtonText: {
    color: '#007a33',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingAvatar: {
    backgroundColor: '#fef3c7',
  },
  pendingIcon: {
    padding: 4,
  },
  expiredBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
  },
  expiresText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});

