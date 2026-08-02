import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Smartphone,
  QrCode,
  X,
  Webhook,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WhatsAppSession {
  id: number;
  sessionName: string;
  phoneNumber: string | null;
  status: "disconnected" | "connecting" | "connected" | "error";
  qrCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function SessionWebhookInfo({
  sessionName,
  webhookUrl,
  onRegister,
  isRegistering,
}: {
  sessionName: string;
  webhookUrl?: string;
  onRegister: (sessionName: string) => void;
  isRegistering: boolean;
}) {
  const { data: webhooks, isLoading, error } = trpc.waha.listWebhooks.useQuery(
    { sessionName },
    { enabled: !!sessionName }
  );

  const hasWebhook = webhooks && webhooks.length > 0;
  const registeredUrl = hasWebhook ? webhooks[0]?.url : undefined;

  if (error) {
    console.error(`Erro ao buscar webhooks para ${sessionName}:`, error);
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center gap-2 mb-2">
        <Webhook className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium text-sm">Webhook</p>
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : hasWebhook ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Registrado
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Não registrado
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">URL</p>
          <p className="text-xs font-mono truncate">
            {registeredUrl || webhookUrl || "Nenhum webhook configurado"}
          </p>
          {hasWebhook && webhooks[0]?.events && (
            <div className="flex flex-wrap gap-1 mt-2">
              {webhooks[0].events.map((event: string) => (
                <Badge key={event} variant="outline" className="text-[10px]">
                  {event}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRegister(sessionName)}
          disabled={isRegistering}
        >
          <Link2 className="mr-2 h-3 w-3" />
          {isRegistering ? "Registrando..." : "Registrar"}
        </Button>
      </div>
    </div>
  );
}

export default function WhatsAppSessions() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const { data: sessions, isLoading, refetch } = trpc.whatsapp.sessions.list.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Garante que sessions seja sempre um array
  const sessionsData = sessions || [];

  const createMutation = trpc.whatsapp.sessions.create.useMutation({
    onSuccess: () => {
      setIsCreating(false);
      setIsDialogOpen(false);
      utils.whatsapp.sessions.invalidate();
      toast.success("Sessão criada com sucesso!");
    },
    onError: (error) => {
      setIsCreating(false);
      toast.error(`Erro ao criar sessão: ${error.message}`);
    },
  });

  const disconnectMutation = trpc.whatsapp.sessions.disconnect.useMutation({
    onSuccess: () => {
      utils.whatsapp.sessions.invalidate();
      toast.success("Sessão desconectada!");
    },
    onError: (error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.waha.deleteSession.useMutation({
    onSuccess: () => {
      utils.whatsapp.sessions.invalidate();
      utils.waha.listSessions.invalidate();
      toast.success("Sessão deletada!");
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  // Webhook URL configurado no servidor
  const { data: webhookInfo } = trpc.waha.getWebhookUrl.useQuery();

  // Mutation para registrar webhook em uma sessão
  const registerWebhookMutation = trpc.waha.registerWebhook.useMutation({
    onSuccess: () => {
      utils.waha.listWebhooks.invalidate();
      toast.success("Webhook registrado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao registrar webhook: ${error.message}`);
    },
  });

  const handleRegisterWebhook = (sessionName: string) => {
    if (!webhookInfo?.url) {
      toast.error("URL do webhook não disponível");
      return;
    }
    registerWebhookMutation.mutate({
      sessionName,
      webhookUrl: webhookInfo.url,
    });
  };

  const handleCreateSession = () => {
    setIsDialogOpen(true);
  };

  const handleSubmitCreate = (sessionName: string) => {
    if (!sessionName.trim()) {
      toast.error("Nome da sessão é obrigatório");
      return;
    }
    setIsCreating(true);
    createMutation.mutate({ sessionName: sessionName.trim() });
  };

  const handleDeleteSession = (session: WhatsAppSession) => {
    if (
      window.confirm(
        `Tem certeza que deseja deletar a sessão "${session.sessionName}"?`
      )
    ) {
      deleteMutation.mutate({ sessionName: session.sessionName });
    }
  };

  const handleDisconnect = (session: WhatsAppSession) => {
    disconnectMutation.mutate({ sessionName: session.sessionName });
  };

  const handleShowQR = async (session: WhatsAppSession) => {
    setSelectedSession({ ...session, qrCode: null });
    setIsQRDialogOpen(true);
    setQrLoading(true);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const data = await utils.client.whatsapp.sessions.getQR.query({
          sessionName: session.sessionName,
        });
        if (data?.qrCode) {
          setSelectedSession((prev) =>
            prev ? { ...prev, qrCode: data.qrCode } : null
          );
          setQrLoading(false);
          return;
        }
      } catch (error: unknown) {
        if (attempts >= maxAttempts) {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          console.error("Erro ao buscar QR Code:", error);
          toast.error(`Aguardando geração do QR Code: ${message}`);
        }
      }
      if (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    setQrLoading(false);
  };

  type SessionStatus = "connected" | "disconnected" | "connecting" | "error";

  const statusColors: Record<SessionStatus, string> = {
    connected: "bg-green-100 text-green-800 border-green-200",
    disconnected: "bg-red-100 text-red-800 border-red-200",
    connecting: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
  };

  const statusIcons: Record<SessionStatus, React.ReactNode> = {
    connected: <CheckCircle2 className="h-4 w-4" />,
    disconnected: <AlertCircle className="h-4 w-4" />,
    connecting: <Loader2 className="h-4 w-4 animate-spin" />,
    error: <AlertCircle className="h-4 w-4" />,
  };

  const statusLabels: Record<SessionStatus, string> = {
    connected: "Conectado",
    disconnected: "Desconectado",
    connecting: "Conectando...",
    error: "Erro",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Sessões WhatsApp
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie múltiplas contas WhatsApp para atendimento
            </p>
          </div>
          <Button onClick={handleCreateSession} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Sessão
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : sessionsData.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Nenhuma sessão configurada
              </h3>
              <p className="text-muted-foreground mb-4">
                Clique em "Nova Sessão" para começar a configurar seu WhatsApp
              </p>
              <Button onClick={handleCreateSession}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Sessão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessionsData.map((session: WhatsAppSession) => (
              <Card
                key={session.id}
                className="transition-all hover:shadow-md"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {session.sessionName}
                        </h3>
                        <Badge
                          className={`${statusColors[session.status]} border`}
                        >
                          {statusIcons[session.status]}
                          <span className="ml-1">
                            {statusLabels[session.status]}
                          </span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p className="font-medium">Número</p>
                          <p>
                            {session.phoneNumber || "Aguardando conexão..."}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Criada em</p>
                          <p>
                            {new Date(session.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <SessionWebhookInfo
                        sessionName={session.sessionName}
                        webhookUrl={webhookInfo?.url}
                        onRegister={handleRegisterWebhook}
                        isRegistering={registerWebhookMutation.isPending}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      {session.status === "connecting" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowQR(session)}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          QR Code
                        </Button>
                      )}
                      {session.status === "connected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnect(session)}
                          disabled={disconnectMutation.isPending}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Desconectar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSession(session)}
                        disabled={deleteMutation.isPending}
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

        {/* Statistics */}
        {sessionsData.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {sessionsData.filter((s: WhatsAppSession) => s.status === "connected").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Conectadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">
                    {sessionsData.filter((s: WhatsAppSession) => s.status === "connecting").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Conectando</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {sessionsData.filter((s: WhatsAppSession) => s.status === "disconnected").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Desconectadas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Session Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Sessão</DialogTitle>
              <DialogDescription>
                Digite um nome único para a nova sessão WhatsApp
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const sessionName = formData.get("sessionName") as string;
                handleSubmitCreate(sessionName);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="sessionName" className="text-sm font-medium">
                  Nome da Sessão
                </label>
                <input
                  id="sessionName"
                  name="sessionName"
                  type="text"
                  placeholder="ex: vendas, suporte, marketing"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={isCreating}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Sessão"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog
          open={isQRDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsQRDialogOpen(false);
              setSelectedSession(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Conectar {selectedSession?.sessionName}
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code abaixo com seu WhatsApp
              </DialogDescription>
            </DialogHeader>
            {selectedSession?.qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <img
                    src={selectedSession.qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Abra o WhatsApp no celular → Configurações → Aparelhos
                  conectados → Conectar aparelho
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsQRDialogOpen(false);
                      setSelectedSession(null);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {qrLoading ? "Carregando QR Code..." : "Aguardando QR Code..."}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}