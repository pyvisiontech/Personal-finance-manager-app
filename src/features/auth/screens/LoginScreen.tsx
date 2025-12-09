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
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { OtpInput } from '../../../components/OtpInput';
import { GoogleIcon } from '../../../components/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5dc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  otpContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emailDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendText: {
    color: '#6b7280',
    fontSize: 14,
  },
  resendLink: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 50,
    marginTop: 12,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signUpText: {
    color: '#4B5563',
    fontSize: 14,
  },
  signUpLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

type LoginStep = 'email' | 'otp';

export function LoginScreen({ navigation }: any) {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const { signInWithOtp, verifyOtp, signInWithGoogle } = useAuth();

  const handleContinue = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to send verification code');
        return;
      }
      setStep('otp');
      Alert.alert('Success', 'Verification code sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpComplete = async (code: string) => {
    setOtp(code);
    setOtpError('');
    setLoading(true);

    try {
      const { error } = await verifyOtp(email, code);
      if (error) {
        setOtpError('Invalid code. Please try again.');
        setOtp('');
        return;
      }
      // Success - navigation will be handled by auth state change
    } catch (error: any) {
      setOtpError(error.message || 'Verification failed. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setOtpError('');
    setLoading(true);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to resend code');
      } else {
        Alert.alert('Success', 'Verification code resent to your email');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setLoading(false);
        Alert.alert('Error', error.message || 'Google sign in failed');
        return;
      }
      
      // Set a timeout to stop loading if auth doesn't complete within 30 seconds
      const timeoutId = setTimeout(() => {
        setLoading(false);
        Alert.alert('Timeout', 'Sign-in is taking longer than expected. Please try again.');
      }, 30000);
      
      // Clear timeout when component unmounts or auth completes
      // (Auth state change will handle setting loading to false)
      return () => clearTimeout(timeoutId);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Google sign in failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Finance Tracker</Text>
          <Text style={styles.subtitle}>
            Take control of your finances and achieve your financial goals with
            our powerful money management tools.
          </Text>

          <View style={styles.featureContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>💰</Text>
              </View>
              <Text style={styles.featureText}>Track Expenses</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📈</Text>
              </View>
              <Text style={styles.featureText}>Monitor Budgets</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🎯</Text>
              </View>
              <Text style={styles.featureText}>Reach Goals</Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#2C3E50',
              marginTop: 40,
              marginBottom: 20,
            }}
          >
            {step === 'email' ? 'Sign in to continue' : 'Verify your email'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {step === 'email' ? (
            <>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
                editable={!loading}
              />

              <Button
                title={loading ? 'Sending...' : 'Continue'}
                onPress={handleContinue}
                disabled={loading}
                loading={loading}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon size={24} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.emailDisplay}>{email}</Text>
              <View style={styles.otpContainer}>
                <Text style={styles.otpTitle}>Enter Verification Code</Text>
                <Text style={styles.otpSubtitle}>
                  We sent a 8-digit code to your email
                </Text>
                <OtpInput
                  length={8}
                  onComplete={handleOtpComplete}
                  error={otpError}
                />
              </View>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                  <Text style={styles.resendLink}>Resend</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setStep('email');
                  setOtp('');
                  setOtpError('');
                }}
                style={{ marginTop: 16 }}
              >
                <Text
                  style={{
                    color: '#3B82F6',
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Change Email
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
