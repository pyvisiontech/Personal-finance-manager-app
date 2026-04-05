import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#007a33',
  },
  container: {
    flex: 1,
    backgroundColor: '#007a33',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    marginTop: 0,
    marginBottom: 32,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#b2e0d4',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c3ebd4',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007a33',
    marginLeft: 10,
    flexShrink: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  boldGreen: {
    color: '#007a33',
    fontWeight: '700',
  },
  stepsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepLast: {
    marginBottom: 0,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007a33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007a33',
    marginLeft: 6,
  },
  resendLinkDisabled: {
    color: '#9ca3af',
  },
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  backToLoginText: {
    color: '#b2e0d4',
    fontSize: 14,
  },
  backToLoginLink: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
});

export function EmailConfirmationScreen({ navigation, route }: any) {
  const { email } = route.params as { email: string };
  const { signInWithOtp } = useAuth();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to resend confirmation email');
      } else {
        Alert.alert(
          'Email Sent',
          'A new confirmation link has been sent to your email address.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <MaterialIcons name="arrow-back" size={28} color="#ffffff" />
        </TouchableOpacity>

        <ScrollView
          style={{ backgroundColor: '#007a33' }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Ionicons name="mail-outline" size={40} color="#ffffff" />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a confirmation link to verify your account
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Email address pill */}
            <View style={styles.emailRow}>
              <Ionicons name="at-circle-outline" size={20} color="#007a33" />
              <Text style={styles.emailText} numberOfLines={1}>
                {email}
              </Text>
            </View>

            <Text style={styles.instructionText}>
              We've sent a <Text style={styles.boldGreen}>confirmation link</Text> to
              this email. Click the link to activate your account and get started.
            </Text>

            {/* Steps */}
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Open the email from <Text style={{ fontWeight: '600' }}>pyvisiontech@gmail.com</Text> in your inbox
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Tap the <Text style={{ fontWeight: '600' }}>"Confirm your email"</Text> button in the email
                </Text>
              </View>
              <View style={[styles.step, styles.stepLast]}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  You'll be redirected back to the app automatically
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive it?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text style={[styles.resendLink, resending && styles.resendLinkDisabled]}>
                  {resending ? 'Sending...' : 'Resend email'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Back to login */}
          <View style={styles.backToLoginContainer}>
            <Text style={styles.backToLoginText}>Already confirmed?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.backToLoginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
