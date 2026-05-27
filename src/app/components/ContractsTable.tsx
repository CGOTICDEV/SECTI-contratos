import { Contract } from '../types/contract';
import { getContractStatus, formatCurrency, formatDate, isConvenioType } from '../utils/contract-helpers';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Pencil, Download, SearchX, FileText, Handshake, Eye, FilePlus } from 'lucide-react';
import { Button } from './ui/button';
import { exportContractsToExcel } from '../utils/excel';

interface ContractsTableProps {
  contracts: Contract[];
  allContracts?: Contract[];
  onEdit?: (contract: Contract) => void;
  onView?: (contract: Contract) => void;
  onAddApostila?: (contract: Contract) => void;
  onAddTermoAditivo?: (contract: Contract) => void;
}

export function ContractsTable({
  contracts,
  allContracts,
  onEdit,
  onView,
  onAddApostila,
  onAddTermoAditivo,
}: ContractsTableProps) {
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

  const hasConvenios = contracts.some((c) => isConvenioType(c.tipoRegistro));
  const contractsToExport = allContracts && allContracts.length > 0 ? allContracts : contracts;

  return (
    <div className="bg-white rounded-lg border border-secti-border overflow-hidden shadow-sm flex flex-col">

      {/* Header section - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 lg:px-6 border-b border-gray-100 bg-gray-50/50 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-[#0B2046] uppercase tracking-wide">
            Registros Encontrados
          </h2>
          <Badge variant="outline" className="bg-white text-secti-primary font-mono border-gray-200">
            {allContracts && allContracts.length > 0 ? allContracts.length : contracts.length}
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={() => exportContractsToExcel(contractsToExport)}
          className="h-9 gap-2 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Excel (Todos)
        </Button>
      </div>

      {/* MOBILE VIEW (Cards) */}
      <div className="block md:hidden flex-col">
        {contracts.map((contract, idx) => {
          const status = getContractStatus(contract);
          const isConvenio = isConvenioType(contract.tipoRegistro);

          return (
            <div
              key={contract.id}
              onClick={() => onView?.(contract)}
              className="p-4 border-b border-gray-100 last:border-0 hover:bg-blue-50/40 active:bg-blue-50/60 transition-colors flex flex-col gap-3 cursor-pointer"
            >
              {/* Header: Status and Type/Number */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2 py-1 rounded w-fit border border-gray-100">
                    {isConvenio ? <Handshake className="w-3.5 h-3.5 text-indigo-500" /> : <FileText className="w-3.5 h-3.5 text-blue-500" />}
                    <span className="text-[11px] font-medium uppercase tracking-wider">{contract.tipoRegistro}</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-[#0B2046] flex items-center gap-1">
                    {contract.numeroContrato || contract.numeroConvenio || '-'}
                    {((contract.apostilas && contract.apostilas.length > 0) || (contract.apostilasCount && contract.apostilasCount > 0)) && (
                      <FilePlus className="w-4 h-4 text-purple-500" aria-hidden="true" />
                    )}
                    {contract.termosAditivos && contract.termosAditivos.length > 0 && (
                      <Handshake className="w-4 h-4 text-green-500" aria-hidden="true" />
                    )}
                  </div>
                </div>
                <Badge
                  className={`
                    ${status.bgColor} ${status.textColor} ${status.borderColor}
                    border px-2 py-0.5 font-semibold rounded-md text-[10px] uppercase tracking-wide shadow-sm text-center
                  `}
                >
                  {status.label}
                </Badge>
              </div>

              {/* Body: Empresa/Convenente & Objeto */}
              <div>
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                  {contract.convenente || contract.empresa || 'Não informado'}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {contract.objeto || 'Sem descrição'}
                </p>
              </div>

              {/* Footer Details: Vigência e Saldo (mobile) */}
              <div className="mt-1 bg-gray-50/50 p-2.5 rounded-md border border-gray-50">
                <div className="flex flex-col gap-0.5 text-right items-end">
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Vigência / Saldo</span>
                  <span className="font-mono text-xs font-medium text-gray-700">{formatDate(contract.vigenciaAtual)}</span>
                  <span className="font-mono text-xs font-bold text-[#0B2046] truncate max-w-[120px]">{formatCurrency(contract.saldoDisponivel)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-1.5 pt-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onView?.(contract); }}
                  className="h-8 px-2 text-gray-600 border-gray-200"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onEdit(contract); }}
                    className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                {onAddApostila && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onAddApostila(contract); }}
                    className="h-8 px-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    <FilePlus className="h-4 w-4 mr-1" />
                    Apostila
                  </Button>
                )}
                {onAddTermoAditivo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onAddTermoAditivo(contract); }}
                    className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Handshake className="h-4 w-4 mr-1" />
                    Termo
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW (Table) */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
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
                <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 min-w-[250px]">Objeto</TableHead>
              )}

              {/* Gestor / Fiscal column removed per UI decision (CCC only) */}
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Vigência Atual</TableHead>
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 whitespace-nowrap">Saldo & Garantia</TableHead>
              <TableHead className="text-[11px] font-bold text-secti-muted uppercase tracking-wider h-11 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {contracts.map((contract, idx) => {
              const status = getContractStatus(contract);
              const isConvenio = isConvenioType(contract.tipoRegistro);

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
                    <div className="flex items-center gap-1">
                      {contract.numeroContrato || '-'}
                      {contract.apostilas && contract.apostilas.length > 0 && (
                        <FilePlus className="w-4 h-4 text-purple-500" aria-hidden="true" />
                      )}
                    </div>
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

                  {/* Gestor / Fiscal column removed from table rows */}

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-fit">
                      <span className="font-mono text-xs text-gray-700 font-medium">
                        {formatDate(contract.vigenciaAtual)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <p className="font-mono text-sm font-bold text-[#0B2046] truncate max-w-[140px]">
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
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onEdit(contract); }}
                          className="h-8 w-8 text-gray-500 hover:text-green-600 hover:bg-green-50"
                          title="Editar Registro"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      )}
                      {onAddApostila && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onAddApostila(contract); }}
                          className="h-8 w-8 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                          title="Adicionar Apostila"
                        >
                          <FilePlus className="h-4 w-4" />
                          <span className="sr-only">Apostila</span>
                        </Button>
                      )}
                      {onAddTermoAditivo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onAddTermoAditivo(contract); }}
                          className="h-8 w-8 text-gray-500 hover:text-green-600 hover:bg-green-50"
                          title="Adicionar Termo Aditivo"
                        >
                          <Handshake className="h-4 w-4" />
                          <span className="sr-only">Termo Aditivo</span>
                        </Button>
                      )}
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