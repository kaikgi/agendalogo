import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/ClientProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import PublicBooking from "./pages/PublicBooking";
import ManageAppointment from "./pages/ManageAppointment";
import NotFound from "./pages/NotFound";
import Recursos from "./pages/Recursos";
import Precos from "./pages/Precos";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Agenda from "./pages/dashboard/Agenda";
import Clientes from "./pages/dashboard/Clientes";
import Profissionais from "./pages/dashboard/Profissionais";
import Servicos from "./pages/dashboard/Servicos";
import Horarios from "./pages/dashboard/Horarios";
import Bloqueios from "./pages/dashboard/Bloqueios";
import Configuracoes from "./pages/dashboard/Configuracoes";
import ClientLayout from "./pages/client/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfile from "./pages/client/ClientProfile";
import ClientHistory from "./pages/client/ClientHistory";
import ClientLogin from "./pages/client/ClientLogin";
import ClientSignup from "./pages/client/ClientSignup";
import ClientSearch from "./pages/client/ClientSearch";
import ProfessionalPortalLogin from "./pages/professional/ProfessionalPortalLogin";
import ProfessionalPortalAgenda from "./pages/professional/ProfessionalPortalAgenda";

const queryClient = new QueryClient();

// Reserved routes that should NOT be treated as establishment slugs
const RESERVED_ROUTES = [
  'recursos',
  'precos',
  'sobre',
  'contato',
  'termos',
  'privacidade',
  'login',
  'entrar',
  'cadastro',
  'criar-conta',
  'esqueci-senha',
  'dashboard',
  'client',
  'cliente',
];

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Home */}
            <Route path="/" element={<Index />} />
            
            {/* Institutional pages - MUST be before :slug route */}
            <Route path="/recursos" element={<Recursos />} />
            <Route path="/precos" element={<Precos />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            
            {/* Auth pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/criar-conta" element={<Signup />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            
            {/* Client Login & Signup */}
            <Route path="/cliente/login" element={<ClientLogin />} />
            <Route path="/cliente/cadastro" element={<ClientSignup />} />
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/client/signup" element={<ClientSignup />} />
            
            {/* Client Portal (protected) */}
            <Route
              path="/client"
              element={
                <ClientProtectedRoute>
                  <ClientLayout />
                </ClientProtectedRoute>
              }
            >
              <Route index element={<ClientDashboard />} />
              <Route path="search" element={<ClientSearch />} />
              <Route path="appointments" element={<ClientAppointments />} />
              <Route path="history" element={<ClientHistory />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>
            
            {/* Establishment Dashboard (protected) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="profissionais" element={<Profissionais />} />
              <Route path="servicos" element={<Servicos />} />
              <Route path="horarios" element={<Horarios />} />
              <Route path="bloqueios" element={<Bloqueios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
            
            {/* Professional Portal */}
            <Route path="/:establishmentSlug/p/:professionalSlug" element={<ProfessionalPortalLogin />} />
            <Route path="/:establishmentSlug/p/:professionalSlug/agenda" element={<ProfessionalPortalAgenda />} />
            
            {/* Public booking routes - MUST be last to avoid conflicts with institutional pages */}
            <Route path="/:slug" element={<PublicBooking />} />
            <Route path="/:slug/gerenciar/:token" element={<ManageAppointment />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
