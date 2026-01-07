import { 
  Calendar, 
  Clock, 
  Users, 
  Bell, 
  Shield, 
  Smartphone,
  BarChart3,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agendamento inteligente",
    description: "Página de agendamento personalizada com seu domínio. Seus clientes agendam 24/7 sem você precisar atender.",
  },
  {
    icon: Clock,
    title: "Gestão de horários",
    description: "Configure horários de funcionamento, bloqueios e capacidade por profissional de forma flexível.",
  },
  {
    icon: Users,
    title: "Multi-profissionais",
    description: "Gerencie toda sua equipe em um só lugar. Cada profissional com seus próprios serviços e disponibilidade.",
  },
  {
    icon: Bell,
    title: "Lembretes automáticos",
    description: "Reduza faltas com lembretes via WhatsApp. Confirmação e cancelamento com um clique.",
  },
  {
    icon: Shield,
    title: "Self-service seguro",
    description: "Clientes podem remarcar ou cancelar pelo link privado, respeitando suas regras de antecedência.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    description: "Interface otimizada para dispositivos móveis. Seus clientes agendam em segundos.",
  },
  {
    icon: BarChart3,
    title: "Métricas em tempo real",
    description: "Dashboard com insights sobre agendamentos, cancelamentos e serviços mais populares.",
  },
  {
    icon: Zap,
    title: "Setup instantâneo",
    description: "Configure seu estabelecimento em minutos e comece a receber agendamentos hoje.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 bg-secondary/30">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
          <p className="text-label text-muted-foreground uppercase tracking-wider mb-4">
            Recursos
          </p>
          <h2 className="text-display-md md:text-display-lg text-balance mb-6">
            Tudo que você precisa para gerenciar agendamentos
          </h2>
          <p className="text-body-lg text-muted-foreground">
            Ferramentas poderosas e simples de usar, criadas para profissionais 
            que querem focar no que importa.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-foreground/20 hover:shadow-elegant transition-premium"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center mb-5 transition-premium">
                <feature.icon size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-body-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
