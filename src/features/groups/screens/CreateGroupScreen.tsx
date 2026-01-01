import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useCreateGroup } from '../hooks/useGroups';
import { useCreateGroupInvite } from '../hooks/useGroupInvites';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';

type CreateGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;
type CreateGroupRouteProp = RouteProp<RootStackParamList, 'CreateGroup'>;

interface EmailInput {
  id: string;
  email: string;
}

export function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupScreenNavigationProp>();
  const route = useRoute<CreateGroupRouteProp>();
  const { user } = useAuth();
  const createGroup = useCreateGroup();
  const createInvite = useCreateGroupInvite();

  // Check if this is for inviting to existing group or creating new group
  const routeParams = route.params as { groupId?: string; groupName?: string } | undefined;
  const existingGroupId = routeParams?.groupId;
  const existingGroupName = routeParams?.groupName;
  const isInviteMode = !!existingGroupId;

  const [groupName, setGroupName] = useState(existingGroupName || '');
  const [emailInputs, setEmailInputs] = useState<EmailInput[]>([
    { id: '1', email: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addEmailInput = () => {
    const newId = Date.now().toString();
    setEmailInputs([...emailInputs, { id: newId, email: '' }]);
  };

  const removeEmailInput = (id: string) => {
    if (emailInputs.length > 1) {
      setEmailInputs(emailInputs.filter(input => input.id !== id));
    }
  };

  const updateEmailInput = (id: string, email: string) => {
    setEmailInputs(emailInputs.map(input => 
      input.id === id ? { ...input, email } : input
    ));
  };

  const getValidEmails = () => {
    return emailInputs
      .map(input => input.email.trim())
      .filter(email => email.length > 0);
  };

  const handleCreateGroup = async () => {
    // If invite mode, only need emails
    if (isInviteMode) {
      const validEmails = getValidEmails();
      
      if (validEmails.length === 0) {
        Alert.alert('Error', 'Please enter at least one email address');
        return;
      }

      if (!user?.id || !existingGroupId) {
        Alert.alert('Error', 'User or group not found');
        return;
      }

      setIsSubmitting(true);

      try {
        // Send invites to all valid emails
        const invitePromises = validEmails.map(email =>
          createInvite.mutateAsync({
            groupId: existingGroupId,
            invitedBy: user.id,
            inviteeEmail: email,
          })
        );
        
        await Promise.all(invitePromises);

        Alert.alert('Success', `${validEmails.length} invite(s) sent successfully!`, [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } catch (error: any) {
        console.error('Error sending invites:', error);
        Alert.alert('Error', error.message || 'Failed to send invitations');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Create new group mode
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the group
      const group = await createGroup.mutateAsync({
        name: groupName.trim(),
        userId: user.id,
      });

      // Get valid emails and send invites
      const validEmails = getValidEmails();
      
      if (validEmails.length > 0) {
        // Send invites to all valid emails
        const invitePromises = validEmails.map(email =>
          createInvite.mutateAsync({
            groupId: group.id,
            invitedBy: user.id,
            inviteeEmail: email,
          })
        );
        
        await Promise.all(invitePromises);
      }

      const successMessage = validEmails.length > 0
        ? `Group created and ${validEmails.length} invite(s) sent successfully!`
        : 'Group created successfully! You can add members later.';
      
      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isInviteMode && (
          <View style={styles.overviewContainer}>
            <View style={styles.overviewIconWrapper}>
              <View style={styles.overviewIconContainer}>
                <Ionicons name="people-circle" size={40} color="#007a33" />
              </View>
            </View>
            <Text style={styles.overviewTitle}>Track Finances Together</Text>
            <Text style={styles.overviewDescription}>
              Create a shared group with family members, roommates, or partners to view and track everyone's expenses in one place.
            </Text>
            <View style={styles.overviewFeatures}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark-circle" size={18} color="#007a33" />
                </View>
                <Text style={styles.featureText}>View everyone's transactions</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark-circle" size={18} color="#007a33" />
                </View>
                <Text style={styles.featureText}>Track shared expenses</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark-circle" size={18} color="#007a33" />
                </View>
                <Text style={styles.featureText}>Better financial transparency</Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.formContainer}>
          {isInviteMode ? (
            <>
              <View style={styles.groupInfoHeader}>
                <View style={styles.groupIconWrapper}>
                  <Ionicons name="people" size={28} color="#007a33" />
                </View>
                <Text style={styles.groupName}>{existingGroupName}</Text>
                <Text style={styles.groupSubtext}>Invite a new member to this group</Text>
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invite Member</Text>
                <Text style={styles.sectionSubtitle}>
                  Enter email addresses to send in-app notifications
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Group Details</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Group Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="people-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Family, Roommates, Friends"
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invite Members</Text>
                <Text style={styles.sectionSubtitle}>
                  Add members now or invite them later
                </Text>
              </View>
            </>
          )}

          {emailInputs.map((input, index) => (
            <View key={input.id} style={styles.emailInputWrapper}>
              <View style={styles.emailInputHeader}>
                <Text style={styles.emailLabel}>Member {index + 1}</Text>
                {emailInputs.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeEmailInput(input.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  value={input.email}
                  onChangeText={(email) => updateEmailInput(input.id, email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {!isInviteMode && index === 0 && (
                <View style={styles.helpTextContainer}>
                  <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                  <Text style={styles.helpText}> An in-app notification will be sent</Text>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            onPress={addEmailInput}
            style={styles.addMemberButton}
            activeOpacity={0.7}
          >
            <View style={styles.addMemberIcon}>
              <Ionicons name="add" size={20} color="#007a33" />
            </View>
            <Text style={styles.addMemberButtonText}>Add Another Member</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleCreateGroup}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name={isInviteMode ? "send" : (getValidEmails().length > 0 ? "send" : "checkmark-circle")} size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>
                {isInviteMode
                  ? `Send ${getValidEmails().length || ''} Invite(s)`
                  : getValidEmails().length > 0 
                    ? `Create Group & Send ${getValidEmails().length} Invite(s)` 
                    : 'Create Group'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  overviewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  overviewIconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  overviewDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  overviewFeatures: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    marginBottom: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  emailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 0,
  },
  emailInputWrapper: {
    marginBottom: 20,
  },
  emailInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeButton: {
    padding: 4,
    marginTop: -4,
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderStyle: 'dashed',
  },
  addMemberIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addMemberButtonText: {
    color: '#007a33',
    fontSize: 15,
    fontWeight: '600',
  },
  groupInfoHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  groupIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  groupSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007a33',
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: '#007a33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
});

