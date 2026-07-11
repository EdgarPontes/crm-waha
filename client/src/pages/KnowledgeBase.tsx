import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Upload, Search, FileText, Trash2, Download, Plus } from "lucide-react";

interface Document {
  id: number;
  fileName: string;
  fileType: "pdf" | "docx" | "txt" | "csv";
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy?: string;
  size?: number;
}

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = trpc.ai.knowledgeBase.upload.useMutation({
    onSuccess: (data) => {
      setDocuments([...documents, data as Document]);
      setSelectedFile(null);
    },
  });

  const [searchResults, setSearchResults] = useState<any>(null);
  const searchQuery2 = searchQuery;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const fileType = selectedFile.name.split(".").pop()?.toLowerCase() as any;
    if (!["pdf", "docx", "txt", "csv"].includes(fileType)) {
      alert("Tipo de arquivo não suportado");
      return;
    }

    uploadMutation.mutate({
      fileName: selectedFile.name,
      fileType,
      fileUrl: URL.createObjectURL(selectedFile),
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    // Simulating search results
    setSearchResults({
      query: searchQuery,
      results: [
        "Resultado 1 da busca",
        "Resultado 2 da busca",
        "Resultado 3 da busca",
      ],
      count: 3,
    });
  };

  const fileTypeColors: Record<string, string> = {
    pdf: "bg-red-100 text-red-800",
    docx: "bg-blue-100 text-blue-800",
    txt: "bg-gray-100 text-gray-800",
    csv: "bg-green-100 text-green-800",
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Base de Conhecimento</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie documentos para consulta automática pela IA
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="search">Buscar</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload de Documentos</CardTitle>
                <CardDescription>
                  Envie PDFs, Word, TXT ou CSV para a IA consultar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <input
                    type="file"
                    id="file-input"
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.txt,.csv"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("file-input")?.click()}
                  >
                    Selecionar Arquivo
                  </Button>
                  {selectedFile && (
                    <div className="mt-4 text-sm">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending}
                        className="mt-2"
                      >
                        {uploadMutation.isPending ? "Enviando..." : "Enviar"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Documentos Carregados</CardTitle>
                <CardDescription>
                  {documents.length} documento{documents.length !== 1 ? "s" : ""} na base de conhecimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum documento enviado ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.uploadedAt
                                ? new Date(doc.uploadedAt).toLocaleDateString("pt-BR")
                                : "Data desconhecida"}
                            </p>
                          </div>
                          <Badge className={fileTypeColors[doc.fileType]}>
                            {doc.fileType.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Buscar na Base de Conhecimento</CardTitle>
                <CardDescription>
                  Teste como a IA buscará informações nos documentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua pergunta ou termo de busca..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  {searchResults && (
                    <Button
                      onClick={handleClearSearch}
                      variant="outline"
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Search Results */}
                {searchResults && searchResults.count > 0 && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm font-medium">
                      {searchResults.count} resultado{searchResults.count !== 1 ? "s" : ""} encontrado{searchResults.count !== 1 ? "s" : ""}
                    </p>
                    {searchResults.results?.map((result: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">{result}</p>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults?.count === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>💡 Dica:</strong> A IA consultará automaticamente estes documentos ao responder mensagens de clientes. Mantenha a base de conhecimento atualizada para melhores respostas.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
