import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, User, Phone, Mail, Calendar, ChevronRight } from 'lucide-react';
import { useUserEstablishment } from '@/hooks/useUserEstablishment';
import { useCustomers, useCustomerWithAppointments } from '@/hooks/useCustomers';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusLabels: Record<string, string> = {
  booked: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  canceled: 'Cancelado',
  no_show: 'Não compareceu',
};

const statusColors: Record<string, string> = {
  booked: 'bg-blue-500',
  confirmed: 'bg-green-500',
  completed: 'bg-gray-500',
  canceled: 'bg-red-500',
  no_show: 'bg-orange-500',
};

export default function Clientes() {
  const { data: establishment } = useUserEstablishment();
  const { data: customers, isLoading } = useCustomers(establishment?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { data: selectedCustomer } = useCustomerWithAppointments(selectedCustomerId ?? undefined);

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (cents: number | null) => {
    if (cents === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Visualize seus clientes e histórico de agendamentos
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-muted-foreground">Carregando clientes...</p>
          </CardContent>
        </Card>
      ) : !filteredCustomers?.length ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-muted-foreground">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {customer.email}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(customer.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Cliente desde {format(new Date(selectedCustomer.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico de Agendamentos ({selectedCustomer.appointments.length})
                </h3>

                {selectedCustomer.appointments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum agendamento encontrado.</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {selectedCustomer.appointments.map((appointment) => (
                        <Card key={appointment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {appointment.service?.name || 'Serviço removido'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(appointment.start_at), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  com {appointment.professional?.name || 'Profissional removido'}
                                </p>
                                {appointment.customer_notes && (
                                  <p className="text-sm text-muted-foreground italic mt-2">
                                    "{appointment.customer_notes}"
                                  </p>
                                )}
                              </div>
                              <div className="text-right space-y-2">
                                <Badge className={`${statusColors[appointment.status]} text-white`}>
                                  {statusLabels[appointment.status]}
                                </Badge>
                                {appointment.service?.price_cents && (
                                  <p className="text-sm font-medium">
                                    {formatPrice(appointment.service.price_cents)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
