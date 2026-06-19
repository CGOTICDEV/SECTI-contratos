# 🚀 Sistema SECTI Contratos & Convênios

Bem-vindo ao repositório do **Sistema de Gestão Unificada de Contratos e Convênios da SECTI**. 
Esta aplicação web foi projetada para oferecer controle, rastreabilidade e eficiência na gestão administrativa.

## 📚 Documentação do Projeto

A documentação completa está dividida nos seguintes arquivos para facilitar a navegação:

- 💻 [**Guia de Instalação e Uso**](INSTALACAO.md) - Passos para configuração e execução do projeto.
- 📖 [**Manual do Usuário**](USER_MANUAL.md) - Funcionalidades da interface, regras de negócio e perfis de acesso.
- ⚡ [**Implementações (v2.0)**](IMPLEMENTACOES.md) - Funcionalidades detalhadas, histórico de versões e roadmap.
- ⚖️ [**Atribuições**](ATTRIBUTIONS.md) - Licenças e créditos (Figma, Unsplash, shadcn/ui).

---

# 🎨 Manual de Bordo: Design System SECTI.OS

## 1. Diretrizes Estratégicas
O design deve transmitir autoridade institucional, clareza e eficiência. O foco é a rápida localização de dados e a execução de tarefas administrativas sem ruído visual. O sistema é a central de comando; a interface deve ser limpa, estruturada e pragmática.

## 2. Tipografia (A Bússola Visual)
Utilizamos fontes sem serifa para garantir legibilidade em painéis densos e varredura rápida de dados.

* **Primária:** Inter (Títulos e corpo de texto).
* **Secundária:** JetBrains Mono (Para exibição de dados técnicos, chaves de API e protocolos).
* **Hierarquia:**
  * **H1 (Títulos de Página):** `text-3xl font-bold text-secti-primary`
  * **H2 (Títulos de Seção):** `text-2xl font-semibold text-secti-text`
  * **H3 (Subtítulos):** `text-lg font-medium text-secti-text`
  * **Body (Texto padrão):** `text-base text-secti-text`
  * **Small (Rótulos e apoios):** `text-sm text-secti-muted`

## 3. Cores (O Mapa de Navegação)
As cores definem o terreno de operação. Evite o uso de cores de alerta fora de contexto.

* **Primária (Base da frota):** `#0B2046` (Azul Marinho) - Barras de navegação, botões principais e cabeçalhos.
* **Secundária (Apoio tático):** `#0056B3` (Azul Institucional) - Estados de hover e links.
* **Destaque (Marcadores de rota):** `#00D1FF` (Ciano) - Foco em inputs, seleções ativas e indicadores de progresso.
* **Superfícies (O convés):** 
  * Fundo geral: `#F8FAFC`
  * Cartões e modais: `#FFFFFF`
  * Bordas e divisões: `#E2E8F0`
* **Estados (Sinalizadores):**
  * Sucesso: `#10B981`
  * Aviso: `#F59E0B`
  * Perigo/Erro: `#EF4444`

## 4. Estrutura e Grid (O Esqueleto do Navio)
* **Layout Principal:** Padrão Dashboard. Barra lateral fixa à esquerda, barra de topo fixa e área de conteúdo fluida.
* **Grid:** Sistema de 12 colunas do Tailwind. Modais e formulários complexos devem respeitar alinhamento estrito em grid.
* **Espaçamento (Respiro tático):** 
  * Margens internas de cartões: `p-6`.
  * Espaço entre blocos de conteúdo: `gap-6` ou `mb-6`.

## 5. Arsenal de Componentes

### 5.1. Botões
Ações principais devem guiar o usuário; ações secundárias devem oferecer recuo sem distração.

* **Primário:** `bg-secti-primary text-white`. Uso: Salvar, Confirmar, Enviar.
* **Secundário:** `bg-white text-secti-primary border-secti-border`. Uso: Cancelar, Voltar, Filtrar.
* **Ações Destrutivas:** Fundo ou texto `text-danger`. Uso: Excluir, Revogar.
* **Comportamento:** Todos devem ter estado de `hover` e foco com `ring-2 ring-secti-accent` para demarcar a posição do cursor.

### 5.2. Formulários e Inputs
Instrumentos de coleta de dados. Precisam ser inconfundíveis.

* **Aparência:** Fundo branco, borda `border-secti-border`, `rounded-md`.
* **Foco:** Ao focar, a borda recebe `ring-2 ring-secti-secondary`. Nunca deixe o input sem feedback tático de foco.
* **Rótulos (Labels):** Posicionados acima do campo, `text-sm font-medium text-secti-text`.

### 5.3. Cartões (Cards)
Agrupam informações correlatas, funcionando como compartimentos estanques no layout.

* **Estrutura:** Fundo `bg-secti-surface`, borda fina, `shadow-card`, `rounded-lg`.
* **Uso:** Gráficos, resumos, tabelas e formulários. Não misture dados de domínios diferentes no mesmo cartão.

### 5.4. Tabelas
A espinha dorsal do monitoramento de dados.

* **Cabeçalho:** Fundo `bg-gray-50`, texto em caixa alta, `text-xs font-semibold text-secti-muted`.
* **Linhas:** Fundo branco, divisórias horizontais. Estado de `hover:bg-gray-50` para rastreamento visual da linha em tabelas largas.

---

## 6. Integração Firebase (Autenticação e Firestore)
Este projeto utiliza Firebase Authentication e Firestore para persistência de usuários e contratos.

* Ao cadastrar-se, o operador escolhe sua **função** (`gestor` ou `fiscal`) e pode anexar uma **foto de perfil** em Base64.
* As inscrições agora geram automaticamente um e‑mail de verificação; a conta só se torna acessível após validação do endereço institucional. O usuário é desconectado após o cadastro e deve confirmar o link no e‑mail para poder efetuar login.
* Após o login (após verificação), um item “Meu Perfil” aparece na barra lateral permitindo que o usuário visualize seus dados.
* O documento de usuário tem o `uid` como ID e inclui os campos `email`, `displayName`, `role`, `photoBase64` e `createdAt`.
* Regras de segurança (`firestore.rules`) limitam leitura/criação dos registros de usuário somente ao próprio UID. A leitura de outros dados (contratos ou perfil) também exige que o e‑mail tenha sido verificado.
* A coleção `contracts` permanece aberta para qualquer usuário autenticado e verificado.

* **Novo:** contratos agora podem receber "apostilas" – anotações internas (ajustes de dotação, valores, prazos etc.) que não exigem termo aditivo formal. As apostilas podem opcionalmente trazer um **ajuste financeiro** (positivo para incremento, negativo para dedução) que modifica imediatamente o `valorAtual` do contrato e é refletido no saldo disponível. Usuários com papel **CCC** podem inserir e listar apostilas sem acessar o formulário de edição completo. O histórico mantém registro de cada inclusão, incluindo o valor ajustado.

Para testar:
1. Ative Email/Password no console Firebase.
2. Crie conta no app; verifique Firestore>users.
3. Confira seu e‑mail, clique no link de verificação.
4. Faça login e gerencie contratos via UI.

## 7. Comportamento e Estados
* **Carregamento (Loading):** Utilize skeletons em vez de spinners para carregar grandes blocos de dados. Spinners operam apenas dentro de botões durante submissões diretas.
* **Feedback (Toasts):** Posicionados no canto superior direito. Desaparecem após 4 segundos. Erros críticos exigem descarte manual do operador.