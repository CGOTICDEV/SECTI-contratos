import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Contract } from '../types/contract';
import { getContractStatus } from '../utils/contract-helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, AlertTriangle, Calendar } from 'lucide-react';

interface DashboardProps {
  contracts: Contract[];
}

export function Dashboard({ contracts }: DashboardProps) {
  const analytics = useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let safeCount = 0;
    let expiredCount = 0;

    // financial values removed per request

    const contratosByMonth: Record<string, number> = {};
    const valorByTipo: Record<string, number> = {};

    contracts.forEach((contract) => {
      const status = getContractStatus(contract);
      const days = status.daysRemaining;

      // Contagem por status
      if (status.type === 'expired') {
        expiredCount++;
      } else if (days < 15) {
        criticalCount++;
      } else if (days < 30) {
        warningCount++;
      } else {
        safeCount++;
      }

      // skip financial aggregation

      // Contratos por mês de vencimento
      if (contract.vigenciaAtual) {
        const date = new Date(contract.vigenciaAtual);
        if (!isNaN(date.getTime())) {
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
          contratosByMonth[monthYear] = (contratosByMonth[monthYear] || 0) + 1;
        }
      }

      // Valor por tipo
      const tipo = contract.tipoRegistro || 'contrato';
      valorByTipo[tipo] = (valorByTipo[tipo] || 0) + (contract.valorAtual || 0);
    });

    // Dados para gráfico de status
    const statusData = [
      { name: 'Vencidos', value: expiredCount, color: '#DC2626' },
      { name: 'Críticos (<15d)', value: criticalCount, color: '#EA580C' },
      { name: 'Atenção (<30d)', value: warningCount, color: '#F59E0B' },
      { name: 'Seguros (>30d)', value: safeCount, color: '#10B981' },
    ].filter(item => item.value > 0);

    // Dados para gráfico de vencimentos por mês (próximos 6 meses)
    const now = new Date();
    const vencimentosPorMes = [];
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthYear = `${targetDate.getMonth() + 1}/${targetDate.getFullYear()}`;
      const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'short' });
      vencimentosPorMes.push({
        mes: monthName,
        quantidade: contratosByMonth[monthYear] || 0,
      });
    }

    // financial charts removed

    // tipoData chart removed per request

    return {
      statusData,
      vencimentosPorMes,
      totals: {
        count: contracts.length,
        critical: criticalCount + expiredCount,
      },
    };
  }, [contracts]);

  const COLORS = ['#DC2626', '#EA580C', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  return (
    <div className="space-y-6 p-6 bg-gray-50">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totals.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contratos e convênios ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.totals.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requerem atenção imediata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Classificação dos contratos por urgência</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vencimentos por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Vencimentos nos Próximos 6 Meses</CardTitle>
            <CardDescription>Quantidade de contratos vencendo por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.vencimentosPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* financial charts removed per request */}

      </div>
    </div>
  );
}
