import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit2, Mail } from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "Administrador" | "Supervisor" | "Atendente";
  status: "ativo" | "inativo";
  conversasAtribuidas: number;
  taxaConversao?: number;
  createdAt: Date;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 1,
      name: "João Silva",
      email: "joao@example.com",
      role: "Supervisor",
      status: "ativo",
      conversasAtribuidas: 12,
      taxaConversao: 35,
      createdAt: new Date(),
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@example.com",
      role: "Atendente",
      status: "ativo",
      conversasAtribuidas: 8,
      taxaConversao: 28,
      createdAt: new Date(),
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: "Administrador" | "Supervisor" | "Atendente";
  }>({
    name: "",
    email: "",
    role: "Atendente",
  });

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Preencha todos os campos");
      return;
    }

    if (editingId) {
      setMembers(members.map(m =>
        m.id === editingId
          ? { ...m, name: formData.name, email: formData.email, role: formData.role }
          : m
      ));
    } else {
      const newMember: TeamMember = {
        id: Date.now(),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: "ativo",
        conversasAtribuidas: 0,
        createdAt: new Date(),
      };
      setMembers([...members, newMember]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", role: "Atendente" as const });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const roleColors = {
    Administrador: "bg-purple-100 text-purple-800",
    Supervisor: "bg-blue-100 text-blue-800",
    Atendente: "bg-green-100 text-green-800",
  };

  const statusColors = {
    ativo: "bg-green-100 text-green-800",
    inativo: "bg-gray-100 text-gray-800",
  };

  const atendentes = members.filter(m => m.role === "Atendente");
  const supervisores = members.filter(m => m.role === "Supervisor");
  const admins = members.filter(m => m.role === "Administrador");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Equipes</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie membros da equipe, roles e permissões
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Membro" : "Adicionar Novo Membro"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select value={formData.role} onValueChange={(v: "Administrador" | "Supervisor" | "Atendente") => setFormData({ ...formData, role: v })}>
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
                  {formData.role === "Administrador" && "Acesso total ao sistema"}
                  {formData.role === "Supervisor" && "Gerencia atendentes e visualiza relatórios"}
                  {formData.role === "Atendente" && "Acesso apenas a conversas atribuídas"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  {editingId ? "Atualizar" : "Adicionar"} Membro
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{atendentes.length}</p>
                <p className="text-sm text-muted-foreground">Atendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{members.filter(m => m.status === "ativo").length}</p>
                <p className="text-sm text-muted-foreground">Ativos Agora</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="todos" className="w-full">
          <TabsList>
            <TabsTrigger value="todos">Todos ({members.length})</TabsTrigger>
            <TabsTrigger value="atendentes">Atendentes ({atendentes.length})</TabsTrigger>
            <TabsTrigger value="supervisores">Supervisores ({supervisores.length})</TabsTrigger>
            <TabsTrigger value="admins">Administradores ({admins.length})</TabsTrigger>
          </TabsList>

          {/* All Members */}
          <TabsContent value="todos" className="space-y-3">
            {members.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum membro adicionado
                </CardContent>
              </Card>
            ) : (
              members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{member.name}</h3>
                          <Badge className={roleColors[member.role]}>
                            {member.role}
                          </Badge>
                          <Badge className={statusColors[member.status]}>
                            {member.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {member.email}
                          </span>
                          <span>Conversas: {member.conversasAtribuidas}</span>
                          {member.taxaConversao && (
                            <span>Taxa de Conversão: {member.taxaConversao}%</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Atendentes */}
          <TabsContent value="atendentes" className="space-y-3">
            {atendentes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum atendente adicionado
                </CardContent>
              </Card>
            ) : (
              atendentes.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{member.conversasAtribuidas} conversas</p>
                        {member.taxaConversao && (
                          <p className="text-sm text-muted-foreground">{member.taxaConversao}% conversão</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Supervisores */}
          <TabsContent value="supervisores" className="space-y-3">
            {supervisores.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum supervisor adicionado
                </CardContent>
              </Card>
            ) : (
              supervisores.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Administradores */}
          <TabsContent value="admins" className="space-y-3">
            {admins.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum administrador adicionado
                </CardContent>
              </Card>
            ) : (
              admins.map((member) => (
                <Card key={member.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Permissions Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Permissões por Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-blue-900">👑 Administrador</p>
              <p className="text-blue-800">Acesso total ao sistema, gerenciamento de equipes e configurações</p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">📊 Supervisor</p>
              <p className="text-blue-800">Gerencia atendentes, visualiza relatórios e distribui conversas</p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">💬 Atendente</p>
              <p className="text-blue-800">Acesso apenas a conversas atribuídas e base de conhecimento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
