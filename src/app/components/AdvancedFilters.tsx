import { useState } from 'react';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from './ui/sheet';
import { Badge } from './ui/badge';

export interface AdvancedFilters {
  tipoRegistro?: 'contrato' | 'convenio' | 'todos';
  situacao?: 'Vigente' | 'Vencido' | 'Suspenso' | 'todos';
  gestor?: string;
  fiscal?: string;
  empresa?: string;
  convenente?: string;
  valorMin?: number;
  valorMax?: number;
  diasVencimentoMin?: number;
  diasVencimentoMax?: number;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  gestores?: string[];
  fiscais?: string[];
}

export function AdvancedFiltersPanel({
  filters,
  onFiltersChange,
  gestores = [],
  fiscais = [],
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'tipoRegistro' || key === 'situacao') {
      return value && value !== 'todos';
    }
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters: AdvancedFilters = {
      tipoRegistro: 'todos',
      situacao: 'todos',
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleFieldChange = (field: keyof AdvancedFilters, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <SlidersHorizontal className="w-4 h-4" />
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-blue-600 text-white">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Avançados
          </SheetTitle>
          <SheetDescription>
            Refine sua busca com critérios específicos
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 py-6">
          {/* Tipo de Registro */}
          <div className="space-y-3">
            <Label htmlFor="tipoRegistro">Tipo de Registro</Label>
            <Select
              value={localFilters.tipoRegistro || 'todos'}
              onValueChange={(value) => handleFieldChange('tipoRegistro', value)}
            >
              <SelectTrigger id="tipoRegistro">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="contrato">Contratos</SelectItem>
                <SelectItem value="convenio">Convênios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Situação */}
          <div className="space-y-3">
            <Label htmlFor="situacao">Situação</Label>
            <Select
              value={localFilters.situacao || 'todos'}
              onValueChange={(value) => handleFieldChange('situacao', value)}
            >
              <SelectTrigger id="situacao">
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Vigente">Vigente</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gestor */}
          <div className="space-y-3">
            <Label htmlFor="gestor">Gestor</Label>
            {gestores.length > 0 ? (
              <Select
                value={localFilters.gestor || 'todos'}
                onValueChange={(value) => handleFieldChange('gestor', value === 'todos' ? undefined : value)}
              >
                <SelectTrigger id="gestor">
                  <SelectValue placeholder="Selecione um gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {gestores.map((gestor) => (
                    <SelectItem key={gestor} value={gestor}>
                      {gestor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="gestor"
                placeholder="Digite o nome do gestor"
                value={localFilters.gestor || ''}
                onChange={(e) => handleFieldChange('gestor', e.target.value)}
              />
            )}
          </div>

          {/* Fiscal */}
          <div className="space-y-3">
            <Label htmlFor="fiscal">Fiscal</Label>
            {fiscais.length > 0 ? (
              <Select
                value={localFilters.fiscal || 'todos'}
                onValueChange={(value) => handleFieldChange('fiscal', value === 'todos' ? undefined : value)}
              >
                <SelectTrigger id="fiscal">
                  <SelectValue placeholder="Selecione um fiscal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {fiscais.map((fiscal) => (
                    <SelectItem key={fiscal} value={fiscal}>
                      {fiscal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="fiscal"
                placeholder="Digite o nome do fiscal"
                value={localFilters.fiscal || ''}
                onChange={(e) => handleFieldChange('fiscal', e.target.value)}
              />
            )}
          </div>

          {/* Empresa/Convenente */}
          <div className="space-y-3">
            <Label htmlFor="empresa">Empresa/Convenente</Label>
            <Input
              id="empresa"
              placeholder="Digite o nome"
              value={localFilters.empresa || localFilters.convenente || ''}
              onChange={(e) => {
                handleFieldChange('empresa', e.target.value);
                handleFieldChange('convenente', e.target.value);
              }}
            />
          </div>

          {/* Faixa de Valor */}
          <div className="space-y-2">
            <Label>Valor do Contrato</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="valorMin" className="text-xs text-gray-600">Mínimo</Label>
                <Input
                  id="valorMin"
                  type="number"
                  placeholder="R$ 0,00"
                  value={localFilters.valorMin || ''}
                  onChange={(e) => handleFieldChange('valorMin', parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div>
                <Label htmlFor="valorMax" className="text-xs text-gray-600">Máximo</Label>
                <Input
                  id="valorMax"
                  type="number"
                  placeholder="R$ 999.999,99"
                  value={localFilters.valorMax || ''}
                  onChange={(e) => handleFieldChange('valorMax', parseFloat(e.target.value) || undefined)}
                />
              </div>
            </div>
          </div>

          {/* Dias para Vencimento */}
          <div className="space-y-2">
            <Label>Dias para Vencimento</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="diasMin" className="text-xs text-gray-600">Mínimo</Label>
                <Input
                  id="diasMin"
                  type="number"
                  placeholder="0"
                  value={localFilters.diasVencimentoMin ?? ''}
                  onChange={(e) => handleFieldChange('diasVencimentoMin', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div>
                <Label htmlFor="diasMax" className="text-xs text-gray-600">Máximo</Label>
                <Input
                  id="diasMax"
                  type="number"
                  placeholder="365"
                  value={localFilters.diasVencimentoMax ?? ''}
                  onChange={(e) => handleFieldChange('diasVencimentoMax', parseInt(e.target.value) || undefined)}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
          <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
