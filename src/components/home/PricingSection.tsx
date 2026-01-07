import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Essencial",
    description: "Para profissionais autônomos e pequenos negócios",
    price: "49",
    period: "/mês",
    professionals: "Até 3 profissionais",
    features: [
      "Página de agendamento personalizada",
      "Agendamentos ilimitados",
      "Lembretes por WhatsApp",
      "Self-service para clientes",
      "Dashboard de métricas",
      "Suporte por email",
    ],
    cta: "Começar grátis",
    popular: false,
  },
  {
    name: "Studio",
    description: "Para estúdios e equipes em crescimento",
    price: "99",
    period: "/mês",
    professionals: "Até 10 profissionais",
    features: [
      "Tudo do plano Essencial",
      "Múltiplos estabelecimentos",
      "API para integrações",
      "Relatórios avançados",
      "Domínio personalizado",
      "Suporte prioritário",
    ],
    cta: "Começar grátis",
    popular: true,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 md:py-32">
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
            Comece grátis por 14 dias. Sem cartão de crédito.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl border p-8 transition-premium",
                plan.popular
                  ? "bg-primary text-primary-foreground border-primary shadow-strong scale-[1.02]"
                  : "bg-card border-border hover:border-foreground/20 hover:shadow-elegant"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-background text-foreground text-xs font-semibold">
                  Mais popular
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className={cn(
                  "text-body-sm",
                  plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
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

              {/* Features */}
              <ul className="space-y-3 mb-8">
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

              {/* CTA */}
              <Button
                variant={plan.popular ? "secondary" : "default"}
                size="lg"
                className="w-full"
                asChild
              >
                <Link to="/cadastro">
                  {plan.cta}
                  <ArrowRight size={16} />
                </Link>
              </Button>
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
