import { Check, Download, FileText, Trash2, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface BulkActionsProps {
  selectedCount: number;
  onExport: () => void;
  onClearSelection: () => void;
  onBulkEdit?: () => void;
  onBulkDelete?: () => void;
  onMarkVerified?: () => void;
}

export function BulkActions({
  selectedCount,
  onExport,
  onClearSelection,
  onBulkEdit,
  onBulkDelete,
  onMarkVerified,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5" />
        <span className="font-semibold">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
      </div>

      <div className="h-6 w-px bg-white/30" />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onExport}
          className="bg-white text-blue-600 hover:bg-gray-100 h-8"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>

        {(onBulkEdit || onBulkDelete || onMarkVerified) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 text-white hover:bg-white/30 h-8"
              >
                Mais Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onBulkEdit && (
                <DropdownMenuItem onClick={onBulkEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar em Lote
                </DropdownMenuItem>
              )}
              {onMarkVerified && (
                <DropdownMenuItem onClick={onMarkVerified}>
                  <Check className="w-4 h-4 mr-2" />
                  Marcar como Verificado
                </DropdownMenuItem>
              )}
              {onBulkDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onBulkDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Selecionados
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="hover:bg-white/20 text-white h-8"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
