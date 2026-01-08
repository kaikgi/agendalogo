import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Calendar, Clock, User, Briefcase, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface BookingSuccessProps {
  serviceName: string;
  professionalName: string;
  date: Date;
  time: string;
  establishmentName: string;
  manageUrl?: string | null;
}

export function BookingSuccess({
  serviceName,
  professionalName,
  date,
  time,
  establishmentName,
  manageUrl,
}: BookingSuccessProps) {
  const { toast } = useToast();

  const handleCopyManageLink = async () => {
    if (!manageUrl) return;
    await navigator.clipboard.writeText(manageUrl);
    toast({ title: 'Link copiado!' });
  };

  return (
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Agendamento confirmado!</h2>
        <p className="text-muted-foreground mt-2">Seu horário em {establishmentName} foi reservado.</p>
      </div>

      <div className="bg-muted rounded-lg p-6 text-left space-y-4 max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
          <span>{serviceName}</span>
        </div>
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-muted-foreground" />
          <span>{professionalName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span>{format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span>{time}</span>
        </div>
      </div>

      {manageUrl ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Seu link para gerenciar este agendamento:</p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <Button type="button" variant="outline" className="flex-1 justify-start truncate" asChild>
              <a href={manageUrl}>{manageUrl}</a>
            </Button>
            <Button type="button" variant="outline" onClick={handleCopyManageLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Você pode gerenciar seu agendamento pelo link enviado.</p>
      )}

      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
