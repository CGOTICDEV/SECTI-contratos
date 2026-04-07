import ExcelJS from 'exceljs';
import { Contract } from '../types/contract';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getContractStatus, isConvenioType } from './contract-helpers';

type ColMeta = {
    key: keyof Contract | string;
    header: string;
    width?: number;
    type: 's' | 'n' | 'd';
    fmt?: string;
};

async function persistWorkbook(
    wb: ExcelJS.Workbook,
    fileName: string
): Promise<void> {
    if (typeof window === 'undefined' || !window.document) {
        await wb.xlsx.writeFile(fileName);
    } else {
        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], {
            type: 'application/vnd.openxmlformats‑officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function parseValidDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addWorksheetHeader(
    ws: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    endColumn: string
) {
    ws.mergeCells(`A1:${endColumn}1`);
    ws.mergeCells(`A2:${endColumn}2`);

    const titleCell = ws.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2046' } };

    const subtitleCell = ws.getCell('A2');
    subtitleCell.value = subtitle;
    subtitleCell.font = { italic: true, color: { argb: 'FF374151' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
}

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dashboardStatusLabel(type: ReturnType<typeof getContractStatus>['type']): string {
    if (type === 'expired') return 'Vencido';
    if (type === 'critical') return 'Crítico (<15 dias)';
    if (type === 'warning') return 'Atenção (<30 dias)';
    return 'Seguro (>30 dias)';
}

function contractIdentifier(contract: Contract): string {
    return (
        contract.numeroContrato ||
        contract.numeroConvenio ||
        contract.numeroAcordoCooperacaoTecnica ||
        contract.numeroTermoCooperacaoTecnica ||
        '-'
    );
}

function contractEntity(contract: Contract): string {
    return contract.empresa || contract.convenente || '-';
}

export async function exportContractsToExcel(
    contracts: Contract[],
    fileName = 'relatorio-contratos.xlsx'
) {
    if (!contracts || contracts.length === 0) return;

    // if arrays have been migrated to subcollections we may need to fetch missing
    // apostilas for accurate export. operations run sequentially but the list is
    // usually short enough.
    for (const c of contracts) {
        if ((c.apostilasCount && c.apostilasCount > 0) && (!c.apostilas || c.apostilas.length === 0)) {
            try {
                const snap = await getDocs(collection(db, 'contracts', c.id, 'apostilas'));
                c.apostilas = snap.docs.map((d) => d.data() as any);
            } catch {
                // ignore, export will just have empty value
            }
        }
    }

    const cols: ColMeta[] = [
        { key: 'situacao', header: 'Status', type: 's', width: 14 },
        { key: 'tipoRegistro', header: 'Tipo', type: 's', width: 14 },
        { key: 'item', header: 'Item', type: 'n', width: 6 },
        { key: 'numeroAcordoCooperacaoTecnica', header: 'Nº Acordo', type: 's', width: 18 },
        { key: 'numeroTermoCooperacaoTecnica', header: 'Nº Termo', type: 's', width: 18 },
        { key: 'numeroConvenio', header: 'Nº Convênio', type: 's', width: 18 },
        { key: 'convenente', header: 'Convenente', type: 's', width: 30 },
        { key: 'numeroContrato', header: 'Nº Contrato', type: 's', width: 18 },
        { key: 'empresa', header: 'Empresa', type: 's', width: 30 },
        { key: 'objeto', header: 'Objeto', type: 's', width: 40 },
        { key: 'gestor', header: 'Gestor', type: 's', width: 20 },
        { key: 'fiscal', header: 'Fiscal', type: 's', width: 20 },
        {
            key: 'vigenciaAtual',
            header: 'Vigência Atual',
            type: 'd',
            width: 14,
            fmt: 'dd/mm/yyyy',
        },
        { key: 'valorInicial', header: 'Valor Inicial', type: 'n', width: 14, fmt: 'R$ #,##0.00' },
        { key: 'valorAtual', header: 'Valor Atual', type: 'n', width: 14, fmt: 'R$ #,##0.00' },
        {
            key: 'saldoDisponivel',
            header: 'Saldo Disponível',
            type: 'n',
            width: 16,
            fmt: 'R$ #,##0.00',
        },
        {
            key: 'valorPagoAno',
            header: 'Valor Pago Ano',
            type: 'n',
            width: 16,
            fmt: 'R$ #,##0.00',
        },
        {
            key: 'valorPagoAcumulado',
            header: 'Valor Pago Acumulado',
            type: 'n',
            width: 18,
            fmt: 'R$ #,##0.00',
        },
        { key: 'garantia', header: 'Garantia', type: 's', width: 20 },
        { key: 'ultimoTermoAditivo', header: 'Último Termo', type: 's', width: 20 },
        { key: 'termoAdesao', header: 'Termo de Adesão', type: 's', width: 20 },
        { key: 'termosAditivos', header: 'Termos Aditivos', type: 's', width: 40 },
        { key: 'apostilas', header: 'Apostilas', type: 's', width: 40 }
    ];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Contratos');

    ws.columns = cols.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width,
    }));

    ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0078D4' } };
        cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    contracts.forEach((c, idx) => {
        const rowValues = cols.map((col) => {
            if (col.key === 'item') {
                return isConvenioType(c.tipoRegistro) ? idx + 1 : '';
            }
            switch (col.key) {
                case 'vigenciaAtual':
                    return c.vigenciaAtual ? new Date(c.vigenciaAtual) : '';
                case 'tipoRegistro':
                    // export the raw string; previous behavior only distinguished contrato/convênio
                    return c.tipoRegistro || '';
                case 'termosAditivos':
                    return (c as any).termosAditivos
                        ? (c as any).termosAditivos
                              .map((a: any) => {
                                  let txt = a.note || '';
                                  if (typeof a.ajuste === 'number' && a.ajuste !== 0) {
                                      txt += ` (${a.ajuste >= 0 ? '+' : ''}${a.ajuste})`;
                                  }
                                  if (a.vigenciaInicial || a.prorrogacao) {
                                      txt += ` [${a.vigenciaInicial || '?'}→${a.prorrogacao || '?'}]`;
                                  }
                                  return txt;
                              })
                              .join(' | ')
                        : '';                case 'apostilas':
                    return (c as any).apostilas
                        ? (c as any).apostilas
                              .map((a: any) => {
                                  let txt = a.note || '';
                                  if (typeof a.ajuste === 'number' && a.ajuste !== 0) {
                                      const sign = a.ajuste >= 0 ? '+' : '';
                                      txt += ` (${sign}R$ ${Math.abs(a.ajuste).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
                                  }
                                  return txt;
                              })
                              .join('; ')
                        : '';
                default:
                    return (c as any)[col.key] ?? '';
            }
        });
        ws.addRow(rowValues);
    });

    ws.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
            const col = cols[colNumber - 1];
            cell.border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
            };

            if (rowNumber > 1 && rowNumber % 2 === 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            }

            if (col.type === 'n') {
                cell.alignment = { horizontal: 'right' };
                if (typeof cell.value === 'number' && col.fmt) cell.numFmt = col.fmt;
            } else if (col.type === 'd' && cell.value instanceof Date) {
                cell.numFmt = col.fmt || 'dd/mm/yyyy';
            }
        });
    });

    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: cols.length },
    };

    await persistWorkbook(wb, fileName);
}

export async function exportDashboardToExcel(
    contracts: Contract[],
    fileName = `dashboard-visual-${new Date().toISOString().slice(0, 10)}.xlsx`
) {
    if (!contracts || contracts.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SECTI Contratos';
    workbook.created = new Date();

    const generatedAt = new Date();
    const monthSlots = Array.from({ length: 6 }, (_, index) =>
        new Date(generatedAt.getFullYear(), generatedAt.getMonth() + index, 1)
    );

    const dueByMonth = new Map(
        monthSlots.map((date) => [
            monthKey(date),
            {
                label: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                count: 0,
            },
        ])
    );

    const statusCounts: Record<ReturnType<typeof getContractStatus>['type'], number> = {
        expired: 0,
        critical: 0,
        warning: 0,
        safe: 0,
    };

    contracts.forEach((contract) => {
        const status = getContractStatus(contract);
        statusCounts[status.type] += 1;

        const date = parseValidDate(contract.vigenciaAtual);
        if (!date) return;

        const slot = dueByMonth.get(monthKey(date));
        if (slot) {
            slot.count += 1;
        }
    });

    const totalContracts = contracts.length;
    const statusRows: [string, number, number][] = [
        ['Vencidos', statusCounts.expired, totalContracts ? statusCounts.expired / totalContracts : 0],
        [
            'Críticos (<15 dias)',
            statusCounts.critical,
            totalContracts ? statusCounts.critical / totalContracts : 0,
        ],
        [
            'Atenção (<30 dias)',
            statusCounts.warning,
            totalContracts ? statusCounts.warning / totalContracts : 0,
        ],
        ['Seguros (>30 dias)', statusCounts.safe, totalContracts ? statusCounts.safe / totalContracts : 0],
    ];

    const wsResumo = workbook.addWorksheet('Resumo');
    addWorksheetHeader(
        wsResumo,
        'Dashboard Visual - Resumo Executivo',
        'Indicadores consolidados da tela de gráficos.',
        'B'
    );
    wsResumo.addTable({
        name: 'DashboardResumo',
        ref: 'A3',
        headerRow: true,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [{ name: 'Indicador' }, { name: 'Valor' }],
        rows: [
            ['Emitido em', generatedAt.toLocaleString('pt-BR')],
            ['Total de registros', totalContracts],
            ['Alertas críticos (vencidos + <15 dias)', statusCounts.expired + statusCounts.critical],
            ['Vencidos', statusCounts.expired],
            ['Críticos (<15 dias)', statusCounts.critical],
            ['Atenção (<30 dias)', statusCounts.warning],
            ['Seguros (>30 dias)', statusCounts.safe],
        ],
    });
    wsResumo.getColumn(1).width = 44;
    wsResumo.getColumn(2).width = 28;
    wsResumo.views = [{ state: 'frozen', ySplit: 3 }];

    const wsStatus = workbook.addWorksheet('Status');
    addWorksheetHeader(
        wsStatus,
        'Distribuição por Status',
        'Base para o gráfico de pizza do Dashboard Visual.',
        'C'
    );
    wsStatus.addTable({
        name: 'DashboardStatus',
        ref: 'A3',
        headerRow: true,
        style: { theme: 'TableStyleMedium9', showRowStripes: true },
        columns: [{ name: 'Status' }, { name: 'Quantidade' }, { name: 'Percentual' }],
        rows: statusRows,
    });
    wsStatus.getColumn(1).width = 30;
    wsStatus.getColumn(2).width = 14;
    wsStatus.getColumn(3).width = 14;
    for (let rowNumber = 4; rowNumber < 4 + statusRows.length; rowNumber++) {
        wsStatus.getCell(`C${rowNumber}`).numFmt = '0.00%';
    }
    wsStatus.views = [{ state: 'frozen', ySplit: 3 }];

    const wsVencimentos = workbook.addWorksheet('Vencimentos_6M');
    addWorksheetHeader(
        wsVencimentos,
        'Vencimentos nos Próximos 6 Meses',
        'Base para o gráfico de barras do Dashboard Visual.',
        'B'
    );
    wsVencimentos.addTable({
        name: 'DashboardVencimentos',
        ref: 'A3',
        headerRow: true,
        style: { theme: 'TableStyleMedium4', showRowStripes: true },
        columns: [{ name: 'Mês' }, { name: 'Quantidade' }],
        rows: monthSlots.map((date) => {
            const slot = dueByMonth.get(monthKey(date));
            return [slot?.label || '-', slot?.count || 0];
        }),
    });
    wsVencimentos.getColumn(1).width = 24;
    wsVencimentos.getColumn(2).width = 14;
    wsVencimentos.views = [{ state: 'frozen', ySplit: 3 }];

    const wsContratos = workbook.addWorksheet('Contratos');
    addWorksheetHeader(
        wsContratos,
        'Base de Contratos do Dashboard',
        'Detalhamento completo usado na análise visual.',
        'J'
    );
    const contractRows = contracts.map((contract) => {
        const status = getContractStatus(contract);
        const vigencia = parseValidDate(contract.vigenciaAtual);
        return [
            contract.tipoRegistro || '-',
            contractIdentifier(contract),
            contractEntity(contract),
            contract.objeto || '-',
            contract.gestor || '-',
            contract.fiscal || '-',
            vigencia || '',
            dashboardStatusLabel(status.type),
            Number.isFinite(status.daysRemaining) ? status.daysRemaining : '',
            contract.valorAtual || 0,
        ];
    });
    wsContratos.addTable({
        name: 'DashboardContratos',
        ref: 'A3',
        headerRow: true,
        style: { theme: 'TableStyleMedium15', showRowStripes: true },
        columns: [
            { name: 'Tipo de Registro' },
            { name: 'Identificação' },
            { name: 'Empresa / Convenente' },
            { name: 'Objeto' },
            { name: 'Gestor' },
            { name: 'Fiscal' },
            { name: 'Vigência Atual' },
            { name: 'Status' },
            { name: 'Dias Restantes' },
            { name: 'Valor Atual (R$)' },
        ],
        rows: contractRows,
    });
    wsContratos.getColumn(1).width = 22;
    wsContratos.getColumn(2).width = 20;
    wsContratos.getColumn(3).width = 32;
    wsContratos.getColumn(4).width = 44;
    wsContratos.getColumn(5).width = 24;
    wsContratos.getColumn(6).width = 24;
    wsContratos.getColumn(7).width = 14;
    wsContratos.getColumn(8).width = 20;
    wsContratos.getColumn(9).width = 14;
    wsContratos.getColumn(10).width = 18;
    wsContratos.getColumn(7).numFmt = 'dd/mm/yyyy';
    wsContratos.getColumn(10).numFmt = 'R$ #,##0.00';
    wsContratos.views = [{ state: 'frozen', ySplit: 3 }];

    await persistWorkbook(workbook, fileName);
}

export default exportContractsToExcel;