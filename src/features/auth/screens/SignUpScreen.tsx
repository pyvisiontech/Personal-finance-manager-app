import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { OtpInput } from '../../../components/OtpInput';
import { GoogleIcon } from '../../../components/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#007a33', // wealthy-green-900
  },
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: '#2d2854',
    borderRadius: 20,
  },
  header: {
    marginTop: 0,
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#b2e0d4', // wealthy-green-300
    textAlign: 'left',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
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
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#6b7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#007a33', // wealthy-green-800
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
});

type SignUpStep = 'email' | 'otp';

export function SignUpScreen({ navigation }: any) {
  const [step, setStep] = useState<SignUpStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const { signInWithOtp, verifyOtp, signInWithGoogle, user } = useAuth();
  const googleSignInTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout when user successfully signs in
  useEffect(() => {
    if (user && googleSignInTimeoutRef.current) {
      clearTimeout(googleSignInTimeoutRef.current);
      googleSignInTimeoutRef.current = null;
      setLoading(false);
    }
  }, [user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (googleSignInTimeoutRef.current) {
        clearTimeout(googleSignInTimeoutRef.current);
      }
    };
  }, []);

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
      Alert.alert('Success', 'Account created successfully!');
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

  const handleGoogleSignUp = async () => {
    // Clear any existing timeout
    if (googleSignInTimeoutRef.current) {
      clearTimeout(googleSignInTimeoutRef.current);
      googleSignInTimeoutRef.current = null;
    }

    setLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setLoading(false);
        Alert.alert('Error', error.message || 'Google sign up failed');
        return;
      }

      // Set a timeout to stop loading if auth doesn't complete within 30 seconds
      googleSignInTimeoutRef.current = setTimeout(() => {
        // Only show timeout if user is still not signed in
        if (!user) {
          setLoading(false);
          Alert.alert('Timeout', 'Sign-in is taking longer than expected. Please try again.');
        }
        googleSignInTimeoutRef.current = null;
      }, 30000);

      // Auth state change will handle setting loading to false and navigation
      // The timeout will be cleared by useEffect when user signs in successfully
    } catch (error: any) {
      if (googleSignInTimeoutRef.current) {
        clearTimeout(googleSignInTimeoutRef.current);
        googleSignInTimeoutRef.current = null;
      }
      setLoading(false);
      Alert.alert('Error', error.message || 'Google sign up failed');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'otp') {
              setStep('email');
              setOtp('');
              setOtpError('');
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#4B5563" />
        </TouchableOpacity>

        <ScrollView
          style={{ backgroundColor: '#007a33' }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{step === 'email' ? 'Create your account' : 'Verify your email'}</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Sign up to get started with better money management.'
                : 'Enter the 6-digit code sent to your email.'}
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
                />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignUp}
                  disabled={loading}
                >
                  <GoogleIcon size={24} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginLink}>Sign In</Text>
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
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
