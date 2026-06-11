import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { sugerirCriacaoContrato, sugerirTermoAditivo, type GuiaContractSuggestion, type GuiaTermoSuggestion } from '../utils/guia';
import type { Contract } from '../types/contract';
import { Loader2, AlertCircle, CheckCircle2, Lightbulb, FileText, Gavel, Brain } from 'lucide-react';
import { NIM_MODELS, NIM_THINKING_LEVELS, getModelIcon, getSupportedThinkingLevelsForModelKey, thinkingToKeySuffix, type NIMThinkingLevel } from '../utils/nimClient';

type GuiaMode = 'criar-contrato' | 'sugerir-termo';

interface GuiaPanelProps {
  mode: GuiaMode;
  contract?: Partial<Contract>;
  onContractSuggestion?: (data: Partial<Contract>, resumo: string) => void;
  onTermoSuggestion?: (sugestao: GuiaTermoSuggestion) => void;
}

type ModelFamily = 'flash' | 'pro' | 'nemotron';

const FAMILY_CONFIG: Record<ModelFamily, { label: string; icon: string; prefix: string }> = {
  flash:   { label: 'DeepSeek V4 Flash', icon: '/img/DeepSeek.svg', prefix: 'nim-deepseek-v4-flash' },
  pro:     { label: 'DeepSeek V4 Pro',   icon: '/img/DeepSeek.svg', prefix: 'nim-deepseek-v4-pro' },
  nemotron:{ label: 'Nemotron Ultra 550B', icon: '/img/NVIDIA.svg', prefix: 'nim-nemotron-ultra-550b' },
};

function buildModelKey(family: ModelFamily, think: NIMThinkingLevel): string {
  const suffix = thinkingToKeySuffix(think);
  if (!suffix) return FAMILY_CONFIG[family].prefix;
  return `${FAMILY_CONFIG[family].prefix}-think-${suffix}`;
}

function getFamilyThinkingLevels(family: ModelFamily): NIMThinkingLevel[] {
  return getSupportedThinkingLevelsForModelKey(FAMILY_CONFIG[family].prefix);
}

function coerceThinkingLevel(family: ModelFamily, think: NIMThinkingLevel): NIMThinkingLevel {
  const supported = getFamilyThinkingLevels(family);
  if (supported.includes(think)) return think;
  if ((think === 'medium' || think === 'max') && supported.includes('high')) return 'high';
  return supported[0] ?? 'none';
}

export function GuiaPanel({ mode, contract, onContractSuggestion, onTermoSuggestion }: GuiaPanelProps) {
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<GuiaContractSuggestion | GuiaTermoSuggestion | null>(null);
  const [modelUsed, setModelUsed] = useState('');
  const [family, setFamily] = useState<ModelFamily>('nemotron');
  const [thinkLevel, setThinkLevel] = useState<NIMThinkingLevel>('none');

  const isContractMode = mode === 'criar-contrato';
  const isTermoMode = mode === 'sugerir-termo';
  const currentFamily = FAMILY_CONFIG[family];
  const supportedThinkingLevels = getFamilyThinkingLevels(family);
  const currentModelKey = buildModelKey(family, coerceThinkingLevel(family, thinkLevel));

  const handleConsultar = async () => {
    if (!descricao.trim()) return;
    setLoading(true);
    setError('');
    setResultado(null);

    try {
      if (mode === 'criar-contrato') {
        const res = await sugerirCriacaoContrato(descricao, currentModelKey);
        setResultado(res.sugestao);
        setModelUsed(res.modelUsed);
      } else {
        if (!contract) throw new Error('Contrato não informado');
        const res = await sugerirTermoAditivo(contract, descricao, currentModelKey);
        setResultado(res.sugestao);
        setModelUsed(res.modelUsed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar GUIÁ');
    } finally {
      setLoading(false);
    }
  };

  const handleAplicar = () => {
    if (mode === 'criar-contrato' && onContractSuggestion && resultado) {
      const r = resultado as GuiaContractSuggestion;
      const contractData: Partial<Contract> = {
        tipoRegistro: r.tipoRegistro as Contract['tipoRegistro'],
        numeroContrato: r.numeroContrato,
        empresa: r.empresa,
        convenente: r.convenente,
        interveniente: r.interveniente,
        objeto: r.objeto,
        gestor: r.gestor,
        fiscal: r.fiscal,
        situacao: r.situacao as Contract['situacao'],
        vigenciaInicial: r.vigenciaInicial,
        vigenciaAtual: r.vigenciaAtual,
        valorInicial: r.valorInicial,
        valorAtual: r.valorAtual,
        garantiaTipo: r.garantiaTipo as Contract['garantiaTipo'],
      };
      onContractSuggestion(contractData, r.resumo);
    }
    if (mode === 'sugerir-termo' && onTermoSuggestion && resultado) {
      onTermoSuggestion(resultado as GuiaTermoSuggestion);
    }
  };

  const modelConfig = modelUsed ? NIM_MODELS[modelUsed] : null;

  return (
    <div className="border border-[#00D1FF]/30 rounded-lg bg-gradient-to-br from-[#0B2046]/5 to-[#00D1FF]/5 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0B2046] text-white">
        <img src="/img/GUIA.svg" alt="GUIÁ" className="w-8 h-8" />
        <div className="flex-1">
          <span className="text-sm font-bold tracking-wide">GUIÁ</span>
          <span className="text-[10px] text-[#00D1FF]/60 block leading-tight">Assistente Inteligente SECTI</span>
        </div>
        <img src={currentFamily.icon} alt={currentFamily.label} className="w-7 h-7 rounded bg-white/10 p-1" />
      </div>

      {/* SELECTORS */}
      <div className="p-4 pb-2 space-y-3 border-b border-gray-200/50">
        {/* Model Family */}
        <div>
          <label className="text-[10px] font-bold uppercase text-secti-muted mb-1.5 block">Modelo</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(FAMILY_CONFIG) as [ModelFamily, typeof currentFamily][]).map(([key, cfg]) => (
              <button
                type="button"
                key={key}
                onClick={() => { setFamily(key); setThinkLevel(coerceThinkingLevel(key, thinkLevel)); }}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                  family === key
                    ? 'border-[#00D1FF] bg-[#00D1FF]/10 text-[#0B2046] shadow-sm'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <img src={cfg.icon} alt="" className="w-5 h-5 shrink-0" />
                <span className="leading-tight">{cfg.label.replace('DeepSeek V4 ', '').replace('Nemotron Ultra ', '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Thinking Level */}
        <div>
          <label className="text-[10px] font-bold uppercase text-secti-muted mb-1.5 block">
            <Brain className="w-3 h-3 inline mr-1" />
            Nível de Pensamento
          </label>
          <div className="flex flex-wrap gap-1">
            {NIM_THINKING_LEVELS.map((level) => {
              const disabled = !supportedThinkingLevels.includes(level.value);
              return (
                <button
                  type="button"
                  key={level.value}
                  onClick={() => !disabled && setThinkLevel(level.value)}
                  disabled={disabled}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                    thinkLevel === level.value
                      ? 'border-[#0B2046] bg-[#0B2046] text-white shadow-sm'
                      : disabled
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {level.label}
                  <span className={`ml-1 ${thinkLevel === level.value ? 'text-white/60' : 'text-gray-400'}`}>
                    {level.tokens}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* INPUT + RESULT */}
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-secti-muted flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            {isContractMode ? 'Descreva o contrato/convênio' : 'Descreva a necessidade'}
          </label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={
              isContractMode
                ? 'Ex: Contrato de R$ 500 mil com Prefeitura de Salvador para capacitação profissional, vigência 12 meses, gestor João Silva'
                : 'Ex: Preciso prorrogar o prazo por mais 6 meses devido a atraso na execução'
            }
            className="bg-white border-secti-border min-h-[80px] resize-none text-sm"
            disabled={loading}
          />
        </div>

        <Button
          type="button"
          onClick={handleConsultar}
          disabled={loading || !descricao.trim()}
          className="w-full bg-[#0B2046] hover:bg-blue-900 text-white gap-2 text-xs font-bold uppercase"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
          ) : (
            <>Consultar GUIÁ</>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resultado && !error && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {modelUsed && modelConfig && (
              <div className="flex items-center gap-2 text-[10px] text-secti-muted">
                <img src={getModelIcon(modelUsed)} alt="" className="w-4 h-4" />
                <span>Processado por <strong>{modelConfig.label}</strong></span>
                {modelConfig.thinking !== 'none' && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{NIM_THINKING_LEVELS.find(l => l.value === modelConfig.thinking)?.tokens}</span>
                )}
              </div>
            )}

            {isContractMode && (
              <div className="bg-white rounded-lg border border-green-200 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1 text-green-700 font-semibold mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Sugestão de Contrato
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div><span className="text-secti-muted">Tipo:</span> <span className="font-medium">{(resultado as GuiaContractSuggestion).tipoRegistro}</span></div>
                  <div><span className="text-secti-muted">Empresa:</span> <span className="font-medium">{(resultado as GuiaContractSuggestion).empresa || (resultado as GuiaContractSuggestion).convenente}</span></div>
                  <div><span className="text-secti-muted">Objeto:</span> <span className="font-medium col-span-2">{(resultado as GuiaContractSuggestion).objeto}</span></div>
                  <div><span className="text-secti-muted">Gestor:</span> <span className="font-medium">{(resultado as GuiaContractSuggestion).gestor}</span></div>
                  <div><span className="text-secti-muted">Fiscal:</span> <span className="font-medium">{(resultado as GuiaContractSuggestion).fiscal}</span></div>
                  <div><span className="text-secti-muted">Valor:</span> <span className="font-medium">R$ {(resultado as GuiaContractSuggestion).valorInicial?.toLocaleString('pt-BR')}</span></div>
                  <div><span className="text-secti-muted">Vigência:</span> <span className="font-medium">{(resultado as GuiaContractSuggestion).vigenciaInicial} → {(resultado as GuiaContractSuggestion).vigenciaAtual}</span></div>
                </div>
                {(resultado as GuiaContractSuggestion).resumo && (
                  <div className="border-t border-gray-100 pt-2 mt-1">
                    <span className="text-secti-muted">Resumo:</span>
                    <p className="text-gray-700 mt-0.5">{(resultado as GuiaContractSuggestion).resumo}</p>
                  </div>
                )}
                {(resultado as GuiaContractSuggestion).observacoes && (
                  <div className="text-amber-700 bg-amber-50 p-2 rounded text-[11px]">
                    <span className="font-semibold">Obs:</span> {(resultado as GuiaContractSuggestion).observacoes}
                  </div>
                )}
              </div>
            )}

            {isTermoMode && (
              <div className="bg-white rounded-lg border border-green-200 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-1 text-green-700 font-semibold mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Sugestão de Termo
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div><span className="text-secti-muted">Tipo:</span> <span className="font-medium">{(resultado as GuiaTermoSuggestion).tipo}</span></div>
                  <div><span className="text-secti-muted">Ajuste:</span> <span className="font-medium">R$ {(resultado as GuiaTermoSuggestion).ajuste?.toLocaleString('pt-BR')}</span></div>
                  {(resultado as GuiaTermoSuggestion).prorrogacao && (
                    <div><span className="text-secti-muted">Nova vigência:</span> <span className="font-medium">{(resultado as GuiaTermoSuggestion).prorrogacao}</span></div>
                  )}
                </div>
                {(resultado as GuiaTermoSuggestion).justificativa && (
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-1 text-secti-muted font-semibold mb-1">
                      <FileText className="w-3 h-3" /> Justificativa
                    </div>
                    <p className="text-gray-700">{(resultado as GuiaTermoSuggestion).justificativa}</p>
                  </div>
                )}
                {(resultado as GuiaTermoSuggestion).fundamentacaoLegal && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-[11px] text-blue-800">
                    <Gavel className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{(resultado as GuiaTermoSuggestion).fundamentacaoLegal}</span>
                  </div>
                )}
                {(resultado as GuiaTermoSuggestion).minuta && (
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-1 text-secti-muted font-semibold mb-1">
                      <FileText className="w-3 h-3" /> Minuta sugerida
                    </div>
                    <p className="text-gray-700 text-[11px] leading-relaxed whitespace-pre-wrap">{(resultado as GuiaTermoSuggestion).minuta}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAplicar}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 text-xs font-bold uppercase h-9"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isContractMode ? 'Aplicar no Formulário' : 'Usar Sugestão'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDescricao(''); setResultado(null); setError(''); }}
                className="border-gray-300 text-gray-600 text-xs h-9"
              >
                Limpar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
