import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose 
} from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { 
  BookOpen, Compass, LayoutDashboard, 
  Search, Edit, FileText, UserCircle, 
  CheckCircle, Lightbulb, AlertCircle, Info, ArrowRight,
  ShieldCheck, FileSignature, Eye
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] p-0 overflow-auto flex flex-col gap-0 border-border/50 shadow-2xl rounded-xl bg-background">
        
        {/* HEADER */}
        <DialogHeader className="p-6 border-b bg-muted/30 flex flex-row items-center gap-4 space-y-0">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary border border-primary/20 shadow-sm">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Manual do Usuário
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema SECTI Contratos & Convênios
            </p>
          </div>
        </DialogHeader>

        {/* CONTEÚDO ROLÁVEL */}
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8 space-y-10">
            
            {/* Introdução */}
            <div className="text-muted-foreground text-base leading-relaxed bg-muted/20 p-5 rounded-xl border border-border/50">
              Bem‑vindo ao painel de <strong className="text-foreground">gestão unificada de contratos e convênios da SECTI</strong>. 
              Este documento explica, de maneira clara e direcionada, tudo o que é possível fazer na aplicação – desde entrar com seu usuário até registrar alterações e consultar históricos.
            </div>

            {/* 1. Acesso e Autenticação */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <img src="/iconsSVG_animated/key.svg" alt="Acesso e autenticação" className="h-15 w-15" />
                <h3 className="text-xl font-semibold text-foreground tracking-tight">Acesso e Autenticação</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <CardItem title="Login Tradicional" text="Informe e‑mail + senha. Contas não verificadas recebem e-mail automático e ficam bloqueadas até a confirmação." />
                <CardItem title="Link Mágico" text="Peça um link na tela de login. Enviado para o e‑mail institucional, permite acesso sem digitar senha." />
                <CardItem title="Recuperação" text="Use o botão 'Esqueci a senha' no formulário para receber o link de redefinição." />
                <CardItem title="Dica de Uso" text="Não digite @secti.ba.gov.br no login; o sistema autocompleta o domínio para você." />
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <strong className="block font-semibold mb-1">Cadastro de Novo Usuário</strong>
                  Solicitado via "Criar nova conta". Exige: Nome, Foto, E-mail, Senha, Perfil e Setor. <b>Todos os cadastros exigem verificação de e‑mail para liberar o login.</b>
                </div>
              </div>
            </section>

            {/* 2. Perfis e Permissões */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <img src="/iconsSVG_animated/users.svg" alt="Perfis e permissões" className="h-15 w-15" />
                <h3 className="text-xl font-semibold text-foreground tracking-tight">Perfis e Permissões</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RoleCard icon={ShieldCheck} title="Gestor" color="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900" desc="Criar e editar contratos e convênios, acompanhar execução completa." />
                <RoleCard icon={FileSignature} title="Fiscal" color="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900" desc="Atualizar execuções técnicas/financeiras, alterar valores e saldos." />
                <RoleCard icon={Eye} title="CCC" color="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900" desc="Acesso somente leitura global; permissão exclusiva para adicionar apostilas." />
              </div>
              <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" /> O botão <strong>Novo Registro</strong> na barra lateral só aparece para gestores e fiscais.
              </p>
            </section>

            {/* 3 & 4. Navegação e Painel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Compass className="text-primary h-6 w-6" />
                  <h3 className="text-lg font-semibold text-foreground">Menu Principal</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <ListItem><strong>Painel Geral:</strong> Lista e filtros</ListItem>
                  <ListItem><strong>Novo Registro:</strong> Criar contrato/convênio</ListItem>
                  <ListItem><strong>Meu Perfil:</strong> Editar dados e senha</ListItem>
                  <ListItem><strong>Sair:</strong> Encerra sessão</ListItem>
                </ul>
              </section>
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <LayoutDashboard className="text-primary h-6 w-6" />
                  <h3 className="text-lg font-semibold text-foreground">Painel Geral</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <ListItem><strong>Filtros por prazo:</strong> Abas para Todos, &lt;15 dias, &lt;30, &lt;60, &lt;90.</ListItem>
                  <ListItem><strong>Busca Livre:</strong> Empresa, número, objeto, gestor, fiscal ou apostilas.</ListItem>
                  <ListItem><strong>Exportar:</strong> Gera Excel com os registros visíveis.</ListItem>
                </ul>
              </section>
            </div>

            {/* 5. Tabela */}
            <section className="border-t border-border/50 pt-8">
              <div className="flex items-center gap-2 mb-5">
                <img src="/iconsSVG_animated/table.svg" alt="Tabela de contratos" className="h-15 w-15" />
                <h3 className="text-xl font-semibold text-foreground tracking-tight">Tabela de Contratos</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                A lista exibe Status, Tipo, Números, Empresa/Convenente, Objeto, Responsáveis, Vigência e Saldo.
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <ActionBadge icon="🕵️" title="Detalhes" desc="Abre o modal completo com histórico" />
                <ActionBadge icon="✏️" title="Editar" desc="Disponível para Gestor/Fiscal" />
                <ActionBadge icon="🗒️" title="Apostila" desc="Adiciona nota interna (apenas CCC)" />
              </div>
            </section>

            {/* 6 & 7. Detalhes e Edição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-border/50">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="text-primary h-5 w-5" />
                  <h4 className="font-semibold text-foreground">Visualizar Detalhes</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2"><strong>Resumo:</strong> Identificação, prazos, finanças e lista de apostilas.</p>
                <p className="text-sm text-muted-foreground"><strong>Histórico:</strong> Linha do tempo de alterações (data/hora, usuário, antes/depois). Ideal para auditoria.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Edit className="text-primary h-5 w-5" />
                  <h4 className="font-semibold text-foreground">Criar / Editar</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Formulário lateral dividido em abas: <strong>Geral</strong>, <strong>Cronograma</strong> e <strong>Financeiro</strong>.
                  O sistema calcula diferenças e grava o histórico automaticamente ao salvar.
                </p>
              </div>
            </div>

            {/* 8, 9, 10. Outros recursos (Grid de 3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-primary h-5 w-5" />
                  <h4 className="font-semibold text-foreground">Apostilas (CCC)</h4>
                </div>
                <p className="text-sm text-muted-foreground">Consulta livre. Clique no ícone de apostila para registrar notas internas, visíveis no histórico.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCircle className="text-primary h-5 w-5" />
                  <h4 className="font-semibold text-foreground">Meu Perfil</h4>
                </div>
                <p className="text-sm text-muted-foreground">Edite nome, telefone, setor, foto de perfil e altere sua senha (Firebase Auth).</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="text-primary h-5 w-5" />
                  <h4 className="font-semibold text-foreground">Funcionalidades</h4>
                </div>
                <p className="text-sm text-muted-foreground">Login sem senha, tutorial na tela inicial, validação de e-mail e indicadores visuais.</p>
              </div>
            </div>

            {/* Observações finais */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-4">
              <Lightbulb className="text-primary h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Dicas Finais</h4>
                <p className="text-sm text-muted-foreground">
                  Use sempre o e-mail institucional verificado e mantenha sua foto atualizada, pois ela aparece nos logs de histórico de alterações. Em caso de dúvidas, contate a administração.
                </p>
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t bg-muted/10 sm:justify-between items-center">
          <span className="text-xs text-muted-foreground hidden sm:inline-block ml-2">
            Rastreabilidade total das alterações ✅
          </span>
          <DialogClose asChild>
            <Button type="button" className="px-8 font-semibold shadow-sm rounded-full">
              Entendi, acessar o sistema
            </Button>
          </DialogClose>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

// --- SUBCOMPONENTES DE UI PARA MANTER O CÓDIGO LIMPO ---

function CardItem({ title, text }: { title: string, text: string }) {
  return (
    <div className="border border-border/60 bg-background rounded-lg p-4 shadow-sm hover:border-primary/30 transition-colors">
      <h4 className="font-semibold text-sm text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, color }: { icon: React.ElementType, title: string, desc: string, color: string }) {
  return (
    <div className={`border rounded-xl p-5 flex flex-col gap-3 ${color} bg-opacity-50`}>
      <div className="flex items-center gap-2">
        <div className="p-2 bg-background rounded-lg shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="font-bold text-base">{title}</h4>
      </div>
      <p className="text-sm opacity-90 leading-relaxed">{desc}</p>
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function ActionBadge({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="flex-1 border border-border/50 bg-muted/30 rounded-lg p-3 flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <strong className="block text-sm text-foreground">{title}</strong>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
    </div>
  );
}