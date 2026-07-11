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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Edit2, Trash2, Mail, Phone, User, Loader2 } from "lucide-react";

interface Contact {
  id: number;
  whatsappNumber: string;
  name: string | null;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastInteractionAt: Date;
}

export default function Contacts() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    whatsappNumber: "",
    email: "",
    phone: "",
  });

  const { data: contacts, isLoading } = trpc.crm.listContacts.useQuery(
    { limit: 100, offset: 0 },
    { refetchOnWindowFocus: false }
  );

  const createMutation = trpc.crm.createContact.useMutation({
    onSuccess: () => {
      resetForm();
      utils.crm.listContacts.invalidate();
    },
  });

  const updateMutation = trpc.crm.updateContact.useMutation({
    onSuccess: () => {
      resetForm();
      utils.crm.listContacts.invalidate();
    },
  });

  const deleteMutation = trpc.crm.deleteContact.useMutation({
    onSuccess: () => {
      utils.crm.listContacts.invalidate();
    },
  });

  const handleSave = () => {
    if (!formData.name.trim() || !formData.whatsappNumber.trim()) {
      alert("Preencha nome e WhatsApp");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        whatsappNumber: formData.whatsappNumber,
        email: formData.email,
        phone: formData.phone,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        whatsappNumber: formData.whatsappNumber,
        email: formData.email,
        phone: formData.phone,
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name || "",
      whatsappNumber: contact.whatsappNumber,
      email: contact.email || "",
      phone: contact.phone || "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este contato?")) {
      deleteMutation.mutate({ id });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", whatsappNumber: "", email: "", phone: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredContacts =
    contacts?.filter(
      (contact) =>
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.whatsappNumber.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm)
    ) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus contatos e leads
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contato
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Contato" : "Criar Novo Contato"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do contato"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    placeholder="+55 11 99999-9999"
                    value={formData.whatsappNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsappNumber: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="+55 11 99999-9999"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingId
                      ? "Atualizar"
                      : "Criar Contato"
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Contacts List */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Carregando contatos...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm
                  ? "Nenhum contato encontrado"
                  : "Nenhum contato cadastrado. Clique em \"Novo Contato\" para começar."}
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Contato</th>
                      <th className="pb-3 font-medium">WhatsApp</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Telefone</th>
                      <th className="pb-3 font-medium">Última Interação</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-muted/50">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{contact.name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">
                                ID: {contact.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{contact.whatsappNumber}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          {contact.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{contact.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4">
                          {contact.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{contact.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {new Date(contact.lastInteractionAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contact)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(contact.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{contacts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Contatos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {contacts?.filter((c) => c.email).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Com Email</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {contacts?.filter((c) => c.phone).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Com Telefone</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}