import ExcelJS from 'exceljs';
import { Contract } from '../types/contract';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

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
                return c.tipoRegistro === 'convenio' ? idx + 1 : '';
            }
            switch (col.key) {
                case 'vigenciaAtual':
                    return c.vigenciaAtual ? new Date(c.vigenciaAtual) : '';
                case 'tipoRegistro':
                    return c.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato';
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

export default exportContractsToExcel;