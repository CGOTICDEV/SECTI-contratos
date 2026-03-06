// Componente de tabela virtualizada para grandes volumes de dados
import { useRef, useEffect, useState, CSSProperties } from 'react';
import { Contract } from '../types/contract';
import { getContractStatus, formatCurrency, formatDate, isConvenioType } from '../utils/contract-helpers';
import { Badge } from './ui/badge';
import { Pencil, Eye, FilePlus, FileText, Handshake } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

interface VirtualizedTableProps {
  contracts: Contract[];
  onEdit?: (contract: Contract) => void;
  onView?: (contract: Contract) => void;
  onAddApostila?: (contract: Contract) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (id: string, selected: boolean) => void;
  rowHeight?: number;
  overscan?: number;
}

export function VirtualizedContractsTable({
  contracts,
  onEdit,
  onView,
  onAddApostila,
  selectedIds = new Set(),
  onSelectionChange,
  rowHeight = 60,
  overscan = 5,
}: VirtualizedTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    container.addEventListener('scroll', handleScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const totalHeight = contracts.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    contracts.length - 1,
    Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleContracts = contracts.slice(startIndex, endIndex + 1);

  const offsetY = startIndex * rowHeight;

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-white rounded-lg border border-secti-border"
      style={{ height: '600px' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-[40px_80px_1fr_150px_120px_120px_150px] gap-4 px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">
          <div></div>
          <div>Tipo</div>
          <div>Número / Empresa</div>
          <div>Gestor</div>
          <div>Vencimento</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>
      </div>

      {/* Virtual scroll container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleContracts.map((contract, idx) => {
            const actualIndex = startIndex + idx;
            const status = getContractStatus(contract);
            const isConvenio = isConvenioType(contract.tipoRegistro);
            const isSelected = selectedIds.has(contract.id);

            return (
              <div
                key={contract.id}
                className={`grid grid-cols-[40px_80px_1fr_150px_120px_120px_150px] gap-4 px-4 py-3 border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${
                  isSelected ? 'bg-blue-50' : actualIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
                style={{ height: rowHeight }}
              >
                {/* Checkbox */}
                <div className="flex items-center">
                  {onSelectionChange && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectionChange(contract.id, !!checked)}
                    />
                  )}
                </div>

                {/* Tipo */}
                <div className="flex items-center">
                  <div className="flex items-center gap-1.5 text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                    {isConvenio ? (
                      <Handshake className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FileText className="w-3 h-3 text-blue-500" />
                    )}
                    <span className="font-medium">{contract.tipoRegistro}</span>
                  </div>
                </div>

                {/* Número / Empresa */}
                <div className="flex flex-col justify-center min-w-0">
                  <div className="font-mono text-sm font-semibold text-[#0B2046] truncate flex items-center gap-1">
                    {contract.numeroContrato || contract.numeroConvenio || '-'}
                    {((contract.apostilas && contract.apostilas.length > 0) ||
                      (contract.apostilasCount && contract.apostilasCount > 0)) && (
                      <FilePlus className="w-3 h-3 text-purple-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {contract.empresa || contract.convenente || '-'}
                  </div>
                </div>

                {/* Gestor */}
                <div className="flex items-center text-sm text-gray-700 truncate">
                  {contract.gestor || '-'}
                </div>

                {/* Vencimento */}
                <div className="flex items-center text-sm text-gray-700">
                  {formatDate(contract.vigenciaAtual)}
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <Badge
                    className={`${status.bgColor} ${status.textColor} ${status.borderColor} border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide`}
                  >
                    {status.label}
                  </Badge>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView?.(contract)}
                    className="h-8 w-8"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(contract)}
                    className="h-8 w-8"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {onAddApostila && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAddApostila(contract)}
                      className="h-8 w-8"
                      title="Adicionar apostila"
                    >
                      <FilePlus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
