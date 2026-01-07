import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerFormSchema, CustomerFormData, formatPhone } from '@/lib/validations/booking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import type { Establishment } from '@/hooks/useEstablishment';

interface CustomerStepProps {
  establishment: Establishment;
  onSubmit: (data: CustomerFormData) => void;
  isSubmitting: boolean;
}

export function CustomerStep({ establishment, onSubmit, isSubmitting }: CustomerStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(
      establishment.require_policy_acceptance
        ? customerFormSchema.refine((data) => data.acceptPolicy === true, {
            message: 'Você precisa aceitar a política de cancelamento',
            path: ['acceptPolicy'],
          })
        : customerFormSchema
    ),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      notes: '',
      acceptPolicy: false,
    },
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue('phone', formatted);
  };

  const acceptPolicy = watch('acceptPolicy');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-lg font-semibold">Seus dados</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <Input
            id="name"
            placeholder="Seu nome"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            placeholder="(99) 99999-9999"
            {...register('phone')}
            onChange={handlePhoneChange}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        {establishment.ask_email && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        )}

        {establishment.ask_notes && (
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Alguma informação adicional?"
              rows={3}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        )}

        {establishment.require_policy_acceptance && establishment.cancellation_policy_text && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="font-medium text-sm">Política de cancelamento</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {establishment.cancellation_policy_text}
            </p>
            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptPolicy"
                checked={acceptPolicy}
                onCheckedChange={(checked) => setValue('acceptPolicy', checked === true)}
              />
              <Label htmlFor="acceptPolicy" className="text-sm font-normal cursor-pointer">
                Li e aceito a política de cancelamento
              </Label>
            </div>
            {errors.acceptPolicy && (
              <p className="text-sm text-destructive">{errors.acceptPolicy.message}</p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirmar agendamento
      </Button>
    </form>
  );
}
