import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, CalendarDays, List, LogOut, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProfessionalPortalAuth, useProfessionalPortalAppointments } from '@/hooks/useProfessionalPortal';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  no_show: 'bg-red-100 text-red-800 border-red-200',
  canceled: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels: Record<string, string> = {
  booked: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
  canceled: 'Cancelado',
};

type ViewMode = 'week' | 'list';

export default function ProfessionalPortalAgenda() {
  const { establishmentSlug, professionalSlug } = useParams<{
    establishmentSlug: string;
    professionalSlug: string;
  }>();
  const navigate = useNavigate();
  
  const { token, session, isLoading: authLoading, isAuthenticated, logout } = useProfessionalPortalAuth();
  
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: appointments, isLoading: appointmentsLoading } = useProfessionalPortalAppointments(
    token,
    weekStart,
    weekEnd
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/${establishmentSlug}/p/${professionalSlug}`, { replace: true });
    }
  }, [authLoading, isAuthenticated, establishmentSlug, professionalSlug, navigate]);

  const handleLogout = () => {
    logout();
    navigate(`/${establishmentSlug}/p/${professionalSlug}`, { replace: true });
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments?.filter((apt) => isSameDay(parseISO(apt.start_at), date)) || [];
  };

  const getFilteredAppointments = () => {
    return (appointments || []).sort((a, b) => 
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
              <div className="hidden sm:block">
                <h1 className="font-semibold">{session.professional_name}</h1>
                <p className="text-sm text-muted-foreground">{session.establishment_name}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Minha Agenda</h2>
              <p className="text-muted-foreground">
                Visualize seus agendamentos
              </p>
            </div>

            <div className="flex items-center gap-4">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                <ToggleGroupItem value="week" aria-label="Visualização semanal">
                  <CalendarDays className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="Visualização em lista">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentWeek(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Week Range Display */}
          <div className="text-center text-lg font-medium">
            {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(weekEnd, "d 'de' MMMM, yyyy", { locale: ptBR })}
          </div>

          {/* Appointments View */}
          {appointmentsLoading ? (
            viewMode === 'week' ? (
              <div className="grid gap-4 md:grid-cols-7">
                {days.map((day) => (
                  <Skeleton key={day.toISOString()} className="h-64" />
                ))}
              </div>
            ) : (
              <Skeleton className="h-96" />
            )
          ) : viewMode === 'week' ? (
            /* Week View */
            <div className="grid gap-4 md:grid-cols-7">
              {days.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                
                return (
                  <Card
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[200px]",
                      isToday(day) && "ring-2 ring-primary"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className={cn(
                        "text-center text-sm",
                        isToday(day) && "text-primary"
                      )}>
                        <span className="block text-xs text-muted-foreground uppercase">
                          {format(day, 'EEE', { locale: ptBR })}
                        </span>
                        <span className={cn(
                          "text-lg",
                          isToday(day) && "bg-primary text-primary-foreground rounded-full w-8 h-8 inline-flex items-center justify-center"
                        )}>
                          {format(day, 'd')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-2">
                      {dayAppointments.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Sem agendamentos
                        </p>
                      ) : (
                        dayAppointments.slice(0, 5).map((apt) => (
                          <div
                            key={apt.id}
                            className={cn(
                              "p-2 rounded-md border text-xs",
                              statusColors[apt.status]
                            )}
                          >
                            <div className="flex items-center gap-1 font-medium">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(apt.start_at), 'HH:mm')}
                            </div>
                            <div className="truncate mt-1">
                              {apt.service_name}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground truncate">
                              <User className="h-3 w-3" />
                              {apt.customer_name}
                            </div>
                          </div>
                        ))
                      )}
                      {dayAppointments.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{dayAppointments.length - 5} mais
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* List View */
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredAppointments().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum agendamento neste período
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredAppointments().map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {format(parseISO(apt.start_at), "dd/MM", { locale: ptBR })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(apt.start_at), 'HH:mm')} - {format(parseISO(apt.end_at), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{apt.customer_name}</p>
                              <p className="text-sm text-muted-foreground">{apt.customer_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{apt.service_name}</p>
                              <p className="text-sm text-muted-foreground">{apt.service_duration} min</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs", statusColors[apt.status])}>
                              {statusLabels[apt.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
