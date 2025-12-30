import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../../context/AuthContext';

export function WelcomeScreen({ navigation }: { navigation: any }) {
  const { clientProfile, completeProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (clientProfile) {
      setFirstName(clientProfile.first_name || '');
      setLastName(clientProfile.last_name || '');
      setPhoneNumber(clientProfile.phone_number || '');
    }
  }, [clientProfile]);

  const onContinue = async () => {
    const newErrors = {
      firstName: firstName.trim() ? '' : '! Please enter your first name',
      lastName: lastName.trim() ? '' : '! Please enter your last name',
      phoneNumber: phoneNumber.trim() ? '' : '! Please enter your contact number',
    };
    setErrors(newErrors);

    if (newErrors.firstName || newErrors.lastName || newErrors.phoneNumber) {
      return;
    }

    try {
      setSubmitting(true);
      setErrors({ firstName: '', lastName: '', phoneNumber: '' });
      const { error } = await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      if (error) {
        Alert.alert('Something went wrong', error.message || 'Please try again.');
        return;
      }

      // AppNavigator will switch to the main stack once profile is complete.
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.containerWrapper}>
      <KeyboardAvoidingView
        style={styles.containerWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ backgroundColor: '#007a33' }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Welcome!</Text>
              <Text style={styles.subtitle}>
                Tell us a bit about you to finish setting up your account.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  style={[styles.input, errors.firstName && styles.inputError]}
                  autoCapitalize="words"
                  placeholderTextColor="#9CA3AF"
                />
                {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  style={[styles.input, errors.lastName && styles.inputError]}
                  autoCapitalize="words"
                  placeholderTextColor="#9CA3AF"
                />
                {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact number</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter your phone number"
                  style={[styles.input, errors.phoneNumber && styles.inputError]}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9CA3AF"
                />
                {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={onContinue}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>{submitting ? 'Saving...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerWrapper: {
    flex: 1,
    backgroundColor: '#007a33',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#007a33',
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#b2e0d4',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    marginTop: 6,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#007a33', // Green to match login/signup theme
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

