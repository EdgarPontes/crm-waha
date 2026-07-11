import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, RefreshCw } from "lucide-react";

interface WhatsAppSession {
  id: number;
  name: string;
  phoneNumber: string;
  status: "connected" | "disconnected" | "waiting_qr" | "error";
  qrCode?: string;
  messagesReceived: number;
  messagesSent: number;
  lastActivity: Date;
  createdAt: Date;
}

export default function WhatsAppSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WhatsAppSession[]>([
    {
      id: 1,
      name: "Vendas",
      phoneNumber: "+55 11 98765-4321",
      status: "connected",
      messagesReceived: 1250,
      messagesSent: 890,
      lastActivity: new Date(),
      createdAt: new Date(),
    },
    {
      id: 2,
      name: "Suporte",
      phoneNumber: "+55 11 91234-5678",
      status: "connected",
      messagesReceived: 2340,
      messagesSent: 1560,
      lastActivity: new Date(Date.now() - 3600000),
      createdAt: new Date(),
    },
  ]);

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleAddSession = () => {
    const newSession: WhatsAppSession = {
      id: Date.now(),
      name: `Sessão ${sessions.length + 1}`,
      phoneNumber: "",
      status: "waiting_qr",
      qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      messagesReceived: 0,
      messagesSent: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
    };
    setSessions([...sessions, newSession]);
    setSelectedSessionId(newSession.id);
    setShowQRModal(true);
  };

  const handleDeleteSession = (id: number) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (selectedSessionId === id) {
      setSelectedSessionId(null);
    }
  };

  const handleReconnect = (id: number) => {
    setSessions(sessions.map(s =>
      s.id === id ? { ...s, status: "waiting_qr" as const } : s
    ));
  };

  const statusColors = {
    connected: "bg-green-100 text-green-800",
    disconnected: "bg-red-100 text-red-800",
    waiting_qr: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  const statusIcons = {
    connected: <CheckCircle2 className="h-4 w-4" />,
    disconnected: <AlertCircle className="h-4 w-4" />,
    waiting_qr: <Loader2 className="h-4 w-4 animate-spin" />,
    error: <AlertCircle className="h-4 w-4" />,
  };

  const statusLabels = {
    connected: "Conectado",
    disconnected: "Desconectado",
    waiting_qr: "Aguardando QR Code",
    error: "Erro",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sessões WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie múltiplas contas WhatsApp para atendimento
            </p>
          </div>
          <Button onClick={handleAddSession}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Sessão
          </Button>
        </div>

        {/* Sessions List */}
        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhuma sessão WhatsApp configurada. Clique em "Nova Sessão" para começar.
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-colors ${
                  selectedSessionId === session.id ? "border-blue-500 bg-blue-50" : ""
                }`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{session.name}</h3>
                        <Badge className={statusColors[session.status]}>
                          {statusIcons[session.status]}
                          <span className="ml-1">{statusLabels[session.status]}</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <p className="font-medium">Número</p>
                          <p>{session.phoneNumber || "Não configurado"}</p>
                        </div>
                        <div>
                          <p className="font-medium">Última Atividade</p>
                          <p>
                            {session.lastActivity
                              ? new Date(session.lastActivity).toLocaleString("pt-BR")
                              : "Nunca"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">Mensagens Recebidas</p>
                          <p className="text-lg font-semibold">{session.messagesReceived}</p>
                        </div>
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">Mensagens Enviadas</p>
                          <p className="text-lg font-semibold">{session.messagesSent}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {session.status === "waiting_qr" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQRModal(true);
                          }}
                        >
                          Mostrar QR
                        </Button>
                      )}
                      {session.status !== "waiting_qr" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReconnect(session.id);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* QR Code Modal */}
        {showQRModal && selectedSession && selectedSession.status === "waiting_qr" && (
          <Card className="border-blue-500 bg-blue-50">
            <CardHeader>
              <CardTitle>Conectar {selectedSession.name}</CardTitle>
              <CardDescription>
                Escaneie o QR Code abaixo com seu WhatsApp para conectar a sessão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img
                  src={selectedSession.qrCode}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                O QR Code expira em 2 minutos. Se expirar, clique em "Renovar QR Code".
              </p>
              <div className="flex gap-2 justify-center">
                <Button>Renovar QR Code</Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQRModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {sessions.filter(s => s.status === "connected").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Conectadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {sessions.reduce((sum, s) => sum + s.messagesReceived, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Recebidas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {sessions.reduce((sum, s) => sum + s.messagesSent, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Enviadas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>💡 Dica:</strong> Você pode conectar múltiplas contas WhatsApp para gerenciar diferentes departamentos ou negócios. Cada sessão funcionará independentemente.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
