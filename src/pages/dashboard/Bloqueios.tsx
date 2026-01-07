import { useState } from 'react';
import { Plus, Trash2, CalendarOff, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUserEstablishment } from '@/hooks/useUserEstablishment';
import { useManageProfessionals } from '@/hooks/useManageProfessionals';
import { useTimeBlocks, useRecurringTimeBlocks } from '@/hooks/useTimeBlocks';
import { useToast } from '@/hooks/use-toast';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function Bloqueios() {
  const { data: establishment, isLoading: estLoading } = useUserEstablishment();
  const { professionals } = useManageProfessionals(establishment?.id);
  const { blocks, isLoading, create, isCreating, remove } = useTimeBlocks(establishment?.id);
  const { 
    blocks: recurringBlocks, 
    isLoading: recLoading, 
    create: createRecurring, 
    isCreating: isCreatingRecurring,
    update: updateRecurring,
    remove: removeRecurring 
  } = useRecurringTimeBlocks(establishment?.id);
  const { toast } = useToast();

  // Pontual form state
  const [pontualOpen, setPontualOpen] = useState(false);
  const [pontualProfessionalId, setPontualProfessionalId] = useState<string>('all');
  const [pontualDate, setPontualDate] = useState('');
  const [pontualStartTime, setPontualStartTime] = useState('');
  const [pontualEndTime, setPontualEndTime] = useState('');
  const [pontualReason, setPontualReason] = useState('');

  // Recorrente form state
  const [recorrenteOpen, setRecorrenteOpen] = useState(false);
  const [recorrenteProfessionalId, setRecorrenteProfessionalId] = useState<string>('all');
  const [recorrenteWeekday, setRecorrenteWeekday] = useState<string>('1');
  const [recorrenteStartTime, setRecorrenteStartTime] = useState('');
  const [recorrenteEndTime, setRecorrenteEndTime] = useState('');
  const [recorrenteReason, setRecorrenteReason] = useState('');

  const handleCreatePontual = async () => {
    if (!establishment?.id || !pontualDate || !pontualStartTime || !pontualEndTime) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await create({
        establishment_id: establishment.id,
        professional_id: pontualProfessionalId === 'all' ? null : pontualProfessionalId,
        start_at: `${pontualDate}T${pontualStartTime}:00`,
        end_at: `${pontualDate}T${pontualEndTime}:00`,
        reason: pontualReason || null,
      });
      toast({ title: 'Bloqueio criado com sucesso!' });
      setPontualOpen(false);
      resetPontualForm();
    } catch {
      toast({ title: 'Erro ao criar bloqueio', variant: 'destructive' });
    }
  };

  const handleCreateRecorrente = async () => {
    if (!establishment?.id || !recorrenteStartTime || !recorrenteEndTime) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      await createRecurring({
        establishment_id: establishment.id,
        professional_id: recorrenteProfessionalId === 'all' ? null : recorrenteProfessionalId,
        weekday: parseInt(recorrenteWeekday),
        start_time: recorrenteStartTime,
        end_time: recorrenteEndTime,
        reason: recorrenteReason || null,
        active: true,
      });
      toast({ title: 'Bloqueio recorrente criado com sucesso!' });
      setRecorrenteOpen(false);
      resetRecorrenteForm();
    } catch {
      toast({ title: 'Erro ao criar bloqueio recorrente', variant: 'destructive' });
    }
  };

  const handleDeletePontual = async (id: string) => {
    try {
      await remove(id);
      toast({ title: 'Bloqueio removido!' });
    } catch {
      toast({ title: 'Erro ao remover bloqueio', variant: 'destructive' });
    }
  };

  const handleDeleteRecorrente = async (id: string) => {
    try {
      await removeRecurring(id);
      toast({ title: 'Bloqueio recorrente removido!' });
    } catch {
      toast({ title: 'Erro ao remover bloqueio recorrente', variant: 'destructive' });
    }
  };

  const handleToggleRecorrenteActive = async (id: string, active: boolean) => {
    try {
      await updateRecurring({ id, active });
      toast({ title: active ? 'Bloqueio ativado!' : 'Bloqueio desativado!' });
    } catch {
      toast({ title: 'Erro ao atualizar bloqueio', variant: 'destructive' });
    }
  };

  const resetPontualForm = () => {
    setPontualProfessionalId('all');
    setPontualDate('');
    setPontualStartTime('');
    setPontualEndTime('');
    setPontualReason('');
  };

  const resetRecorrenteForm = () => {
    setRecorrenteProfessionalId('all');
    setRecorrenteWeekday('1');
    setRecorrenteStartTime('');
    setRecorrenteEndTime('');
    setRecorrenteReason('');
  };

  if (estLoading || isLoading || recLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bloqueios de Horários</h1>
        <p className="text-muted-foreground">
          Gerencie bloqueios pontuais e recorrentes para o estabelecimento ou profissionais específicos
        </p>
      </div>

      <Tabs defaultValue="pontual">
        <TabsList>
          <TabsTrigger value="pontual" className="gap-2">
            <CalendarOff className="h-4 w-4" />
            Pontuais
          </TabsTrigger>
          <TabsTrigger value="recorrente" className="gap-2">
            <Repeat className="h-4 w-4" />
            Recorrentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pontual" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bloqueios Pontuais</CardTitle>
                <CardDescription>Bloqueios para datas e horários específicos</CardDescription>
              </div>
              <Dialog open={pontualOpen} onOpenChange={setPontualOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Bloqueio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Bloqueio Pontual</DialogTitle>
                    <DialogDescription>
                      Crie um bloqueio para uma data e horário específicos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Profissional</Label>
                      <Select value={pontualProfessionalId} onValueChange={setPontualProfessionalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo o Estabelecimento</SelectItem>
                          {professionals.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input 
                        type="date" 
                        value={pontualDate} 
                        onChange={(e) => setPontualDate(e.target.value)} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Início</Label>
                        <Input 
                          type="time" 
                          value={pontualStartTime} 
                          onChange={(e) => setPontualStartTime(e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label>Fim</Label>
                        <Input 
                          type="time" 
                          value={pontualEndTime} 
                          onChange={(e) => setPontualEndTime(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Motivo (opcional)</Label>
                      <Input 
                        value={pontualReason} 
                        onChange={(e) => setPontualReason(e.target.value)} 
                        placeholder="Ex: Feriado, Reunião..." 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPontualOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreatePontual} disabled={isCreating}>
                      {isCreating ? 'Criando...' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {blocks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum bloqueio pontual cadastrado
                </p>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(block.start_at), "dd/MM/yyyy", { locale: ptBR })}
                          {' • '}
                          {format(new Date(block.start_at), 'HH:mm')} - {format(new Date(block.end_at), 'HH:mm')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {block.professionals?.name || 'Todo o Estabelecimento'}
                          {block.reason && ` • ${block.reason}`}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeletePontual(block.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recorrente" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bloqueios Recorrentes</CardTitle>
                <CardDescription>Bloqueios que se repetem toda semana</CardDescription>
              </div>
              <Dialog open={recorrenteOpen} onOpenChange={setRecorrenteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Bloqueio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Bloqueio Recorrente</DialogTitle>
                    <DialogDescription>
                      Crie um bloqueio que se repete toda semana
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Profissional</Label>
                      <Select value={recorrenteProfessionalId} onValueChange={setRecorrenteProfessionalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo o Estabelecimento</SelectItem>
                          {professionals.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Dia da Semana</Label>
                      <Select value={recorrenteWeekday} onValueChange={setRecorrenteWeekday}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Início</Label>
                        <Input 
                          type="time" 
                          value={recorrenteStartTime} 
                          onChange={(e) => setRecorrenteStartTime(e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label>Fim</Label>
                        <Input 
                          type="time" 
                          value={recorrenteEndTime} 
                          onChange={(e) => setRecorrenteEndTime(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Motivo (opcional)</Label>
                      <Input 
                        value={recorrenteReason} 
                        onChange={(e) => setRecorrenteReason(e.target.value)} 
                        placeholder="Ex: Almoço, Intervalo..." 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRecorrenteOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateRecorrente} disabled={isCreatingRecurring}>
                      {isCreatingRecurring ? 'Criando...' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {recurringBlocks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum bloqueio recorrente cadastrado
                </p>
              ) : (
                <div className="space-y-3">
                  {recurringBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Switch 
                          checked={block.active}
                          onCheckedChange={(active) => handleToggleRecorrenteActive(block.id, active)}
                        />
                        <div>
                          <p className="font-medium">
                            {WEEKDAYS[block.weekday]}
                            {' • '}
                            {block.start_time} - {block.end_time}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {block.professionals?.name || 'Todo o Estabelecimento'}
                            {block.reason && ` • ${block.reason}`}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteRecorrente(block.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
