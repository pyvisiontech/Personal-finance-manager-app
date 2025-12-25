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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          {isInviteMode ? (
            <>
              <View style={styles.groupInfo}>
                <Ionicons name="people" size={32} color="#007a33" />
                <Text style={styles.groupName}>{existingGroupName}</Text>
                <Text style={styles.groupSubtext}>Invite a new member to this group</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Invite Member</Text>
              <Text style={styles.sectionSubtitle}>
                Enter email addresses to send in-app notifications
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter group name (e.g., Family, Roommates)"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor="#9ca3af"
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Invite Member (Optional)</Text>
              <Text style={styles.sectionSubtitle}>
                Skip this if you want to create the group first. An in-app notification will be sent to invited users.
              </Text>
            </>
          )}

          {emailInputs.map((input, index) => (
            <View key={input.id} style={styles.emailInputContainer}>
              <View style={styles.emailInputRow}>
                <Text style={styles.label}>Email {index + 1}</Text>
                {emailInputs.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeEmailInput(input.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter member email"
                value={input.email}
                onChangeText={(email) => updateEmailInput(input.id, email)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />
              {!isInviteMode && (
                <Text style={styles.helpText}>
                  An in-app notification will be sent to this user
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            onPress={addEmailInput}
            style={styles.addMemberButton}
          >
            <Ionicons name="person-add" size={18} color="#007a33" />
            <Text style={styles.addMemberButtonText}>Add Member</Text>
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
    backgroundColor: '#f4f1e3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007a33',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emailInputContainer: {
    marginBottom: 16,
  },
  emailInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeButton: {
    padding: 4,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f5f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#007a33',
    borderStyle: 'dashed',
  },
  addMemberButtonText: {
    color: '#007a33',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  groupInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  groupSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
});

