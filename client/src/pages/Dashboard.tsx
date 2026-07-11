import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, MessageSquare, TrendingUp, Clock } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: metrics, isLoading } = trpc.dashboard.metrics.useQuery({});

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stageData = (metrics?.stages as Array<{ name: string; leadCount: number }> | undefined)?.map((s) => ({
    name: s.name,
    leads: s.leadCount,
  })) || [];

  const conversionData = [
    { name: "Criados", value: metrics?.leads?.total || 0 },
    { name: "Ganhos", value: metrics?.leads?.won || 0 },
    { name: "Perdidos", value: metrics?.leads?.lost || 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo, {user?.name || "Usuário"}! Aqui está um resumo do seu CRM.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.conversations?.active || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.conversations?.waitingHuman || 0} aguardando atendente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Totais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.leads?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.leads?.won || 0} convertidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.metrics?.conversionRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.metrics?.avgResponseTime || 0}m</div>
              <p className="text-xs text-muted-foreground">
                Minutos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads por Estágio</CardTitle>
              <CardDescription>
                Distribuição de leads no funil de vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
              <CardDescription>
                Leads criados vs. convertidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="ai">IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Geral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Conversas</p>
                    <p className="text-2xl font-bold">{metrics?.conversations?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversas Encerradas</p>
                    <p className="text-2xl font-bold">{metrics?.conversations?.closed || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de IA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
