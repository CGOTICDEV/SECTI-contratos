import { Contract } from '../types/contract';
import { getContractStatus, formatCurrency, formatDate } from '../utils/contract-helpers';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Pencil } from 'lucide-react';
import { Button } from './ui/button';
import { exportContractsToExcel } from '../utils/excel';

interface ContractsTableProps {
  contracts: Contract[];
  onEdit?: (contract: Contract) => void;
  /** called when a row is clicked outside of the edit button */
  onView?: (contract: Contract) => void;
}

export function ContractsTable({ contracts, onEdit, onView }: ContractsTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-secti-border">
        <p className="text-secti-muted font-sans italic">Nenhum contrato detectado no radar com os filtros selecionados.</p>
      </div>
    );
  }

  // determine if any record is a convênio so we can adjust columns
  const hasConvenios = contracts.some((c) => c.tipoRegistro === 'convenio');

  return (
    <div className="bg-secti-surface rounded-lg border border-secti-border overflow-hidden shadow-card">
      <div className="flex justify-end p-4">
        <Button
          size="sm"
          onClick={() => exportContractsToExcel(contracts)}
          className="h-8"
        >
          Exportar Excel
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b border-secti-border">
            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Tipo</TableHead>

            {hasConvenios && (
              <>
                <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Item</TableHead>
                <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Nº Acordo</TableHead>
                <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Nº Termo</TableHead>
                <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Nº Convênio</TableHead>
                <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Convenente / Objeto</TableHead>
              </>
            )}

            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider font-mono">Nº Contrato</TableHead>
            {!hasConvenios && (
              <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Empresa / Objeto</TableHead>
            )}
            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Gestor / Fiscal</TableHead>
            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Vigência Atual</TableHead>
            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider">Saldo & Garantia</TableHead>
            <TableHead className="text-xs font-semibold text-secti-muted uppercase tracking-wider text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract, idx) => {
            const status = getContractStatus(contract);
            return (
              <TableRow 
                key={contract.id} 
                className="bg-white hover:bg-gray-50 transition-colors border-b border-secti-border last:border-0 cursor-pointer"
                onClick={() => onView?.(contract)}
              >
                <TableCell>
                  <Badge
                    className={`
                      ${status.bgColor} ${status.textColor} ${status.borderColor}
                      border px-3 py-1 font-medium rounded-md text-xs
                    `}
                  >
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {contract.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato'}
                </TableCell>
                {hasConvenios && (
                  <>
                    <TableCell className="font-mono text-sm">
                      {contract.tipoRegistro === 'convenio' ? idx + 1 : ''}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{contract.numeroAcordoCooperacaoTecnica || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{contract.numeroTermoCooperacaoTecnica || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{contract.numeroConvenio || '-'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-secti-text truncate">
                          {contract.convenente || contract.empresa}
                        </p>
                        <p className="text-xs text-secti-muted truncate">{contract.objeto}</p>
                      </div>
                    </TableCell>
                  </>
                )}
                <TableCell className="font-mono text-sm font-bold text-secti-primary">
                  {contract.numeroContrato}
                </TableCell>
                {!hasConvenios && (
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm font-semibold text-secti-text truncate">{contract.empresa}</p>
                      <p className="text-xs text-secti-muted truncate">{contract.objeto}</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium text-secti-text">{contract.gestor}</p>
                    <p className="text-xs text-secti-muted">{contract.fiscal}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-secti-text">
                  {formatDate(contract.vigenciaAtual)}
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">
                    <p className="font-bold text-secti-primary">
                      {formatCurrency(contract.saldoDisponivel)}
                    </p>
                    {contract.garantia && (
                      <p className="text-[10px] uppercase text-secti-muted truncate max-w-[150px]">
                        {contract.garantia}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onEdit?.(contract); }}
                      className="h-8 w-8 p-0 text-secti-primary hover:bg-secti-accent/10 focus:ring-2 focus:ring-secti-accent"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}