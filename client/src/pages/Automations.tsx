import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Edit2, Play, Pause } from "lucide-react";

interface Automation {
  id: number;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  createdAt: Date;
  executedCount?: number;
}

export default function Automations() {
  const { user } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    trigger: "keyword",
    triggerValue: "",
    action: "move_stage",
    actionValue: "",
    isActive: true,
  });

  // Usando estado local para automações por enquanto
  // const createMutation = trpc.automations.create.useMutation({
  //   onSuccess: (data: any) => {
  //     setAutomations([...automations, data]);
  //     resetForm();
  //   },
  // });

  const handleCreate = () => {
    const newAutomation: Automation = {
      id: Date.now(),
      name: formData.name,
      trigger: formData.triggerValue,
      action: formData.actionValue,
      isActive: formData.isActive,
      createdAt: new Date(),
      executedCount: 0,
    };
    setAutomations([...automations, newAutomation]);
    resetForm();
  };

  const handleUpdate = (id: number) => {
    setAutomations(automations.map(a => 
      a.id === id 
        ? {
            ...a,
            name: formData.name,
            trigger: formData.triggerValue,
            action: formData.actionValue,
            isActive: formData.isActive,
          }
        : a
    ));
    resetForm();
  };

  const handleDelete = (id: number) => {
    setAutomations(automations.filter(a => a.id !== id));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      trigger: "keyword",
      triggerValue: "",
      action: "move_stage",
      actionValue: "",
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.triggerValue.trim() || !formData.actionValue.trim()) {
      alert("Preencha todos os campos");
      return;
    }

    if (editingId) {
      handleUpdate(editingId);
    } else {
      handleCreate();
    }
  };

  const handleEdit = (automation: Automation) => {
    setEditingId(automation.id);
    setFormData({
      name: automation.name,
      trigger: "keyword",
      triggerValue: automation.trigger,
      action: "move_stage",
      actionValue: automation.action,
      isActive: automation.isActive,
    });
    setShowForm(true);
  };

  const triggerTypes = [
    { value: "keyword", label: "Palavra-chave" },
    { value: "inactivity", label: "Inatividade" },
    { value: "stage_change", label: "Mudança de Estágio" },
  ];

  const actionTypes = [
    { value: "move_stage", label: "Mover para Estágio" },
    { value: "send_message", label: "Enviar Mensagem" },
    { value: "add_tag", label: "Adicionar Tag" },
    { value: "assign_user", label: "Atribuir Usuário" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automações</h1>
            <p className="text-muted-foreground mt-2">
              Configure regras SE/ENTÃO para automatizar ações
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Automação
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Automação" : "Criar Nova Automação"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Automação</Label>
                <Input
                  placeholder="Ex: Mover para Qualificação se disser 'preço'"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SE (Gatilho)</Label>
                  <Select value={formData.trigger} onValueChange={(v) => setFormData({ ...formData, trigger: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor do Gatilho</Label>
                  <Input
                    placeholder={formData.trigger === "keyword" ? "Ex: preço, orçamento" : "Valor"}
                    value={formData.triggerValue}
                    onChange={(e) => setFormData({ ...formData, triggerValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ENTÃO (Ação)</Label>
                  <Select value={formData.action} onValueChange={(v) => setFormData({ ...formData, action: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor da Ação</Label>
                  <Input
                    placeholder={formData.action === "move_stage" ? "Ex: Qualificação" : "Valor"}
                    value={formData.actionValue}
                    onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label className="cursor-pointer">Ativar automaticamente</Label>
              </div>

              <div className="flex gap-2">
              <Button
                onClick={handleSave}
              >
                {editingId ? "Atualizar" : "Criar"} Automação
              </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Automations List */}
        <div className="space-y-3">
          {automations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhuma automação criada. Clique em "Nova Automação" para começar.
              </CardContent>
            </Card>
          ) : (
            automations.map((automation) => (
              <Card key={automation.id} className={!automation.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{automation.name}</h3>
                        <Badge variant={automation.isActive ? "default" : "secondary"}>
                          {automation.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>SE</strong> {automation.trigger} contém "{automation.trigger}" <br />
                        <strong>ENTÃO</strong> {automation.action} para "{automation.action}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Executada {automation.executedCount || 0} vezes
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(automation)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(automation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              <strong>💡 Exemplos de Automações:</strong>
              <br />
              • SE mensagem contém "preço" → ENTÃO mover para "Qualificação"
              <br />
              • SE inatividade por 24h → ENTÃO enviar follow-up automático
              <br />
              • SE mensagem contém "urgente" → ENTÃO adicionar tag "Prioridade Alta"
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
