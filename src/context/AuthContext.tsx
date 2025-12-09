import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

// Complete the OAuth session when browser closes
WebBrowser.maybeCompleteAuthSession();

interface SignUpPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (handles OAuth redirects automatically)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'Has session:', !!session, 'User:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Log auth events for debugging
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('✅ User signed in successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }

      // Create client if it doesn't exist (for new Google signups)
      if (session?.user) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (!client) {
          const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          const nameParts = fullName.split(' ');
          await supabase.from('clients').insert({
            id: session.user.id,
            email: session.user.email,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            phone_number: session.user.user_metadata?.phone_number || '',
            currency: 'INR',
          });
        }
      }
    });

    // Handle deep links for OAuth callbacks
    const handleDeepLink = async (event: { url: string }) => {
      console.log('🔗 Deep link received:', event.url);
      
      // Only process URLs that contain a hash fragment (Supabase OAuth callback)
      if (!event.url.includes('#')) {
        console.log('⚠️ No hash fragment in URL, likely not OAuth callback. Ignoring.');
        return;
      }

      try {
        const url = event.url;
        console.log('📝 Processing OAuth deep link...');
        
        // Extract hash fragment
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) {
          console.log('⚠️ No hash fragment in deep link');
          return;
        }
        
        const hash = url.substring(hashIndex + 1);
        console.log('✅ Hash fragment found, length:', hash.length);
        
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const errorParam = params.get('error');
        
        if (errorParam) {
          console.error('❌ OAuth error in deep link:', errorParam);
          return;
        }
        
        if (accessToken && refreshToken) {
          console.log('✅ Tokens found in deep link, setting session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('❌ Error setting session from deep link:', error);
          } else if (data.session) {
            console.log('✅✅✅ Session set from deep link successfully!');
            console.log('User:', data.session.user.email);
            // Force auth state change
            await supabase.auth.getSession();
          } else {
            console.error('❌ Session data is null after setSession');
          }
        } else {
          console.log('⚠️ No tokens in deep link');
          console.log('Available params:', Array.from(params.keys()));
        }
      } catch (error) {
        console.error('❌ Error handling deep link:', error);
      }
    };

    // Listener wrapper keeps type void for React Native event subscription
    const handleDeepLinkListener = (event: { url: string }) => {
      void handleDeepLink(event);
    };

    // Listen for deep links
    const linkingSubscription = Linking.addEventListener('url', handleDeepLinkListener);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url }).catch((error) => {
          console.error('❌ Error handling initial deep link:', error);
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Create client if it doesn't exist
    if (data.user) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', data.user.id)
        .single();
      
      if (!client) {
        await supabase.from('clients').insert({
          id: data.user.id,
          email: data.user.email,
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          phone_number: data.user.user_metadata?.phone_number || '',
          currency: 'INR',
        });
      }
    }
  };

  const signUp = async ({ email, password, firstName, lastName, phoneNumber }: SignUpPayload) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        },
      },
    });
    if (error) throw error;

    // Client should be auto-created by trigger, but ensure it exists
    if (data.user) {
      await supabase.from('clients').upsert({
        id: data.user.id,
        email: data.user.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        currency: 'INR',
      });
    }
  };

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // This allows signup via OTP
      },
    });
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) return { error };

    // Create client if it doesn't exist (for new signups)
    if (data.user) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!client) {
        await supabase.from('clients').insert({
          id: data.user.id,
          email: data.user.email,
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          phone_number: data.user.user_metadata?.phone_number || '',
          currency: 'INR',
        });
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    try {
      // Create redirect URL using app scheme (must match Supabase redirect URL)
      // Redirect URL that adapts to Expo Go (exp://) and dev/prod builds (personalfinancetracker://)
      const redirectUrl = Linking.createURL('/', { scheme: 'personalfinancetracker' });
      console.log('Using redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error };
      }

      // Open the OAuth URL in browser with proper redirect handling
      if (data?.url) {
        console.log('Opening OAuth URL in browser...');
        console.log('OAuth URL:', data.url.substring(0, 100) + '...');
        console.log('Expected redirect URL:', redirectUrl);
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('📱 Browser session result:', result.type);
        const resultUrl = 'url' in result ? result.url : undefined;
        console.log('📱 Result URL:', resultUrl?.substring(0, 150) || 'No URL');

        // Handle different result types
        if (result.type === 'success' && resultUrl) {
          // Check if this is the OAuth callback
          if (resultUrl.includes('personalfinancetracker://') && resultUrl.includes('#')) {
            console.log('=== OAuth Callback Received ===');
            console.log('Callback URL:', resultUrl.substring(0, 200));
          
          // Parse tokens from callback URL and set session manually
          try {
            const callbackUrl = resultUrl;
            
            // Extract hash fragment (Supabase OAuth uses hash fragments)
            const hashIndex = callbackUrl.indexOf('#');
            if (hashIndex === -1) {
              console.error('No hash fragment found in callback URL');
              // Wait and check if Supabase processed it
              await new Promise(resolve => setTimeout(resolve, 2000));
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                console.log('Session found after waiting');
                return { error: null };
              }
              return { error: { message: 'No hash fragment in callback URL' } };
            }
            
            const hash = callbackUrl.substring(hashIndex + 1);
            console.log('Hash fragment:', hash.substring(0, 100) + '...'); // Log first 100 chars
            
            // Parse hash parameters
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const errorParam = params.get('error');
            const errorDescription = params.get('error_description');
            
            if (errorParam) {
              console.error('OAuth error:', errorParam, errorDescription);
              return { error: { message: errorDescription || errorParam } };
            }
            
            console.log('Token extraction:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              accessTokenLength: accessToken?.length || 0,
              refreshTokenLength: refreshToken?.length || 0,
            });
            
            if (accessToken && refreshToken) {
              console.log('Setting session with tokens...');
              
              // Set the session manually
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (sessionError) {
                console.error('Error setting session:', sessionError);
                return { error: sessionError };
              }
              
              if (sessionData.session) {
                console.log('✅ Session set successfully!');
                console.log('User ID:', sessionData.session.user.id);
                console.log('User email:', sessionData.session.user.email);
                
                // Force refresh to trigger auth state change
                await supabase.auth.getSession();
                return { error: null };
              } else {
                console.error('Session data is null after setSession');
                return { error: { message: 'Session was not created' } };
              }
            } else {
              console.error('❌ Tokens not found in callback URL');
              console.log('Available params:', Array.from(params.keys()));
              
              // Wait and check if Supabase processed it automatically
              console.log('Waiting for Supabase to process...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                console.log('✅ Session found via auto-processing');
                return { error: null };
              }
              
              return { error: { message: 'Could not extract tokens. Check console logs for details.' } };
            }
          } catch (parseError: any) {
            console.error('❌ Error processing OAuth callback:', parseError);
            console.error('Error details:', parseError.message, parseError.stack);
            
            // Wait and try to get session anyway
            await new Promise(resolve => setTimeout(resolve, 2000));
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('✅ Session found after error');
              return { error: null };
            }
            return { error: { message: parseError.message || 'Failed to process OAuth callback' } };
          }
          } else {
            // Callback URL doesn't match expected format - wait for deep link
            console.log('⚠️ Callback URL format unexpected, waiting for deep link...');
            console.log('Received URL:', result.url);
            await new Promise(resolve => setTimeout(resolve, 3000));
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('✅ Session found after waiting');
              return { error: null };
            }
            return { error: { message: 'OAuth callback URL format unexpected' } };
          }
        } else if (result.type === 'cancel') {
          console.log('❌ User cancelled Google sign-in');
          return { error: { message: 'Google sign-in was cancelled' } };
        } else if (result.type === 'dismiss') {
          // Browser was dismissed - OAuth callback might come via deep link
          console.log('⚠️ Browser dismissed, waiting for OAuth callback via deep link...');
          // Wait a bit for the deep link to arrive
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check if session was set via deep link
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('✅ Session found after browser dismiss (set via deep link)');
            return { error: null };
          }
          
          console.log('⚠️ No session found after browser dismiss');
          return { error: { message: 'OAuth flow did not complete. Please try again.' } };
        } else {
          console.log('⚠️ Browser result type:', result.type);
          return { error: { message: 'OAuth flow did not complete successfully' } };
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithOtp,
        verifyOtp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}