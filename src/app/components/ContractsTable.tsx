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
import { Pencil, Download, SearchX, FileText, Handshake, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { exportContractsToExcel } from '../utils/excel';

interface ContractsTableProps {
  contracts: Contract[];
  onEdit?: (contract: Contract) => void;
  /** called when a row is clicked outside of the edit button */
  onView?: (contract: Contract) => void;
}

export function ContractsTable({ contracts, onEdit, onView }: ContractsTableProps) {
  // Estado Vazio (Empty State)
  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-secti-border shadow-sm">
        <div className="bg-gray-50 p-4 rounded-full mb-4 border border-gray-100">
          <SearchX className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-[#0B2046] mb-1">Nenhum registro encontrado</h3>
        <p className="text-sm text-secti-muted max-w-md text-center">
          Não localizamos contratos ou convênios no radar com os filtros ou termos de pesquisa selecionados no momento.
        </p>
      </div>
    );
  }

  // determine if any record is a convênio so we can adjust columns
  const hasConvenios = contracts.some((c) => c.tipoRegistro === 'convenio');

  return (
    <div className="bg-white rounded-lg border border-secti-border overflow-hidden shadow-sm flex flex-col">
      
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 lg:px-6 border-b border-gray-100 bg-gray-50/50 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-[#0B2046] uppercase tracking-wide">
            Registros Encontrados
          </h2>
          <Badge variant="outline" className="bg-white text-secti-primary font-mono border-gray-200">
            {contracts.length}
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={() => exportContractsToExcel(contracts)}
          className="h-9 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-secti-border">
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11">Status</TableHead>
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11">Tipo</TableHead>

              {hasConvenios && (
                <>
                  <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 text-center w-12">Item</TableHead>
                  <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Nº Acordo</TableHead>
                  <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Nº Termo</TableHead>
                  <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Nº Convênio</TableHead>
                  <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 min-w-[200px]">Convenente / Objeto</TableHead>
                </>
              )}

              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Nº Contrato</TableHead>
              
              {!hasConvenios && (
                <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 min-w-[250px]">Empresa / Objeto</TableHead>
              )}
              
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11">Gestor / Fiscal</TableHead>
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Vigência Atual</TableHead>
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Saldo & Garantia</TableHead>
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {contracts.map((contract, idx) => {
              const status = getContractStatus(contract);
              const isConvenio = contract.tipoRegistro === 'convenio';
              
              return (
                <TableRow 
                  key={contract.id} 
                  className="bg-white hover:bg-blue-50/40 transition-colors border-b border-gray-100 last:border-0 cursor-pointer group"
                  onClick={() => onView?.(contract)}
                >
                  <TableCell className="py-3">
                    <Badge
                      className={`
                        ${status.bgColor} ${status.textColor} ${status.borderColor}
                        border px-2.5 py-0.5 font-semibold rounded-md text-[11px] uppercase tracking-wide whitespace-nowrap shadow-sm
                      `}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2 py-1 rounded w-fit border border-gray-100">
                      {isConvenio ? <Handshake className="w-3.5 h-3.5 text-indigo-500" /> : <FileText className="w-3.5 h-3.5 text-blue-500" />}
                      <span className="text-xs font-medium">{isConvenio ? 'Convênio' : 'Contrato'}</span>
                    </div>
                  </TableCell>

                  {hasConvenios && (
                    <>
                      <TableCell className="font-mono text-xs text-center text-gray-400">
                        {isConvenio ? (idx + 1).toString().padStart(2, '0') : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">{contract.numeroAcordoCooperacaoTecnica || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">{contract.numeroTermoCooperacaoTecnica || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">{contract.numeroConvenio || '-'}</TableCell>
                      <TableCell className="py-3">
                        <div className="max-w-[240px]">
                          <p className="text-sm font-semibold text-gray-900 truncate" title={contract.convenente || contract.empresa}>
                            {contract.convenente || contract.empresa || 'Não informado'}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5" title={contract.objeto}>
                            {contract.objeto || 'Sem descrição'}
                          </p>
                        </div>
                      </TableCell>
                    </>
                  )}

                  <TableCell className="font-mono text-sm font-bold text-[#0B2046] py-3">
                    {contract.numeroContrato || '-'}
                  </TableCell>

                  {!hasConvenios && (
                    <TableCell className="py-3">
                      <div className="max-w-[280px]">
                        <p className="text-sm font-semibold text-gray-900 truncate" title={contract.empresa}>
                          {contract.empresa || 'Não informada'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5" title={contract.objeto}>
                          {contract.objeto || 'Sem descrição'}
                        </p>
                      </div>
                    </TableCell>
                  )}

                  <TableCell className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]" title={contract.gestor}>
                        {contract.gestor || '-'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate max-w-[140px]" title={contract.fiscal}>
                        {contract.fiscal || '-'}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-fit">
                      <span className="font-mono text-xs text-gray-700 font-medium">
                        {formatDate(contract.vigenciaAtual)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <p className="font-mono text-sm font-bold text-[#0B2046]">
                        {formatCurrency(contract.saldoDisponivel)}
                      </p>
                      {contract.garantia && (
                        <p className="text-[10px] font-medium uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded w-fit mt-1 truncate max-w-[150px]" title={contract.garantia}>
                          Gar: {contract.garantia}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right pr-6 py-3">
                    <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onView?.(contract); }}
                        className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Ver Detalhes"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Visualizar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onEdit?.(contract); }}
                        className="h-8 w-8 text-gray-500 hover:text-green-600 hover:bg-green-50"
                        title="Editar Registro"
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
    </div>
  );
}