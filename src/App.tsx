import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/ClientProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import PublicBooking from "./pages/PublicBooking";
import ManageAppointment from "./pages/ManageAppointment";
import NotFound from "./pages/NotFound";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/criar-conta" element={<Signup />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            
            {/* Client Login */}
            <Route path="/cliente/login" element={<ClientLogin />} />
            
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
            
            {/* Public routes */}
            <Route path="/:slug" element={<PublicBooking />} />
            <Route path="/:slug/gerenciar/:token" element={<ManageAppointment />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
