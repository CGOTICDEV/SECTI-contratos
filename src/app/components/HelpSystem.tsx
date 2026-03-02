import { HelpCircle, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface TooltipHelpProps {
  title: string;
  content: string;
  learnMoreUrl?: string;
}

export function TooltipHelp({ title, content, learnMoreUrl }: TooltipHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full hover:bg-blue-100 text-blue-600"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              Saiba mais
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Central de Ajuda</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Primeiros Passos</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use o botão "Novo Contrato" para adicionar registros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Clique em qualquer linha da tabela para ver detalhes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use as abas (&lt;15, &lt;30, etc.) para filtrar por urgência</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Filtros e Busca</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Digite na barra de pesquisa para buscar por empresa, número, gestor, etc.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use "Filtros Avançados" para critérios específicos como valor ou dias</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Clique nas colunas da tabela para ordenar</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Notificações</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>O sino mostra contratos próximos do vencimento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Clique em uma notificação para ver o contrato</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use o "X" para dispensar notificações já vistas</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Exportação</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use "Exportar Excel" para baixar a lista filtrada</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Selecione múltiplos contratos para exportação em lote</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Gere relatórios PDF a partir do dashboard</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Documentos</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Anexe PDFs, contratos e planilhas aos registros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Tamanho máximo: 10MB por arquivo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Formatos aceitos: PDF, Word, Excel, imagens</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Comentários e Aprovação</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Adicione comentários para comunicação colaborativa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Gestores podem aprovar ou rejeitar contratos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Todo o histórico de decisões fica registrado</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-gray-900 mb-2">Precisa de Mais Ajuda?</h3>
            <p className="text-sm text-gray-700 mb-3">
              Entre em contato com o suporte técnico ou consulte o manual do usuário completo.
            </p>
            <Button className="w-full" variant="outline" asChild>
              <a href="/USER_MANUAL.md" target="_blank">
                Ver Manual Completo
              </a>
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
