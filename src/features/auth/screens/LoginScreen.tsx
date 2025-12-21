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
    backgroundColor: '#007a33', // wealthy-green-900
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#b2e0d4', // wealthy-green-300
    marginBottom: 24,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
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
    color: '#007a33', // wealthy-green-800
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
    color: '#007a33', // wealthy-green-800
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
    backgroundColor: '#f7f7fb',
    borderWidth: 1,
    borderColor: '#e4e4ef',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 54,
    marginTop: 8,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signUpText: {
    color: '#6b7280',
    fontSize: 14,
  },
  signUpLink: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
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
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (timeoutId) clearTimeout(timeoutId);
        setLoading(false);
        Alert.alert('Error', error.message || 'Google sign in failed');
        return;
      }

      // Set a timeout to stop loading if auth doesn't complete within 30 seconds
      timeoutId = setTimeout(() => {
        setLoading(false);
        Alert.alert('Timeout', 'Sign-in is taking longer than expected. Please try again.');
      }, 30000);

      // Auth state change will handle setting loading to false and navigation
      // The timeout will be cleared when component unmounts (which happens after successful auth)
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
      Alert.alert('Error', error.message || 'Google sign in failed');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#007a33' }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ backgroundColor: '#007a33' }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{step === 'email' ? 'Welcome Back' : 'Check your inbox'}</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Sign in to keep tracking your spending and goals.'
                : 'Enter the 6-digit code we just sent to your email.'}
            </Text>
          </View>

          <View style={[styles.formContainer, styles.formCard]}>
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
                    We sent a 6-digit code to your email
                  </Text>
                  <OtpInput
                    length={6}
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
                      color: '#007a33', // wealthy-green-800
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
    </View>
  );
}
