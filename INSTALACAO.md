# 🚀 Guia de Instalação e Uso - Sistema SECTI Contratos v2.0

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou pnpm
- Conta Firebase configurada
- Git

## ⚡ Instalação Rápida

### 1. Clone o Repositório (se aplicável)
```bash
git clone <repository-url>
cd SECTI-contratos
```

### 2. Instale as Dependências
```bash
npm install
```

**Novas dependências adicionadas:**
- `jspdf-autotable`: Para exportação PDF com tabelas

### 3. Configure o Firebase
Certifique-se de que o arquivo `src/firebase.ts` está configurado com suas credenciais.

### 4. Inicie o Servidor de Desenvolvimento
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5173` (ou porta indicada no terminal).

---

## 🎯 Funcionalidades Principais

### 🔔 Notificações
- Clique no **ícone de sino** no header
- Veja alertas de contratos próximos do vencimento
- Clique em uma notificação para ver detalhes do contrato

### 📊 Dashboard Visual
- Acesse **"Dashboard Visual"** no menu lateral
- Visualize gráficos de:
  - Distribuição por status
  - Vencimentos mensais
  - Indicadores financeiros
  - Tipos de registro

### 🔍 Filtros Avançados
- Clique em **"Filtros Avançados"** na barra de pesquisa
- Configure múltiplos critérios:
  - Tipo, situação, gestor, fiscal
  - Faixa de valor
  - Dias para vencimento
- Badge mostra quantos filtros estão ativos

### ✅ Seleção em Lote
*(Ativado ao usar VirtualizedTable)*
1. Marque os checkboxes dos contratos desejados
2. Barra de ações aparece no rodapé
3. Exporte, edite ou gerencie os selecionados

### 📎 Gestão de Documentos
1. Abra um contrato
2. Vá para a aba "Documentos"
3. Arraste arquivos ou clique para upload
4. Baixe, visualize ou exclua documentos

### 💬 Comentários e Aprovações
1. Abra um contrato
2. Vá para a aba "Comentários"
3. Adicione comentários
4. **Gestores**: Use botões "Aprovar" ou "Rejeitar"

### 🔐 Sessão Automática
- Sistema monitora inatividade
- Aviso aparece 60s antes do logout
- Clique "Continuar Conectado" para renovar

### ❓ Ajuda
- Clique no **"?"** no header
- Navegue pelas seções de ajuda
- Acesse o manual completo

---

## 🛠️ Configuração Avançada

### Alterar Timeout de Sessão
No `App.tsx`, ajuste:
```tsx
<SessionManager 
  inactivityTimeout={30}  // minutos
  warningTime={60}        // segundos
/>
```

### Ativar Tabela Virtualizada
Para grandes volumes (>500 contratos), substitua em `App.tsx`:
```tsx
// De:
<ContractsTable contracts={filteredContracts} ... />

// Para:
<VirtualizedContractsTable 
  contracts={filteredContracts}
  rowHeight={60}
  overscan={5}
  selectedIds={selectedContractIds}
  onSelectionChange={handleSelectionChange}
  ...
/>
```

### Configurar Idioma
Sistema detecta automaticamente, mas pode forçar:
```tsx
import { i18n } from './utils/i18n';

i18n.setLanguage('pt-BR'); // ou 'en'
```

---

## 📦 Estrutura do Projeto

```
src/
├── app/
│   ├── components/
│   │   ├── NotificationCenter.tsx      # Notificações in-app
│   │   ├── Dashboard.tsx                # Gráficos
│   │   ├── AdvancedFilters.tsx         # Filtros
│   │   ├── BulkActions.tsx              # Ações em lote
│   │   ├── DocumentManager.tsx          # Documentos
│   │   ├── CommentsApproval.tsx         # Comentários
│   │   ├── SessionManager.tsx           # Sessão
│   │   ├── HelpSystem.tsx               # Ajuda
│   │   ├── VirtualizedTable.tsx         # Tabela otimizada
│   │   └── ui/                          # Componentes base
│   ├── utils/
│   │   ├── pdf-export.ts                # Export PDF
│   │   ├── i18n.ts                      # i18n
│   │   ├── excel.ts                     # Export Excel
│   │   └── contract-helpers.ts          # Helpers
│   └── types/
│       ├── contract.ts                  # Tipos Contract
│       └── user.ts                      # Tipos User
├── firebase.ts                          # Config Firebase
└── main.tsx                             # Entry point
```

---

## 🧪 Testes

### Testar Notificações
1. Crie/edite um contrato com vencimento em < 15 dias
2. Badge vermelho aparece no sino
3. Abra o centro de notificações

### Testar Dashboard
1. Adicione vários contratos com diferentes status
2. Acesse "Dashboard Visual"
3. Verifique se gráficos atualizam

### Testar Filtros
1. Aplique filtros combinados (ex: Gestor + Valor mínimo)
2. Badge mostra "2" filtros ativos
3. Tabela filtra corretamente

### Testar Sessão
1. Configure `inactivityTimeout={1}` (1 minuto)
2. Aguarde sem interagir
3. Aviso deve aparecer

---

## 🐛 Solução de Problemas

### Erro: "Cannot find module 'jspdf-autotable'"
```bash
npm install jspdf-autotable --save
```

### Gráficos não aparecem
Verifique se `recharts` está instalado:
```bash
npm install recharts
```

### Notificações não funcionam
Verifique se contratos têm `vigenciaAtual` válida.

### Tabela lenta com muitos dados
Use `VirtualizedTable` (ver seção "Configuração Avançada").

---

## 📚 Documentação Adicional

- **Manual do Usuário**: `USER_MANUAL.md`
- **Implementações**: `IMPLEMENTACOES.md`
- **Diretrizes**: `guidelines/Guidelines.md`

---

## 🔄 Atualizações Futuras

Confira o roadmap em `IMPLEMENTACOES.md` seção "Próximos Passos".

---

## 📞 Suporte

- Consulte o painel de ajuda (ícone "?" no header)
- Leia a documentação completa
- Entre em contato com a equipe de TI da SECTI

---

**Desenvolvido para SECTI - Secretaria de Ciência, Tecnologia e Inovação**  
*Versão 2.0 - 2026*
