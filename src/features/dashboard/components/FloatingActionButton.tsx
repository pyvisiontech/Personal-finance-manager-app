import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonsClickable, setButtonsClickable] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();
  const isOpenRef = useRef(false);

  // Update ref when state changes
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Ensure buttons are clickable immediately when menu opens
  useLayoutEffect(() => {
    if (isOpen) {
      setButtonsClickable(true);
    } else {
      setButtonsClickable(false);
    }
  }, [isOpen]);

  const closeMenu = React.useCallback(() => {
    if (!isOpenRef.current) return;
    
    // Update states immediately
    setButtonsClickable(false);
    setIsOpen(false);
    
    Animated.spring(animation, {
      toValue: 0,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  // Close menu when screen loses focus (navigating away)
  useFocusEffect(
    React.useCallback(() => {
      // Cleanup: close menu when screen loses focus
      return () => {
        if (isOpenRef.current) {
          closeMenu();
        }
      };
    }, [closeMenu])
  );

  // Listen to navigation state changes to close menu
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      if (isOpenRef.current) {
        closeMenu();
      }
    });

    return unsubscribe;
  }, [navigation, closeMenu]);

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      // Set states immediately so buttons are clickable right away
      setIsOpen(true);
      setButtonsClickable(true);
      
      const toValue = 1;
      Animated.spring(animation, {
        toValue,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const uploadStatement = () => {
    closeMenu();
    // Small delay to ensure menu closes before navigation
    setTimeout(() => {
      navigation.navigate('UploadStatement');
    }, 100);
  };

  const addManualTransaction = () => {
    closeMenu();
    // Small delay to ensure menu closes before navigation
    setTimeout(() => {
      navigation.navigate('TransactionsTab', { screen: 'ManualTransaction' });
    }, 100);
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const uploadY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const addY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const uploadOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const addOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const backdropOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <>
      {/* Backdrop overlay - closes menu when clicked */}
      {isOpen && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            pointerEvents="auto"
          />
        </Animated.View>
      )}

      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.submenu,
            {
              opacity: uploadOpacity,
              transform: [{ translateY: uploadY }],
            },
          ]}
          pointerEvents={buttonsClickable ? 'auto' : 'none'}
        >
          <TouchableOpacity 
            onPress={uploadStatement} 
            activeOpacity={0.7}
            style={styles.touchableButton}
            disabled={!buttonsClickable}
          >
            <View style={styles.submenuButton}>
              <MaterialIcons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.submenuText}>Upload Statement</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.submenu,
            {
              opacity: addOpacity,
              transform: [{ translateY: addY }],
            },
          ]}
          pointerEvents={buttonsClickable ? 'auto' : 'none'}
        >
          <TouchableOpacity 
            onPress={addManualTransaction} 
            activeOpacity={0.7}
            style={styles.touchableButton}
            disabled={!buttonsClickable}
          >
            <View style={styles.submenuButton}>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.submenuText}>Add Transaction</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.button, { transform: [{ rotate: rotation }] }]}>
          <TouchableOpacity onPress={toggleMenu}>
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: '#000',
  },
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007a33',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  submenu: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#007a33',
    width: 200,
    height: 56, // From button
    borderRadius: 8,
    // padding: 8, // Removed or adjusted to match alignment
    justifyContent: 'center', // From button
    shadowColor: '#000', // From button
    shadowOffset: { width: 0, height: 2 }, // From button
    shadowOpacity: 0.3, // From button
    shadowRadius: 3, // From button
    elevation: 5, // From button
  },
  submenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  touchableButton: {
    flex: 1,
  },
  submenuText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default FloatingActionButton;