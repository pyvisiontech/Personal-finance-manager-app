import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.85);

export function ProfileMenu() {
  const { user, clientProfile, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLogout = async () => {
    try {
      await signOut();
      setModalVisible(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Animate drawer opening
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible]);

  const closeDrawer = () => {
    setModalVisible(false);
  };

  const handleMenuOption = (option: string) => {
    closeDrawer();
    
    // Small delay to allow drawer to close before navigation
    setTimeout(() => {
      switch (option) {
        case 'profile':
          navigation.navigate('HomeTab', { screen: 'Profile' });
          break;
        case 'groups':
          navigation.navigate('HomeTab', { screen: 'GroupsList' });
          break;
        case 'settings':
          // Settings screen - coming soon
          break;
        case 'faq':
          navigation.navigate('HomeTab', { screen: 'FAQ' });
          break;
        case 'logout':
          handleLogout();
          break;
      }
    }, 250);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (clientProfile?.first_name && clientProfile?.last_name) {
      return `${clientProfile.first_name[0]}${clientProfile.last_name[0]}`.toUpperCase();
    }
    if (clientProfile?.first_name) {
      return clientProfile.first_name[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (clientProfile?.first_name && clientProfile?.last_name) {
      return `${clientProfile.first_name} ${clientProfile.last_name}`;
    }
    if (clientProfile?.first_name) {
      return clientProfile.first_name;
    }
    if (user?.email) {
      return user.email;
    }
    return 'User';
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.profileContainer}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          >
            <Animated.View
              style={[
                styles.backdropAnimated,
                {
                  opacity: fadeAnim,
                },
              ]}
            />
          </TouchableOpacity>

          {/* Drawer */}
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.drawerContent}>
              {/* Drawer Header */}
              <View style={styles.drawerHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeDrawer}
                >
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Profile Section */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarTextLarge}>{getInitials()}</Text>
                </View>
                <Text style={styles.userName}>{getUserName()}</Text>
                {user?.email && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
              </View>

              {/* Menu Options */}
              <View style={styles.menuOptions}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuOption('profile')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#EFF6FF' }]}>
                      <MaterialIcons name="person" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.menuItemText}>Profile</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuOption('groups')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#E6F5F0' }]}>
                      <MaterialIcons name="people" size={20} color="#007a33" />
                    </View>
                    <Text style={styles.menuItemText}>Groups</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuOption('settings')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#F3F4F6' }]}>
                      <MaterialIcons name="settings" size={20} color="#6B7280" />
                    </View>
                    <Text style={styles.menuItemText}>Settings</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuOption('faq')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#F0FDF4' }]}>
                      <MaterialIcons name="help-outline" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.menuItemText}>FAQ</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={() => handleMenuOption('logout')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                      <MaterialIcons name="logout" size={20} color="#EF4444" />
                    </View>
                    <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    color: '#007a33',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdropAnimated: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007a33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#007a33',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarTextLarge: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  menuOptions: {
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    marginHorizontal: 12,
  },
  logoutItem: {
    marginTop: 4,
  },
  logoutText: {
    color: '#EF4444',
  },
});

