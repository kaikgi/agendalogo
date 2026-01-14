import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Trash2, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
  email?: string;
}

export default function AdminAdmins() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const queryClient = useQueryClient();

  // Fetch admin users
  const { data: admins, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as AdminUser[];
    },
  });

  // Add admin mutation using Edge Function
  const addAdmin = useAddAdmin();

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Informe o email do usuário");
      return;
    }

    try {
      await addAdmin.mutateAsync(newAdminEmail.trim());
      toast.success("Administrador adicionado com sucesso");
      setIsDialogOpen(false);
      setNewAdminEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar administrador");
    }
  };

  // Remove admin mutation
  const removeAdmin = useMutation({
    mutationFn: async (adminId: string) => {
      // Check if this is the last admin
      if (admins && admins.length <= 1) {
        throw new Error("Não é possível remover o último administrador");
      }

      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", adminId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin removido");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Administradores</h1>
          <p className="text-muted-foreground">Gerencie os administradores do sistema</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Administrador</DialogTitle>
              <DialogDescription>
                Insira o email do usuário que você deseja tornar administrador.
                O usuário precisa já ter uma conta no sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label htmlFor="email">Email do usuário</Label>
              <Input
                id="email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                className="mt-2"
                onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddAdmin}
                disabled={!newAdminEmail.trim() || addAdmin.isPending}
              >
                {addAdmin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {addAdmin.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Gerenciamento de Admins</p>
              <p className="text-sm text-muted-foreground">
                Para adicionar um novo administrador, o usuário precisa ter uma conta no sistema.
                Digite o email e clique em Adicionar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : admins?.length ? (
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Administrador</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {admin.user_id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Desde {format(new Date(admin.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAdmin.mutate(admin.id)}
                      disabled={removeAdmin.isPending || (admins.length <= 1)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum administrador encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
