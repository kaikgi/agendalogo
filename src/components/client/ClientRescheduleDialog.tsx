import { useState, useMemo } from 'react';
import { format, addDays, addMinutes, startOfDay, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { useClientReschedule } from '@/hooks/useClientReschedule';
import { cn } from '@/lib/utils';
import type { ClientAppointment } from '@/hooks/useClientAppointments';

interface ClientRescheduleDialogProps {
  appointment: ClientAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClientRescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: ClientRescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const rescheduleMutation = useClientReschedule();

  // Reset state when dialog opens with new appointment
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && appointment) {
      // Set default date to current appointment date if in the future
      const appointmentDate = new Date(appointment.start_at);
      if (isAfter(appointmentDate, new Date())) {
        setSelectedDate(startOfDay(appointmentDate));
      } else {
        setSelectedDate(startOfDay(addDays(new Date(), 1)));
      }
      setSelectedTime(undefined);
    } else {
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    }
    onOpenChange(isOpen);
  };

  // Fetch available slots based on appointment data
  // Using default values for slotIntervalMinutes and bufferMinutes since we don't have establishment settings
  const { data: availableSlots = [], isLoading: slotsLoading } = useAvailableSlots({
    establishmentId: appointment?.establishment.id,
    professionalId: appointment?.professional.id,
    serviceDurationMinutes: appointment?.service.duration_minutes || 30,
    date: selectedDate,
    slotIntervalMinutes: 15,
    bufferMinutes: 0,
  });

  // Date limits
  const minDate = addDays(new Date(), 1);
  const maxDate = addDays(new Date(), 30);

  const disabledDays = (date: Date) => {
    return isBefore(date, minDate) || isAfter(date, maxDate);
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) return;

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newStartAt = new Date(selectedDate);
      newStartAt.setHours(hours, minutes, 0, 0);

      const newEndAt = addMinutes(newStartAt, appointment.service.duration_minutes);

      await rescheduleMutation.mutateAsync({
        appointmentId: appointment.id,
        newStartAt: newStartAt.toISOString(),
        newEndAt: newEndAt.toISOString(),
      });

      toast({
        title: 'Agendamento reagendado!',
        description: `Novo horário: ${format(newStartAt, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reagendar',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
      });
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reagendar Agendamento
          </DialogTitle>
          <DialogDescription>
            Escolha uma nova data e horário para o serviço "{appointment.service.name}" com{' '}
            {appointment.professional.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Current appointment info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span>Horário atual</span>
            </div>
            <p className="font-medium">
              {format(new Date(appointment.start_at), "EEEE, dd 'de' MMMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>

          {/* Date selection */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(undefined);
                }}
                disabled={disabledDays}
                locale={ptBR}
                className="rounded-md border pointer-events-auto"
                classNames={{
                  months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                  month: 'space-y-4',
                  nav_button: cn(
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
                  ),
                }}
              />
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="mt-4 flex-1 min-h-0">
                <h4 className="text-sm font-medium mb-2">Horários disponíveis</h4>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum horário disponível nesta data.
                  </p>
                ) : (
                  <ScrollArea className="h-[120px]">
                    <div className="grid grid-cols-4 gap-2 pr-4">
                      {availableSlots.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant={selectedTime === time ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={rescheduleMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Confirmar Reagendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
