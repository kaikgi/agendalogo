import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEstablishment } from '@/hooks/useEstablishment';
import { useServices, type Service } from '@/hooks/useServices';
import { useProfessionalsByService, type Professional } from '@/hooks/useProfessionals';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { StepIndicator } from '@/components/booking/StepIndicator';
import { ServiceStep } from '@/components/booking/ServiceStep';
import { ProfessionalStep } from '@/components/booking/ProfessionalStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { CustomerStep } from '@/components/booking/CustomerStep';
import { BookingSuccess } from '@/components/booking/BookingSuccess';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { CustomerFormData } from '@/lib/validations/booking';

const STEPS = ['Serviço', 'Profissional', 'Data/Hora', 'Dados'];

type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Erro desconhecido.';
  const e = err as SupabaseLikeError;
  const parts = [e.message, e.details, e.hint, e.code].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Erro desconhecido.';
}

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [manageToken, setManageToken] = useState<string | null>(null);

  const {
    data: establishment,
    isLoading: isLoadingEstablishment,
    error: establishmentError,
  } = useEstablishment(slug);
  const { data: services = [] } = useServices(establishment?.id);
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useProfessionalsByService(
    selectedService?.id
  );
  const { data: availableSlots = [], isLoading: isLoadingSlots } = useAvailableSlots({
    establishmentId: establishment?.id,
    professionalId: selectedProfessional?.id,
    serviceDurationMinutes: selectedService?.duration_minutes ?? 30,
    date: selectedDate,
    slotIntervalMinutes: establishment?.slot_interval_minutes ?? 15,
    bufferMinutes: establishment?.buffer_minutes ?? 0,
  });

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedProfessional(null);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setCurrentStep(1);
  };

  const handleProfessionalSelect = (professional: Professional) => {
    setSelectedProfessional(professional);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setCurrentStep(2);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const hashToken = async (token: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (customerData: CustomerFormData) => {
    console.log('submit clicked', {
      slug,
      customerData,
      selectedServiceId: selectedService?.id,
      selectedProfessionalId: selectedProfessional?.id,
      selectedDate,
      selectedTime,
    });

    if (isSubmitting) return;

    if (!establishment || !selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Escolha serviço, profissional, data/hora e preencha seus dados.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Derive start/end
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startAt = new Date(selectedDate);
      startAt.setHours(hours, minutes, 0, 0);

      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + selectedService.duration_minutes);

      const startIso = startAt.toISOString();
      const endIso = endAt.toISOString();

      // 2) Create or find customer
      const { data: existingCustomer, error: existingCustomerError } = await supabase
        .from('customers')
        .select('id')
        .eq('establishment_id', establishment.id)
        .eq('phone', customerData.phone)
        .maybeSingle();

      if (existingCustomerError) {
        console.log('customers select error', existingCustomerError);
        throw new Error(`Erro ao consultar cliente: ${formatSupabaseError(existingCustomerError)}`);
      }

      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;

        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            email: customerData.email || null,
          })
          .eq('id', customerId);

        if (updateError) {
          console.log('customers update error', updateError);
          // não bloqueia o agendamento
        }
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            establishment_id: establishment.id,
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email || null,
          })
          .select('id')
          .single();

        if (customerError) {
          console.log('customers insert error', customerError);
          throw new Error(`Erro ao criar cliente: ${formatSupabaseError(customerError)}`);
        }

        customerId = newCustomer.id;
      }

      // 3) Re-check availability (avoid race conditions)
      const { data: overlappingAppointments, error: overlapAppointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('establishment_id', establishment.id)
        .eq('professional_id', selectedProfessional.id)
        .in('status', ['booked', 'confirmed'])
        .lt('start_at', endIso)
        .gt('end_at', startIso)
        .limit(1);

      if (overlapAppointmentsError) {
        console.log('appointments overlap check error', overlapAppointmentsError);
        throw new Error(`Erro ao checar disponibilidade: ${formatSupabaseError(overlapAppointmentsError)}`);
      }

      if (overlappingAppointments && overlappingAppointments.length > 0) {
        throw new Error('Este horário acabou de ser reservado. Escolha outro horário.');
      }

      const { data: overlappingBlocks, error: overlapBlocksError } = await supabase
        .from('time_blocks')
        .select('id')
        .eq('establishment_id', establishment.id)
        .or(`professional_id.is.null,professional_id.eq.${selectedProfessional.id}`)
        .lt('start_at', endIso)
        .gt('end_at', startIso)
        .limit(1);

      if (overlapBlocksError) {
        console.log('time_blocks overlap check error', overlapBlocksError);
        throw new Error(`Erro ao checar bloqueios: ${formatSupabaseError(overlapBlocksError)}`);
      }

      if (overlappingBlocks && overlappingBlocks.length > 0) {
        throw new Error('Este horário está bloqueado. Escolha outro horário.');
      }

      // 4) Create appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          establishment_id: establishment.id,
          professional_id: selectedProfessional.id,
          service_id: selectedService.id,
          customer_id: customerId,
          start_at: startIso,
          end_at: endIso,
          status: establishment.auto_confirm_bookings ? 'confirmed' : 'booked',
          customer_notes: customerData.notes || null,
        })
        .select('id')
        .single();

      if (appointmentError) {
        console.log('appointments insert error', appointmentError);
        throw new Error(`Erro ao criar agendamento: ${formatSupabaseError(appointmentError)}`);
      }

      // 5) Generate management token
      const token = generateToken();
      const tokenHash = await hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: tokenError } = await supabase.from('appointment_manage_tokens').insert({
        appointment_id: newAppointment.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

      if (tokenError) {
        console.log('appointment_manage_tokens insert error', tokenError);
        // não bloqueia confirmação (agendamento já existe)
      }

      setManageToken(token);
      setIsSuccess(true);
    } catch (error) {
      console.log('Booking error (raw):', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível concluir o agendamento. Tente novamente.';
      toast({
        variant: 'destructive',
        title: 'Erro ao agendar',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEstablishment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (establishmentError || !establishment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Estabelecimento não encontrado</h1>
        <p className="text-muted-foreground mb-6">
          O link pode estar incorreto ou o agendamento está desativado.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess && selectedService && selectedProfessional && selectedDate && selectedTime) {
    const manageUrl = manageToken
      ? `${window.location.origin}/${establishment.slug}/gerenciar/${manageToken}`
      : null;

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-lg mx-auto px-4 py-8">
          <BookingSuccess
            serviceName={selectedService.name}
            professionalName={selectedProfessional.name}
            date={selectedDate}
            time={selectedTime}
            establishmentName={establishment.name}
            manageUrl={manageUrl}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {establishment.logo_url && (
              <img
                src={establishment.logo_url}
                alt={establishment.name}
                className="w-10 h-10 rounded-full object-cover"
                loading="lazy"
              />
            )}
            <div>
              <h1 className="font-bold">{establishment.name}</h1>
              <p className="text-sm text-muted-foreground">Agendamento online</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6">
        <StepIndicator currentStep={currentStep} steps={STEPS} />

        {currentStep > 0 && (
          <Button variant="ghost" size="sm" className="mb-4" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}

        {currentStep === 0 && (
          <ServiceStep
            services={services}
            selectedServiceId={selectedService?.id ?? null}
            onSelect={handleServiceSelect}
          />
        )}

        {currentStep === 1 && (
          <ProfessionalStep
            professionals={professionals}
            selectedProfessionalId={selectedProfessional?.id ?? null}
            onSelect={handleProfessionalSelect}
            isLoading={isLoadingProfessionals}
          />
        )}

        {currentStep === 2 && (
          <DateTimeStep
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={handleDateSelect}
            onSelectTime={handleTimeSelect}
            availableSlots={availableSlots}
            isLoadingSlots={isLoadingSlots}
            maxFutureDays={establishment.max_future_days}
          />
        )}

        {currentStep === 3 && (
          <CustomerStep establishment={establishment} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )}
      </main>
    </div>
  );
}
