import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { statusStyles } from "@/lib/status-colors";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  ShieldCheck,
  KeyRound,
  Loader2,
  Users,
  Crown,
  Briefcase,
  Headphones,
  AlertCircle,
} from "lucide-react";

type UserRole = "Administrador" | "Supervisor" | "Atendente";

interface ManagedUser {
  id: number;
  email: string;
  name: string | null;
  loginMethod: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastSignedIn: Date | string;
}

const roleColors: Record<UserRole, string> = {
  Administrador: statusStyles.violet,
  Supervisor: statusStyles.blue,
  Atendente: statusStyles.emerald,
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  Administrador: <Crown className="h-3.5 w-3.5" />,
  Supervisor: <Briefcase className="h-3.5 w-3.5" />,
  Atendente: <Headphones className="h-3.5 w-3.5" />,
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    password: string;
  }>({
    name: "",
    email: "",
    role: "Atendente",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [passwordResetUser, setPasswordResetUser] =
    useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const isAdmin = currentUser?.role === "Administrador";

  const { data: users, isLoading } = trpc.users.list.useQuery(
    {
      search: searchTerm.trim() || undefined,
    },
    { refetchOnWindowFocus: false }
  );

  const { data: stats } = trpc.users.stats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      resetForm();
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: err => setFormError(err.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      resetForm();
      utils.users.list.invalidate();
    },
    onError: err => setFormError(err.message),
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: err => alert(err.message),
  });

  const resetPasswordMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      setPasswordResetUser(null);
      setNewPassword("");
    },
    onError: err => alert(err.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      setDeleteUserId(null);
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
    },
    onError: err => alert(err.message),
  });

  function resetForm() {
    setFormData({ name: "", email: "", role: "Atendente", password: "" });
    setEditingUser(null);
    setShowForm(false);
    setFormError(null);
  }

  function handleEditUser(target: ManagedUser) {
    setEditingUser(target);
    setFormData({
      name: target.name || "",
      email: target.email,
      role: (target.role as UserRole) || "Atendente",
      password: "",
    });
    setShowForm(true);
    setFormError(null);
  }

  function handleSave() {
    setFormError(null);
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Nome e email são obrigatórios");
      return;
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        name: formData.name,
        email: formData.email,
      });
      if (editingUser.role !== formData.role) {
        updateRoleMutation.mutate({
          id: editingUser.id,
          role: formData.role,
        });
      }
    } else {
      if (formData.password.length < 8) {
        setFormError("A senha deve ter no mínimo 8 caracteres");
        return;
      }
      createMutation.mutate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
    }
  }

  function handleRoleChange(userId: number, role: UserRole) {
    if (userId === currentUser?.id && role !== "Administrador") {
      alert("Você não pode remover seu próprio papel de administrador");
      return;
    }
    updateRoleMutation.mutate({ id: userId, role });
  }

  const filteredUsers = useMemo(() => {
    if (!users) return [] as ManagedUser[];
    return users as ManagedUser[];
  }, [users]);

  const admins = filteredUsers.filter(u => u.role === "Administrador");
  const supervisors = filteredUsers.filter(u => u.role === "Supervisor");
  const atendentes = filteredUsers.filter(u => u.role === "Atendente");

  function renderUserCard(
    target: ManagedUser,
    options?: { compact?: boolean }
  ) {
    const isSelf = target.id === currentUser?.id;
    return (
      <Card key={target.id}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold truncate">
                  {target.name || target.email}
                </h3>
                <Badge
                  variant="outline"
                  className={`${roleColors[target.role as UserRole] || ""} gap-1`}
                >
                  {roleIcons[target.role as UserRole]}
                  {target.role}
                </Badge>
                {target.emailVerified ? (
                  <Badge
                    variant="outline"
                    className={`${statusStyles.emerald} gap-1`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Verificado
                  </Badge>
                ) : (
                  <Badge variant="outline" className={statusStyles.amber}>
                    Não verificado
                  </Badge>
                )}
                {isSelf && (
                  <Badge variant="secondary" className="text-xs">
                    Você
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {target.email}
                </span>
                <span>Criado: {formatDate(target.createdAt)}</span>
                {!options?.compact && (
                  <span>Último acesso: {formatDate(target.lastSignedIn)}</span>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => handleEditUser(target)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Redefinir senha"
                  onClick={() => setPasswordResetUser(target)}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir"
                  disabled={isSelf}
                  onClick={() => setDeleteUserId(target.id)}
                >
                  <Trash2
                    className={`h-4 w-4 ${
                      isSelf ? "text-muted-foreground" : "text-destructive"
                    }`}
                  />
                </Button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Perfil:</Label>
              <Select
                value={target.role}
                onValueChange={(v: UserRole) => handleRoleChange(target.id, v)}
                disabled={updateRoleMutation.isPending}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin
                ? "Gerencie usuários, perfis de acesso e permissões"
                : "Visualize os usuários do sistema"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          )}
        </div>

        {!isAdmin && (
          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm text-sidebar-foreground/80">
                Apenas administradores podem criar, editar, alterar perfil ou
                excluir usuários.
              </p>
            </CardContent>
          </Card>
        )}

        {showForm && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingUser ? "Editar Usuário" : "Adicionar Novo Usuário"}
              </CardTitle>
              <CardDescription>
                {editingUser
                  ? "Atualize as informações do usuário. A senha só é alterada pelo recurso de redefinição."
                  : "Crie um novo usuário e defina o perfil de acesso inicial."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={e =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label>Senha inicial</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formData.password}
                    onChange={e =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v: UserRole) =>
                    setFormData({ ...formData, role: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Atendente">Atendente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.role === "Administrador" &&
                    "Acesso total ao sistema, gerenciamento de usuários e configurações"}
                  {formData.role === "Supervisor" &&
                    "Gerencia atendentes, distribui conversas e visualiza relatórios"}
                  {formData.role === "Atendente" &&
                    "Acesso apenas a conversas atribuídas e base de conhecimento"}
                </p>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-sidebar-foreground">
                  {stats?.total ?? "—"}
                </p>
                <p className="text-sm text-sidebar-foreground/70">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-sidebar-foreground">
                  {stats?.administrators ?? 0}
                </p>
                <p className="text-sm text-sidebar-foreground/70">
                  Administradores
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-sidebar-foreground">
                  {stats?.supervisors ?? 0}
                </p>
                <p className="text-sm text-sidebar-foreground/70">
                  Supervisores
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-sidebar border-sidebar-border">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-sidebar-foreground">
                  {stats?.atendentes ?? 0}
                </p>
                <p className="text-sm text-sidebar-foreground/70">Atendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="todos" className="w-full">
            <TabsList>
              <TabsTrigger value="todos">
                Todos ({filteredUsers.length})
              </TabsTrigger>
              <TabsTrigger value="admins">
                Administradores ({admins.length})
              </TabsTrigger>
              <TabsTrigger value="supervisores">
                Supervisores ({supervisors.length})
              </TabsTrigger>
              <TabsTrigger value="atendentes">
                Atendentes ({atendentes.length})
              </TabsTrigger>
            </TabsList>

            {(
              [
                { value: "todos", list: filteredUsers },
                { value: "admins", list: admins },
                { value: "supervisores", list: supervisors },
                { value: "atendentes", list: atendentes },
              ] as const
            ).map(group => (
              <TabsContent
                key={group.value}
                value={group.value}
                className="space-y-3"
              >
                {group.list.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </CardContent>
                  </Card>
                ) : (
                  group.list.map(u => renderUserCard(u, { compact: true }))
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissões por Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-sidebar-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" /> Administrador
              </p>
              <p className="text-sidebar-foreground/70">
                Acesso total ao sistema, gerenciamento de usuários,
                configurações de IA, WAHA e todas as operações destrutivas.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Supervisor
              </p>
              <p className="text-sidebar-foreground/70">
                Gerencia atendentes, distribui conversas da fila, visualiza
                relatórios e dashboards. Não pode editar/excluir usuários.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary" /> Atendente
              </p>
              <p className="text-sidebar-foreground/70">
                Atende apenas conversas atribuídas, consulta base de
                conhecimento e visualiza leads do Kanban.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!passwordResetUser}
        onOpenChange={open => {
          if (!open) {
            setPasswordResetUser(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para{" "}
              {passwordResetUser?.name || passwordResetUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordResetUser(null);
                setNewPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!passwordResetUser) return;
                if (newPassword.length < 8) {
                  alert("A senha deve ter no mínimo 8 caracteres");
                  return;
                }
                resetPasswordMutation.mutate({
                  id: passwordResetUser.id,
                  newPassword,
                });
              }}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteUserId}
        onOpenChange={open => {
          if (!open) setDeleteUserId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O usuário será removido
              permanentemente do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteUserId) {
                  deleteMutation.mutate({ id: deleteUserId });
                }
              }}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
