import React, { useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useGroups } from '../hooks/useGroups';
import { useGroupContext } from '../../../context/GroupContext';
import { FamilyGroup } from '../../../lib/types';
import { RootStackParamList } from '../../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

type GroupsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupsList'>;

export function GroupsListScreen() {
  const navigation = useNavigation<GroupsListScreenNavigationProp>();
  const { user } = useAuth();
  const { setCurrentGroup, setGroupsMode } = useGroupContext();
  const { data: groups = [], isLoading } = useGroups(user?.id || '');

  // Set groups mode when this screen is mounted
  useEffect(() => {
    setGroupsMode(true);
  }, [setGroupsMode]);

  // Handle back navigation (both button press and swipe gesture)
  const handleBackPress = useCallback(() => {
    // Clear groups mode before navigating back
    setGroupsMode(false);
    // Navigate back to Dashboard
    navigation.goBack();
  }, [navigation, setGroupsMode]);

  // Add back button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleBackPress]);

  // Handle swipe back gesture - clear groups mode before removing screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Clear groups mode when navigating back (swipe or button)
      setGroupsMode(false);
      // Allow the default navigation to proceed
    });

    return unsubscribe;
  }, [navigation, setGroupsMode]);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleGroupPress = (group: FamilyGroup) => {
    // Set group context and reset navigation stack to Dashboard only
    // This prevents back button from showing, making it feel like the same screen
    setCurrentGroup(group.id, group.name);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard' as never }],
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007a33" />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a group to share and track finances with family members
            </Text>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => handleGroupPress(group)}
              >
                <View style={styles.groupIcon}>
                  <Ionicons name="people" size={24} color="#007a33" />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    Created {new Date(group.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <Ionicons name="add-circle" size={24} color="#ffffff" />
        <Text style={styles.createButtonText}>Create a new group</Text>
      </TouchableOpacity>
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
    paddingBottom: 100,
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
  groupsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  groupMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  createButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
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
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButtonContainer: {
    marginLeft: 8,
    paddingRight: 16, // Add spacing between back icon and "Groups" text
  },
  backButton: {
    padding: 8,
  },
});

