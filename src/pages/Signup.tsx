import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signupSchema, SignupFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength } from '@/components/ui/password-strength';
import { PhoneInput } from '@/components/ui/phone-input';

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');

  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    setIsCheckingEmail(true);
    setEmailError(null);

    try {
      const { data, error } = await supabase.rpc('check_establishment_signup_allowed', {
        p_email: email,
      });

      if (error) {
        console.error('Error checking email:', error);
        // In case of RPC error, allow signup (will fail later if not authorized)
        return true;
      }

      const result = data as { allowed: boolean; reason?: string };
      
      if (!result.allowed) {
        setEmailError(result.reason || 'Email não autorizado para cadastro de estabelecimento.');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception checking email:', err);
      return true; // Allow to proceed, will fail at signup if not authorized
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    // First check if email is allowed
    const isAllowed = await checkEmailAllowed(data.email);
    if (!isAllowed) {
      return;
    }

    setIsLoading(true);
    const { error } = await signUp({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      companyName: data.companyName,
    });

    if (error) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: error.message,
      });
      return;
    }

    // Mark signup as used and create subscription
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      await supabase.rpc('use_establishment_signup', {
        p_email: data.email,
        p_owner_user_id: userData.user.id,
      });
    }

    setIsLoading(false);
    toast({
      title: 'Conta criada!',
      description: 'Seu estabelecimento foi configurado com sucesso.',
    });
    navigate('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setIsGoogleLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar com Google',
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Área do Estabelecimento
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie sua conta para gerenciar seus agendamentos
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conta de Estabelecimento</AlertTitle>
          <AlertDescription>
            Para criar uma conta de estabelecimento, é necessário ter um plano ativo.{' '}
            <Link to="/precos" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
              Ver planos <ExternalLink className="h-3 w-3" />
            </Link>
          </AlertDescription>
        </Alert>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Entrar com Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              ou continue com email
            </span>
          </div>
        </div>

        {emailError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cadastro não autorizado</AlertTitle>
            <AlertDescription>
              {emailError}{' '}
              <Link to="/precos" className="font-medium underline">
                Adquira um plano
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              {...register('fullName')}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da empresa</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Nome do seu estabelecimento"
              autoComplete="organization"
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Controller
              name="phone"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              {...register('password')}
            />
            <PasswordStrength password={password} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repita a senha"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading || isCheckingEmail}>
            {(isLoading || isCheckingEmail) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCheckingEmail ? 'Verificando...' : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Entrar
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          É cliente e quer agendar?{' '}
          <Link to="/cliente/login" className="font-medium text-primary hover:underline">
            Área do Cliente
          </Link>
        </p>
      </div>
    </div>
  );
}
