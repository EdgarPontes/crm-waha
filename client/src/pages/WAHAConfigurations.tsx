import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  TestTube,
  Globe,
  Key,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WAHAConfig {
  id: number;
  name: string;
  baseUrl: string;
  apiKey: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function WAHAConfigurations() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WAHAConfig | null>(null);
  const [testLoading, setTestLoading] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, any>>({});

  const { data: configs, isLoading, refetch } = trpc.wahaConfig.list.useQuery();

  const { data: activeConfig } = trpc.wahaConfig.getActive.useQuery();

  const createMutation = trpc.wahaConfig.create.useMutation({
    onSuccess: () => {
      setIsDialogOpen(false);
      resetForm();
      utils.wahaConfig.invalidate();
      toast.success("Configuração criada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  const updateMutation = trpc.wahaConfig.update.useMutation({
    onSuccess: () => {
      setIsDialogOpen(false);
      resetForm();
      utils.wahaConfig.invalidate();
      toast.success("Configuração atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.wahaConfig.delete.useMutation({
    onSuccess: () => {
      utils.wahaConfig.invalidate();
      toast.success("Configuração deletada!");
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const testConnectionMutation = trpc.wahaConfig.testConnection.useMutation({
    onSuccess: (result) => {
      if (editingConfig) {
        setTestResult((prev) => ({
          ...prev,
          [editingConfig.id]: result,
        }));
      }
      setTestLoading(null);
      toast.info(
        result.success ? "Conexão bem-sucedida!" : result.message
      );
    },
    onError: (error) => {
      setTestLoading(null);
      toast.error(`Erro ao testar: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    baseUrl: "",
    apiKey: "",
    isActive: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      baseUrl: "",
      apiKey: "",
      isActive: false,
    });
    setEditingConfig(null);
    setTestResult({});
  };

  const handleEdit = (config: WAHAConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || "",
      isActive: config.isActive,
    });
    setIsDialogOpen(true);
    setTestResult({});
  };

  const handleDelete = (config: WAHAConfig) => {
    if (config.isActive) {
      toast.error("Não é possível deletar a configuração ativa");
      return;
    }
    if (window.confirm(`Deletar configuração "${config.name}"?`)) {
      deleteMutation.mutate({ id: config.id });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.baseUrl.trim()) {
      toast.error("Nome e URL base são obrigatórios");
      return;
    }

    const data = {
      name: formData.name.trim(),
      baseUrl: formData.baseUrl.trim(),
      apiKey: formData.apiKey.trim() || undefined,
      isActive: formData.isActive,
    };

    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTestConnection = (config: WAHAConfig) => {
    setTestLoading(config.id);
    setTestResult({});
    testConnectionMutation.mutate({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configurações WAHA
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as conexões com a API WAHA
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Configuração
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : !configs || configs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Nenhuma configuração WAHA
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione uma configuração para conectar ao WAHA
              </p>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Configuração
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {configs.map((config: WAHAConfig) => (
              <Card key={config.id} className="relative">
                {config.isActive && (
                  <div className="absolute top-0 right-0">
                    <Badge className="m-4 bg-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Ativa
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {config.name}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">URL:</span>
                          <span className="font-mono text-xs">
                            {config.baseUrl}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            API Key:{" "}
                            {config.apiKey
                              ? "••••••••"
                              : "Não configurada"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConnection(config)}
                          disabled={testLoading === config.id}
                        >
                          {testLoading === config.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Testando...
                            </>
                          ) : (
                            <>
                              <TestTube className="mr-2 h-3 w-3" />
                              Testar Conexão
                            </>
                          )}
                        </Button>

                        {testResult[config.id] && (
                          <Badge
                            className={
                              testResult[config.id].success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {testResult[config.id].success ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <AlertCircle className="mr-1 h-3 w-3" />
                            )}
                            {testResult[config.id].success
                              ? "Conectado"
                              : "Erro"}
                          </Badge>
                        )}
                      </div>

                      {testResult[config.id] && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {testResult[config.id].message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(config)}
                        disabled={config.isActive}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>💡 Dica:</strong> A configuração ativa será usada
              automaticamente por todas as operações WAHA. Você pode ter
              múltiplas configurações e alternar entre elas.
            </p>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Editar" : "Nova"} Configuração WAHA
              </DialogTitle>
              <DialogDescription>
                {editingConfig
                  ? "Atualize as configurações da conexão WAHA"
                  : "Adicione uma nova conexão com a API WAHA"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="ex: Produção, Desenvolvimento"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base da API WAHA</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, baseUrl: e.target.value })
                  }
                  placeholder="http://localhost:3001"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key (Opcional)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  placeholder="Deixe em branco se não usar autenticação"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
                <Label htmlFor="isActive">Ativar esta configuração</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}