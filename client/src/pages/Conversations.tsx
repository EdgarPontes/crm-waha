import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Send, Search, Phone, Info, Plus } from "lucide-react";

interface Conversation {
  id: number;
  contactId: number;
  leadId?: number;
  status: "active" | "waiting_human" | "closed";
  currentAssignedUserId?: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
  contact?: {
    id: number;
    whatsappNumber: string;
    name: string;
    lastInteractionAt: Date;
  };
}

interface ConversationListItem {
  id: number;
  contactId: number;
  leadId?: number;
  status: "active" | "waiting_human" | "closed";
  currentAssignedUserId?: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
  contact?: {
    id: number;
    whatsappNumber: string;
    name: string;
    lastInteractionAt: Date;
  };
}

export default function Conversations() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch conversations
  const { data: conversations, isLoading } = trpc.conversations.list.useQuery<
    ConversationListItem[]
  >({
    status: "active",
    limit: 50,
  });

  // Fetch selected conversation details
  const { data: selectedConversationData } = trpc.conversations.get.useQuery(
    { id: selectedConversationId || 0 },
    { enabled: !!selectedConversationId }
  );

  const selectedConversation = selectedConversationData as any;

  // Send message mutation
  const sendMessageMutation = trpc.conversations.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      // Refetch conversation
    },
  });

  const handleSendMessage = () => {
    if (!selectedConversationId || !messageText.trim()) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      type: "text",
      content: messageText,
    });
  };

  const filteredConversations =
    conversations?.filter(
      conv =>
        conv.id.toString().includes(searchTerm) ||
        conv.contactId.toString().includes(searchTerm)
    ) || [];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] gap-4">
        {/* Left Panel - Conversations List */}
        <div className="w-80 flex flex-col border rounded-lg">
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <h2 className="text-xl font-bold">Mensagens</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando conversas...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                      selectedConversationId === conv.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          Conversa #{conv.id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Contato #{conv.contactId}
                        </p>
                      </div>
                      {conv.status === "waiting_human" && (
                        <Badge variant="destructive" className="text-xs">
                          Aguardando Atendente
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Chat */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col border rounded-lg">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/50">
              <div>
                <h3 className="font-bold">
                  Conversa #{selectedConversation?.id}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Contato #{selectedConversation?.contactId}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages?.map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.senderId === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.senderId === user?.id
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !messageText.trim() || sendMessageMutation.isPending
                  }
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {selectedConversation.status === "waiting_human" && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Esta conversa está aguardando um atendente
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/50">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Selecione uma conversa para começar
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conversa
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
