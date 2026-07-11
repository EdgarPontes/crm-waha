import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type AIProvider = "openai" | "claude" | "gemini" | "ollama" | "openrouter";

export default function AISettings() {
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isActive, setIsActive] = useState(false);

  const { data: activeConfig } = trpc.ai.config.getActive.useQuery();
  const updateConfigMutation = trpc.ai.config.update.useMutation();
  const testConnectionMutation = trpc.ai.config.testConnection.useMutation();

  const handleUpdateConfig = () => {
    updateConfigMutation.mutate({
      provider: selectedProvider,
      apiKey,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      isActive,
    });
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate({
      provider: selectedProvider,
      apiKey,
      model,
    });
  };

  const providerModels: Record<AIProvider, string[]> = {
    openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    claude: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    gemini: ["gemini-pro", "gemini-pro-vision"],
    ollama: ["llama2", "mistral", "neural-chat"],
    openrouter: [
      "openai/gpt-4",
      "anthropic/claude-3-opus",
      "meta-llama/llama-2",
    ],
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configurações de IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure o provedor de IA para respostas automáticas
          </p>
        </div>

        {/* Active Config Status */}
        {activeConfig && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">IA Ativa</p>
                  <p className="text-sm text-green-700">
                    Provedor: {activeConfig.provider} | Modelo:{" "}
                    {activeConfig.model}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Tabs */}
        <Tabs defaultValue="config" className="w-full">
          <TabsList>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="prompt">Prompt do Sistema</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selecione o Provedor</CardTitle>
                <CardDescription>
                  Escolha qual serviço de IA usar para respostas automáticas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor de IA</Label>
                  <Select
                    value={selectedProvider}
                    onValueChange={v => setSelectedProvider(v as AIProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">
                        OpenAI (GPT-4, GPT-3.5)
                      </SelectItem>
                      <SelectItem value="claude">Anthropic Claude</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                      <SelectItem value="openrouter">
                        OpenRouter (Multi-modelo)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chave de API</Label>
                  <Input
                    type="password"
                    placeholder="Cole sua chave de API aqui"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua chave será armazenada com segurança
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerModels[selectedProvider]?.map(m => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleTestConnection}
                    disabled={
                      !apiKey || !model || testConnectionMutation.isPending
                    }
                    variant="outline"
                  >
                    {testConnectionMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Testar Conexão
                  </Button>
                  {testConnectionMutation.data?.success && (
                    <Badge variant="default" className="bg-green-600">
                      ✓ Conexão OK
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prompt do Sistema</CardTitle>
                <CardDescription>
                  Defina o comportamento e personalidade da IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Instrução do Sistema</Label>
                  <Textarea
                    placeholder="Você é um atendente de vendas profissional..."
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este prompt define como a IA deve se comportar em conversas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
                <CardDescription>
                  Ajuste parâmetros técnicos da IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Temperatura: {temperature.toFixed(2)}</Label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valores mais altos = respostas mais criativas (0-2)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Máximo de Tokens</Label>
                  <Input
                    type="number"
                    min="100"
                    max="4000"
                    value={maxTokens}
                    onChange={e => setMaxTokens(parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comprimento máximo da resposta
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Ativar IA como padrão
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpdateConfig}
            disabled={!apiKey || !model || updateConfigMutation.isPending}
            size="lg"
          >
            {updateConfigMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar Configurações
          </Button>
          {updateConfigMutation.data && (
            <Badge variant="default" className="bg-green-600">
              ✓ Salvo com sucesso
            </Badge>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
