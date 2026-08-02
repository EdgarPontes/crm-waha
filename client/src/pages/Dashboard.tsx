import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  Bot,
  HeadsetIcon,
  PhoneMissed,
  CheckCircle2,
  BarChart3,
  TrendingDown,
} from "lucide-react";
import { useState, useMemo } from "react";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

type Period = "7d" | "30d" | "90d" | "365d";

function getDateRange(period: Period): { startDate: Date; endDate: Date; groupBy: "day" | "week" | "month" } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const days: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
  const groupBy: Record<Period, "day" | "week" | "month"> = { "7d": "day", "30d": "day", "90d": "week", "365d": "month" };

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days[period]);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate, groupBy: groupBy[period] };
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4" style={{ color }} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const { startDate, endDate, groupBy } = useMemo(() => getDateRange(period), [period]);

  const { data: metrics, isLoading } = trpc.dashboard.metrics.useQuery({ startDate, endDate });
  const { data: salesByPeriod, isLoading: salesLoading } = trpc.dashboard.salesByPeriod.useQuery({
    startDate,
    endDate,
    groupBy,
  });
  const { data: conversationsByPeriod, isLoading: convPeriodLoading } =
    trpc.dashboard.conversationsByPeriod.useQuery({ startDate, endDate, groupBy });
  const { data: agentMetrics, isLoading: agentLoading } = trpc.dashboard.agentMetrics.useQuery({
    startDate,
    endDate,
  });
  const { data: aiMetrics, isLoading: aiLoading } = trpc.dashboard.aiMetrics.useQuery({
    startDate,
    endDate,
  });

  const isLoadingAny = isLoading || salesLoading || convPeriodLoading || agentLoading || aiLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo, {user?.name || "Usuário"}! Aqui está um resumo do seu CRM.
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingAny ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="Conversas Ativas"
                value={metrics?.conversations?.active ?? 0}
                subtitle={`${metrics?.conversations?.waitingHuman ?? 0} aguardando atendente`}
                icon={MessageSquare}
                color="#3b82f6"
              />
              <MetricCard
                title="Leads Totais"
                value={metrics?.leads?.total ?? 0}
                subtitle={`${metrics?.leads?.won ?? 0} convertidos`}
                icon={Users}
                color="#10b981"
              />
              <MetricCard
                title="Taxa de Conversão"
                value={`${metrics?.leads?.conversionRate ?? 0}%`}
                subtitle="Último período"
                icon={TrendingUp}
                color="#f59e0b"
              />
              <MetricCard
                title="Tempo Médio Resposta"
                value={`${metrics?.avgResponseTime ?? 0}m`}
                subtitle="Minutos"
                icon={Clock}
                color="#8b5cf6"
              />
            </>
          )}
        </div>

        {/* Charts Row 1 - Time Series */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Período</CardTitle>
              <CardDescription>Leads criados vs convertidos vs perdidos</CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  {salesByPeriod && salesByPeriod.length > 0 ? (
                    <LineChart data={salesByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Criados" strokeWidth={2} />
                      <Line type="monotone" dataKey="won" stroke="#10b981" name="Ganhos" strokeWidth={2} />
                      <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Perdidos" strokeWidth={2} />
                    </LineChart>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mb-2" />
                      <p>Sem dados para este período</p>
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversas por Período</CardTitle>
              <CardDescription>Novas conversas ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {convPeriodLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  {conversationsByPeriod && conversationsByPeriod.length > 0 ? (
                    <AreaChart data={conversationsByPeriod}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Conversas" />
                    </AreaChart>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-2" />
                      <p>Sem dados para este período</p>
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="agents">Atendentes</TabsTrigger>
            <TabsTrigger value="ai">IA</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Conversas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingAny ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ativas</span>
                        <span className="font-bold text-blue-500">{metrics?.conversations?.active ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aguardando Humano</span>
                        <span className="font-bold text-yellow-500">{metrics?.conversations?.waitingHuman ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Encerradas</span>
                        <span className="font-bold text-green-500">{metrics?.conversations?.closed ?? 0}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground font-semibold">Total</span>
                        <span className="font-bold">{metrics?.conversations?.total ?? 0}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Leads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingAny ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total de Leads</span>
                        <span className="font-bold">{metrics?.leads?.total ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ganhos</span>
                        <span className="font-bold text-green-500"><CheckCircle2 className="h-4 w-4 inline mr-1" />{metrics?.leads?.won ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Perdidos</span>
                        <span className="font-bold text-red-500"><PhoneMissed className="h-4 w-4 inline mr-1" />{metrics?.leads?.lost ?? 0}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground font-semibold">Taxa de Conversão</span>
                        <span className="font-bold">{metrics?.leads?.conversionRate ?? 0}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conversas */}
          <TabsContent value="conversations" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Conversas</CardTitle>
                  <CardDescription>Status atual das conversas</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAny ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : metrics ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Ativas", value: metrics.conversations.active },
                            { name: "Aguardando", value: metrics.conversations.waitingHuman },
                            { name: "Encerradas", value: metrics.conversations.closed },
                          ]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Resposta</CardTitle>
                  <CardDescription>Tempo médio de resposta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingAny ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo Médio Resposta</span>
                        <span className="font-bold">{metrics?.avgResponseTime ?? 0} minutos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo Médio Atendimento</span>
                        <span className="font-bold">{metrics?.avgAttendanceTime ?? 0} minutos</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leads */}
          <TabsContent value="leads" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Leads</CardTitle>
                  <CardDescription>Criados vs Ganhos vs Perdidos</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAny ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: "Criados", value: metrics?.leads?.total ?? 0 },
                          { name: "Ganhos", value: metrics?.leads?.won ?? 0 },
                          { name: "Perdidos", value: metrics?.leads?.lost ?? 0 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          {(metrics?.leads?.total ?? 0) > 0 && [
                            { name: "Criados", value: metrics?.leads?.total ?? 0 },
                            { name: "Ganhos", value: metrics?.leads?.won ?? 0 },
                            { name: "Perdidos", value: metrics?.leads?.lost ?? 0 },
                          ].map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Período</CardTitle>
                  <CardDescription>Tendência temporal</CardDescription>
                </CardHeader>
                <CardContent>
                  {salesLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : salesByPeriod && salesByPeriod.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={salesByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Criados" strokeWidth={2} />
                        <Line type="monotone" dataKey="won" stroke="#10b981" name="Ganhos" strokeWidth={2} />
                        <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Perdidos" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <TrendingDown className="h-12 w-12 mb-2" />
                      <p>Sem dados de vendas no período</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Atendentes */}
          <TabsContent value="agents" className="space-y-4 mt-4">
            {agentLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            ) : agentMetrics?.agents && agentMetrics.agents.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard
                    title="Total Atendentes"
                    value={agentMetrics.totalAgents}
                    subtitle="Cadastrados"
                    icon={Users}
                    color="#3b82f6"
                  />
                  <MetricCard
                    title="Atendentes Ativos"
                    value={agentMetrics.activeAgents}
                    subtitle="Com interações no período"
                    icon={HeadsetIcon}
                    color="#10b981"
                  />
                  <MetricCard
                    title="Total Atendimentos"
                    value={agentMetrics.totalAttendances}
                    subtitle="No período"
                    icon={CheckCircle2}
                    color="#f59e0b"
                  />
                  <MetricCard
                    title="Tempo Médio Atend."
                    value={`${agentMetrics.avgAttendanceTime}m`}
                    subtitle="Minutos"
                    icon={Clock}
                    color="#8b5cf6"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho por Atendente</CardTitle>
                    <CardDescription>Leads e atendimentos por agente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={agentMetrics.agents}
                        layout="vertical"
                        margin={{ left: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" fontSize={12} width={90} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalLeads" fill="#3b82f6" name="Leads" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="wonLeads" fill="#10b981" name="Ganhos" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="totalAttendances" fill="#f59e0b" name="Atendimentos" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 flex items-center justify-center h-[200px] text-muted-foreground">
                  <Users className="h-12 w-12 mr-3" />
                  <p>Nenhum dado de atendente disponível para este período</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* IA */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            {aiLoading ? (
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard
                    title="Conversas IA"
                    value={aiMetrics?.aiConversationsTotal ?? 0}
                    subtitle="Total de conversas com IA"
                    icon={Bot}
                    color="#8b5cf6"
                  />
                  <MetricCard
                    title="IA Ativas"
                    value={aiMetrics?.activeConversations ?? 0}
                    subtitle="Conversas ativas com IA"
                    icon={Bot}
                    color="#3b82f6"
                  />
                  <MetricCard
                    title="Mensagens Processadas"
                    value={aiMetrics?.messagesProcessed ?? 0}
                    subtitle="Mensagens respondidas pela IA"
                    icon={MessageSquare}
                    color="#10b981"
                  />
                  <MetricCard
                    title="Handoffs"
                    value={aiMetrics?.handoffCount ?? 0}
                    subtitle="Transferências para humano"
                    icon={HeadsetIcon}
                    color="#f59e0b"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo de IA</CardTitle>
                    <CardDescription>Visão geral do desempenho da IA</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: "Mensagens IA", value: aiMetrics?.messagesProcessed ?? 0, fill: "#8b5cf6" },
                          { name: "Handoffs", value: aiMetrics?.handoffCount ?? 0, fill: "#f59e0b" },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#f59e0b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
