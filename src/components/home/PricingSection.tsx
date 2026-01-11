import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Básico",
    description: "Para profissionais autônomos",
    price: "19,90",
    period: "/mês",
    professionals: "1 profissional",
    features: [
      "50 agendamentos/mês",
      "Página de agendamento personalizada",
      "Lembretes por E-mail",
      "Self-service para clientes",
      "Dashboard de métricas",
      "Suporte por E-mail",
    ],
    cta: "Escolher plano",
    popular: false,
    planCode: "basic",
  },
  {
    name: "Essencial",
    description: "Para pequenos negócios",
    price: "49,90",
    period: "/mês",
    professionals: "Até 3 profissionais",
    features: [
      "120 agendamentos/mês",
      "Tudo do plano Básico",
      "Múltiplos profissionais",
      "Gestão de equipe",
    ],
    cta: "Escolher plano",
    popular: false,
    planCode: "essential",
  },
  {
    name: "Studio",
    description: "Para estúdios e equipes em crescimento",
    price: "99,90",
    period: "/mês",
    professionals: "Até 10 profissionais",
    features: [
      "Agendamentos ilimitados",
      "Tudo do plano Essencial",
      "Múltiplos estabelecimentos",
      "Relatórios avançados",
      "Domínio personalizado",
      "Suporte prioritário",
    ],
    cta: "Escolher plano",
    popular: true,
    planCode: "studio",
  },
];

export function PricingSection() {
  return (
    <section id="precos" className="py-24 md:py-32">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-label text-muted-foreground uppercase tracking-wider mb-4">
            Preços
          </p>
          <h2 className="text-display-md md:text-display-lg text-balance mb-6">
            Planos simples, sem surpresas
          </h2>
          <p className="text-body-lg text-muted-foreground">
            Assine e comece a usar imediatamente.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl border p-6 transition-premium flex flex-col h-full",
                plan.popular
                  ? "bg-primary text-primary-foreground border-primary shadow-strong"
                  : "bg-card border-border hover:border-foreground/20 hover:shadow-elegant"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-background text-foreground text-xs font-semibold whitespace-nowrap z-10">
                  Mais popular
                </div>
              )}

              {/* Plan header - fixed height */}
              <div className="min-h-[72px]">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className={cn(
                  "text-body-sm",
                  plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {plan.description}
                </p>
              </div>

              {/* Price - fixed height */}
              <div className="min-h-[80px] mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">R$</span>
                  <span className="text-display-md">{plan.price}</span>
                  <span className={cn(
                    "text-body-sm",
                    plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {plan.period}
                  </span>
                </div>
                <p className={cn(
                  "text-body-sm mt-1",
                  plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {plan.professionals}
                </p>
              </div>

              {/* Features - flex-1 to push button down */}
              <ul className="flex-1 space-y-3 mt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-body-sm">
                    <Check 
                      size={18} 
                      className={cn(
                        "mt-0.5 shrink-0",
                        plan.popular ? "text-primary-foreground" : "text-foreground"
                      )} 
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA - always at bottom */}
              <div className="mt-auto pt-6">
                <Button
                  variant={plan.popular ? "secondary" : "default"}
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <Link to={`/cadastro?plano=${plan.planCode}`}>
                    {plan.cta}
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="text-center mt-12">
          <p className="text-body-md text-muted-foreground">
            Precisa de mais?{" "}
            <Link to="/contato" className="text-foreground font-medium animate-underline">
              Fale com nosso time
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
