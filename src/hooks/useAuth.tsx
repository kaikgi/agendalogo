import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getOAuthRedirectUrl } from '@/lib/publicUrl';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSessionChecked = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only synchronous state updates here
      setSession(session);
      setUser(session?.user ?? null);

      // Avoid flipping loading=false before we've processed the initial session.
      if (initialSessionChecked.current) {
        setLoading(false);
      }

      // IMPORTANT: DO NOT automatically create establishments here.
      // Establishments should ONLY be created when a user explicitly signs up
      // as an establishment owner AND has a valid entry in allowed_establishment_signups.
      // This prevents clients from becoming establishments automatically.
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        initialSessionChecked.current = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        initialSessionChecked.current = true;
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign up for ESTABLISHMENT owners only.
   * This function should only be called from the establishment signup page
   * after verifying the email is in allowed_establishment_signups.
   */
  const signUp = async ({ email, password, fullName, companyName }: SignUpData) => {
    // First, verify this email is allowed to create an establishment
    const { data: checkData, error: checkError } = await supabase.rpc('check_establishment_signup_allowed', {
      p_email: email,
    });

    if (checkError) {
      console.error('Error checking establishment signup allowed:', checkError);
      return { error: new Error('Erro ao verificar autorização. Tente novamente.') };
    }

    const checkResult = checkData as { allowed: boolean; reason?: string };
    if (!checkResult.allowed) {
      return { error: new Error(checkResult.reason || 'Email não autorizado para cadastro de estabelecimento.') };
    }

    // Create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getOAuthRedirectUrl('/dashboard'),
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    });

    if (error || !data.user) {
      return { error: error || new Error('Erro ao criar conta') };
    }

    // Now create the establishment for this user
    const userId = data.user.id;
    const baseSlug = generateSlug(companyName);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .insert({
        owner_user_id: userId,
        name: companyName,
        slug,
        booking_enabled: true,
        reschedule_min_hours: 2,
        max_future_days: 30,
        slot_interval_minutes: 15,
        buffer_minutes: 0,
        auto_confirm_bookings: true,
        ask_email: false,
        ask_notes: true,
        require_policy_acceptance: true,
      })
      .select('id')
      .single();

    if (estError || !establishment) {
      console.error('Error creating establishment:', estError);
      return { error: estError || new Error('Erro ao criar estabelecimento') };
    }

    // Create owner member
    await supabase.from('establishment_members').insert({
      establishment_id: establishment.id,
      user_id: userId,
      role: 'owner',
    });

    // Create default business hours
    const defaultHours = [];
    for (let weekday = 1; weekday <= 6; weekday++) {
      defaultHours.push({
        establishment_id: establishment.id,
        weekday,
        open_time: '09:00',
        close_time: '18:00',
        closed: false,
      });
    }
    defaultHours.push({
      establishment_id: establishment.id,
      weekday: 0,
      open_time: null,
      close_time: null,
      closed: true,
    });

    await supabase.from('business_hours').insert(defaultHours);

    // Mark the signup as used
    await supabase.rpc('use_establishment_signup', {
      p_email: email,
      p_owner_user_id: userId,
    });

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async (redirectPath: string = '/dashboard') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(redirectPath),
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getOAuthRedirectUrl('/resetar-senha'),
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword }}>
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
