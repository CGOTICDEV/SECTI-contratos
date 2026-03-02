import { Contract } from '../types/contract';
import { formatCurrency, formatDate, getContractStatus } from './contract-helpers';

// Função para gerar PDF (requer biblioteca jsPDF ou similar)
export async function exportToPDF(contracts: Contract[], options?: {
  title?: string;
  includeCharts?: boolean;
}) {
  // Importação dinâmica para reduzir bundle size
  const jsPDF = (await import('jspdf')).default;
  // @ts-ignore - jspdf-autotable types
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(options?.title || 'Relatório de Contratos', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Total de registros: ${contracts.length}`, pageWidth / 2, 34, { align: 'center' });

  // Resumo estatístico
  let critical = 0, warning = 0, safe = 0, expired = 0;
  let totalValor = 0;
  
  contracts.forEach(c => {
    const status = getContractStatus(c);
    totalValor += c.valorAtual || 0;
    
    if (status.type === 'expired') expired++;
    else if (status.daysRemaining < 15) critical++;
    else if (status.daysRemaining < 30) warning++;
    else safe++;
  });

  doc.setFontSize(9);
  let yPos = 42;
  doc.text(`Vencidos: ${expired} | Críticos (<15d): ${critical} | Atenção (<30d): ${warning} | Seguros: ${safe}`, 14, yPos);
  yPos += 6;
  doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 14, yPos);
  yPos += 10;

  // Tabela de contratos
  const tableData = contracts.map(contract => {
    const status = getContractStatus(contract);
    return [
      contract.numeroContrato || contract.numeroConvenio || '-',
      contract.empresa || contract.convenente || '-',
      contract.gestor || '-',
      formatDate(contract.vigenciaAtual),
      status.label,
      formatCurrency(contract.valorAtual),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Número', 'Empresa/Convenente', 'Gestor', 'Vencimento', 'Status', 'Valor']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [11, 32, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
  });

  // Salvar
  doc.save(`contratos_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Função para gerar link de compartilhamento (mock - requer backend)
export function generateShareLink(contractIds: string[]): string {
  // Em produção, isso faria uma chamada ao backend para criar um link temporário
  const baseUrl = window.location.origin;
  const ids = contractIds.join(',');
  return `${baseUrl}/share?contracts=${encodeURIComponent(ids)}`;
}

// Função para copiar link de compartilhamento
export async function copyShareLink(contractIds: string[]): Promise<void> {
  const link = generateShareLink(contractIds);
  await navigator.clipboard.writeText(link);
}

// Função para exportar relatório completo com gráficos
export async function exportDashboardReport(contracts: Contract[]) {
  // Esta função pode ser expandida para incluir gráficos usando html2canvas
  return exportToPDF(contracts, {
    title: 'Relatório Completo - Dashboard de Contratos',
    includeCharts: true,
  });
}
