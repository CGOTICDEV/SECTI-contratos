import ExcelJS from 'exceljs';
import { Contract } from '../types/contract';

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
        // Node.js / server environment
        await wb.xlsx.writeFile(fileName);
    } else {
        // browser – generate buffer, create blob and trigger download
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

export async function exportContractsToExcel(
    contracts: Contract[],
    fileName = 'relatorio-contratos.xlsx'
) {
    if (!contracts || contracts.length === 0) return;

    const cols: ColMeta[] = [
        { key: 'situacao', header: 'Status', type: 's', width: 14 },
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
    ];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Contratos');

    // configura colunas (cabeçalho + largura)
    ws.columns = cols.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width,
    }));

    // estilo do cabeçalho
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

    // adiciona dados
    contracts.forEach((c) => {
        const rowValues = cols.map((col) => {
            switch (col.key) {
                case 'vigenciaAtual':
                    return c.vigenciaAtual ? new Date(c.vigenciaAtual) : '';
                default:
                    return (c as any)[col.key] ?? '';
            }
        });
        ws.addRow(rowValues);
    });

    // estiliza células de dados (bordas, cor alternada, alinhamento, numFmt)
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

    // congela primeira linha e habilita filtro
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: cols.length },
    };

    await persistWorkbook(wb, fileName);
}

export default exportContractsToExcel;