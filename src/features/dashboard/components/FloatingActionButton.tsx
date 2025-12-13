import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();

    setIsOpen(!isOpen);
  };

  const uploadStatement = () => {
    navigation.navigate('UploadStatement');
    toggleMenu();
  };

  const addManualTransaction = () => {
    navigation.navigate('TransactionsTab', { screen: 'ManualTransaction' });
    toggleMenu();
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

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.submenu,
          {
            opacity: uploadOpacity,
            transform: [{ translateY: uploadY }],
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity onPress={uploadStatement} activeOpacity={0.7}>
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
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity onPress={addManualTransaction} activeOpacity={0.7}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
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
  submenuText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default FloatingActionButton;