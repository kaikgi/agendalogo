import { useState } from 'react';
import { Save, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserEstablishment } from '@/hooks/useUserEstablishment';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function Configuracoes() {
  const { data: establishment, isLoading } = useUserEstablishment();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    booking_enabled: true,
    auto_confirm_bookings: true,
    reschedule_min_hours: 2,
    max_future_days: 30,
    slot_interval_minutes: 15,
  });

  // Initialize form when establishment loads
  useState(() => {
    if (establishment) {
      setForm({
        name: establishment.name || '',
        description: establishment.description || '',
        phone: establishment.phone || '',
        address: establishment.address || '',
        booking_enabled: establishment.booking_enabled,
        auto_confirm_bookings: establishment.auto_confirm_bookings,
        reschedule_min_hours: establishment.reschedule_min_hours,
        max_future_days: establishment.max_future_days,
        slot_interval_minutes: establishment.slot_interval_minutes,
      });
    }
  });

  const handleSave = async () => {
    if (!establishment) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          name: form.name,
          description: form.description || null,
          phone: form.phone || null,
          address: form.address || null,
          booking_enabled: form.booking_enabled,
          auto_confirm_bookings: form.auto_confirm_bookings,
          reschedule_min_hours: form.reschedule_min_hours,
          max_future_days: form.max_future_days,
          slot_interval_minutes: form.slot_interval_minutes,
        })
        .eq('id', establishment.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user-establishment'] });
      toast({ title: 'Configurações salvas!' });
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!establishment) return;
    const link = `${window.location.origin}/${establishment.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Estabelecimento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do seu estabelecimento
        </p>
      </div>

      {/* Public Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Link Público</CardTitle>
          <CardDescription>
            Compartilhe este link para seus clientes agendarem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/${establishment.slug}`}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Estabelecimento</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve descrição do seu negócio"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Agendamento Online</Label>
              <p className="text-sm text-muted-foreground">
                Permitir que clientes agendem pelo link público
              </p>
            </div>
            <Switch
              checked={form.booking_enabled}
              onCheckedChange={(checked) => setForm({ ...form, booking_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Confirmação Automática</Label>
              <p className="text-sm text-muted-foreground">
                Confirmar agendamentos automaticamente
              </p>
            </div>
            <Switch
              checked={form.auto_confirm_bookings}
              onCheckedChange={(checked) => setForm({ ...form, auto_confirm_bookings: checked })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule">Antecedência mínima (horas)</Label>
              <Input
                id="reschedule"
                type="number"
                min={0}
                value={form.reschedule_min_hours}
                onChange={(e) => setForm({ ...form, reschedule_min_hours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="future">Dias no futuro</Label>
              <Input
                id="future"
                type="number"
                min={1}
                value={form.max_future_days}
                onChange={(e) => setForm({ ...form, max_future_days: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Intervalo (minutos)</Label>
              <Input
                id="interval"
                type="number"
                min={5}
                step={5}
                value={form.slot_interval_minutes}
                onChange={(e) => setForm({ ...form, slot_interval_minutes: parseInt(e.target.value) || 15 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
}
