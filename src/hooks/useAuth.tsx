import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  signInWithGoogle: () => Promise<{ error: Error | null }>;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle onboarding after OAuth login
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          
          // Check if user already has an establishment
          const { data: existing } = await supabase
            .from('establishments')
            .select('id')
            .eq('owner_user_id', userId)
            .maybeSingle();

          if (!existing) {
            // Get user metadata for company name
            const metadata = session.user.user_metadata;
            const companyName = metadata?.company_name || metadata?.full_name || session.user.email?.split('@')[0] || 'Meu Estabelecimento';
            const baseSlug = generateSlug(companyName);
            const slug = `${baseSlug}-${Date.now().toString(36)}`;

            // Create establishment
            const { data: establishment } = await supabase
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

            if (establishment) {
              // Create owner member
              await supabase
                .from('establishment_members')
                .insert({
                  establishment_id: establishment.id,
                  user_id: userId,
                  role: 'owner',
                });

              // Create default business hours (Mon-Sat 9-18)
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
              // Sunday closed
              defaultHours.push({
                establishment_id: establishment.id,
                weekday: 0,
                open_time: null,
                close_time: null,
                closed: true,
              });

              await supabase.from('business_hours').insert(defaultHours);
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password, fullName, companyName }: SignUpData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    });

    if (error || !data.user) {
      return { error: error || new Error('Erro ao criar conta') };
    }

    // Create establishment for the new user
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
      return { error: estError || new Error('Erro ao criar estabelecimento') };
    }

    // Create owner member
    await supabase
      .from('establishment_members')
      .insert({
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

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
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
