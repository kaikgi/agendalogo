import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSubscription, getPlanDisplayInfo } from '@/hooks/useSubscription';
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';
import { useUserEstablishment } from '@/hooks/useUserEstablishment';
import { usePlans, formatPriceBRL } from '@/hooks/usePlans';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionStatusBadge } from '@/components/billing/SubscriptionStatusBadge';
import { UsageBadge } from '@/components/dashboard/UsageBadge';
import { getKiwifyCheckoutUrl } from '@/lib/kiwifyCheckout';
import { 
  CreditCard, 
  Users, 
  Calendar, 
  Building2, 
  ExternalLink,
  CheckCircle2,
  Crown,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Assinatura() {
  const { user } = useAuth();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: establishment, isLoading: establishmentLoading } = useUserEstablishment();
  const { data: usage, isLoading: usageLoading } = useSubscriptionUsage(establishment?.id);
  const { data: plans, isLoading: plansLoading } = usePlans();

  const isLoading = subscriptionLoading || establishmentLoading || usageLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const currentPlanCode = subscription?.plan_code || 'basic';
  const planInfo = getPlanDisplayInfo(currentPlanCode);
  const currentPlan = plans?.find(p => p.code === currentPlanCode);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano e faturamento</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Seu Plano
              </CardTitle>
              {subscription && (
                <SubscriptionStatusBadge status={subscription.status} />
              )}
            </div>
            <CardDescription>
              {subscription 
                ? `Renovação em ${format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                : 'Você está no plano gratuito'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className={planInfo.bgColor + ' ' + planInfo.color + ' text-lg px-3 py-1'}>
                  {planInfo.name}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  R$ {currentPlan ? formatPriceBRL(currentPlan.price_cents) : '0,00'}
                </div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </div>
            </div>

            {/* Plan Features */}
            {currentPlan && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {currentPlan.max_professionals === 1 
                      ? '1 profissional' 
                      : `Até ${currentPlan.max_professionals} profissionais`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {currentPlan.max_appointments_month 
                      ? `${currentPlan.max_appointments_month} agendamentos/mês`
                      : 'Agendamentos ilimitados'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {currentPlan.allow_multi_establishments 
                      ? 'Múltiplos estabelecimentos'
                      : '1 estabelecimento'}
                  </span>
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" asChild>
              <a href="https://dashboard.kiwify.com.br" target="_blank" rel="noopener noreferrer">
                <CreditCard className="mr-2 h-4 w-4" />
                Gerenciar Pagamento
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Uso do Plano
            </CardTitle>
            <CardDescription>
              Acompanhe o uso dos recursos do seu plano
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usage && (
              <>
                <UsageBadge
                  current={usage.current_professionals || 0}
                  max={usage.max_professionals || 1}
                  label="Profissionais"
                />
                <UsageBadge
                  current={usage.current_appointments_month || 0}
                  max={usage.max_appointments_month || 50}
                  label="Agendamentos este mês"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Plans */}
      {currentPlanCode !== 'studio' && (
        <Card>
          <CardHeader>
            <CardTitle>Fazer Upgrade</CardTitle>
            <CardDescription>
              Desbloqueie mais recursos para o seu negócio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {plans?.filter(p => p.code !== currentPlanCode).map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-lg ${plan.popular ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="mb-2 bg-primary">Mais popular</Badge>
                  )}
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-1 mb-3">
                    <span className="text-2xl font-bold">R$ {formatPriceBRL(plan.price_cents)}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-1 text-sm mb-4">
                    {(plan.features as string[])?.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.popular ? 'default' : 'outline'} 
                    className="w-full"
                    asChild
                  >
                    <a 
                      href={getKiwifyCheckoutUrl(plan.code, user?.id, user?.email || undefined)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Assinar {plan.name}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
