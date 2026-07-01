# SECTI Contratos

Sistema de gestão unificada de contratos e convênios da Secretaria de Ciência, Tecnologia e Inovação da Bahia (SECTI). Uma aplicação web moderna para administração, monitoramento e auditoria de instrumentos contratuais com rastreabilidade completa.

## ✨ Funcionalidades

- **Gestão completa de contratos e convênios** – CRUD com histórico de alterações
- **Controle de vigência** – Alertas proativos para vencimentos (<15, 30, 60, 90 dias)
- **Apostilas e termos aditivos** – Registro de ajustes financeiros e anotações internas
- **Dashboard analítico** – KPIs e gráficos interativos (Recharts)
- **Filtros avançados** – Busca por gestor, fiscal, valor, prazo e situação
- **Ações em lote** – Seleção múltipla com exportação Excel
- **Gestão de documentos** – Upload e anexos por contrato
- **Comentários e aprovações** – Fluxo de revisão com aval de gestores
- **Notificações in-app** – Centro de alertas com badge de contagem
- **Sessão segura** – Logout automático por inatividade
- **Internacionalização** – Suporte a pt-BR e en
- **PWA** – Instalável como aplicativo desktop/mobile

## 📸 Screenshots

| Login | Dashboard |
|-------|-----------|
| ![Login](./public/logoLogin.jpg) | ![Dashboard](./docs/screenshots/dashboard.png) |

| Tabela de Contratos | Detalhes do Contrato |
|---------------------|----------------------|
| ![Tabela](./docs/screenshots/tabela.png) | ![Detalhes](./docs/screenshots/detalhes.png) |

> **TODO:** Adicionar screenshots reais da aplicação na pasta `docs/screenshots/`

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Componentes│  │   Utils      │  │  Types & Constants │ │
│  │  (shadcn/ui)│  │ (i18n, PDF)  │  │  (TypeScript)      │ │
│  └─────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ Firebase SDK
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Firestore   │  │    Auth      │  │   Storage (TODO) │  │
│  │  (Dados)     │  │  (Usuários)  │  │  (Documentos)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Decisões técnicas:**
- **React 18.3 + Vite 6.3** – Build rápido e HMR para desenvolvimento
- **Tailwind CSS 4.1** – Estilização utilitária com design system consistente
- **shadcn/ui + Radix UI** – Componentes acessíveis e customizáveis
- **Firebase** – Backend serverless com autenticação e Firestore
- **TypeScript** – Tipagem estática para segurança do código

## 🛠️ Tecnologias

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| React | 18.3.1 | Framework UI |
| TypeScript | ~5.x | Tipagem estática |
| Vite | 6.3.5 | Build tool e dev server |
| Tailwind CSS | 4.1.12 | Estilização utilitária |
| Firebase | 12.9.0 | Auth, Firestore, Analytics |
| Radix UI | 1.x | Componentes headless |
| shadcn/ui | – | Componentes UI baseados em Radix |
| Recharts | 2.15.2 | Gráficos e visualização de dados |
| jsPDF + autoTable | 2.5.1 + 3.8.4 | Exportação de relatórios PDF |
| ExcelJS | 4.4.0 | Exportação de planilhas |
| React Hook Form | 7.55.0 | Gerenciamento de formulários |
| Sonner | 2.0.3 | Sistema de notificações (toasts) |
| React Router | 7.13.0 | Navegação e rotas |
| date-fns | 3.6.0 | Manipulação de datas |
| Nodemailer | 8.0.1 | Envio de e-mails (via Cloud Functions) |

## 📂 Estrutura de Pastas

```
SECTI-contratos/
├── public/                     # Assets estáticos (ícones, logos, manifest)
├── src/
│   ├── app/
│   │   ├── components/         # Componentes React
│   │   │   ├── ui/             # Componentes base (shadcn/ui)
│   │   │   ├── Login.tsx       # Tela de autenticação
│   │   │   ├── Dashboard.tsx   # Gráficos e KPIs
│   │   │   ├── ContractsTable.tsx
│   │   │   ├── ContractModal.tsx
│   │   │   ├── AdvancedFilters.tsx
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── DocumentManager.tsx
│   │   │   ├── CommentsApproval.tsx
│   │   │   ├── SessionManager.tsx
│   │   │   └── ...
│   │   ├── utils/              # Funções utilitárias
│   │   │   ├── i18n.ts         # Internacionalização
│   │   │   ├── pdf-export.ts   # Exportação PDF
│   │   │   ├── excel.ts        # Exportação Excel
│   │   │   └── contract-helpers.ts
│   │   ├── types/              # Tipos TypeScript
│   │   │   ├── contract.ts
│   │   │   └── user.ts
│   │   ├── constants/          # Constantes da aplicação
│   │   └── App.tsx             # Componente raiz
│   ├── firebase.ts             # Configuração e SDK Firebase
│   ├── main.tsx                # Entry point
│   └── styles/                 # Estilos globais
├── functions/                  # Cloud Functions (Firebase)
│   └── functions/
│       ├── src/                # Código das functions
│       └── package.json
├── .env.example                # Variáveis de ambiente de exemplo
├── firestore.rules             # Regras de segurança do Firestore
├── package.json                # Dependências e scripts
├── vite.config.ts              # Configuração Vite
├── tailwind.config.ts          # Configuração Tailwind
├── USER_MANUAL.md              # Manual do usuário
└── README.md                   # Este arquivo
```

## 🚀 Como executar

### Pré-requisitos

- **Node.js** 18 ou superior
- **npm** ou **pnpm**
- **Git**
- **Conta Firebase** com projeto configurado

### Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/DinDja/SECTI-contratos.git
   cd SECTI-contratos
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```
   Edite `.env` e preencha as chaves necessárias.

4. **Configure o Firebase**
   - Acesse o [Console Firebase](https://console.firebase.google.com/)
   - Crie um novo projeto ou selecione o existente
   - Ative **Authentication** (Email/Password)
   - Crie um banco **Firestore Database**
   - Publique as regras de segurança (`firestore.rules`)
   - Atualize as credenciais em `src/firebase.ts`

### Execução (Desenvolvimento)

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

### Build (Produção)

```bash
npm run build
```

Os arquivos de produção serão gerados na pasta `dist/`.

### Deploy

**TODO:** Adicionar instruções de deploy (Firebase Hosting, Vercel, ou outro).

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_NVIDIA_NIM_API_KEY` | Chave de API para NVIDIA NIM (integração de IA) | `nvapi-xxxxx` |

> **Nota:** As credenciais do Firebase estão em `src/firebase.ts`.

## 📖 Como usar

### 1. Acesso e autenticação

O sistema exige e‑mail institucional (`@secti.ba.gov.br`).

- **Login tradicional:** Informe e‑mail e senha
- **Link mágico:** Receba um link de acesso por e‑mail
- **Recuperação de senha:** Clique em "Esqueci a senha"
- **Novo usuário:** Solicite cadastro via tela "Criar nova conta"

> Todos os cadastros exigem verificação de e‑mail antes do primeiro login.

### 2. Perfis de usuário

| Perfil | Permissões |
|--------|------------|
| **Gestor** | Criar/editar contratos, acompanhar execução |
| **Fiscal** | Atualizar execuções, alterar valores/saldos |
| **CCC** | Criar contratos, adicionar apostilas e termos aditivos |

### 3. Navegação principal

- **Painel Geral:** Lista de contratos com filtros
- **Novo Registro:** Formulário de criação
- **Meu Perfil:** Gerenciar dados do usuário
- **Dashboard Visual:** Gráficos e indicadores

### 4. Exemplo: Criar um contrato

1. Clique em "Novo Registro" no menu lateral
2. Preencha as abas:
   - **Geral:** tipo, status, empresa, gestor, fiscal, objeto
   - **Prazo:** vigência inicial e final
   - **Financeiro:** valor inicial, saldo
3. Clique em "Salvar"

## 🔌 APIs utilizadas

### Firebase

| Serviço | Finalidade |
|---------|------------|
| **Authentication** | Login, cadastro, recuperação de senha |
| **Firestore** | Persistência de contratos, usuários, histórico |
| **Analytics** | Métricas de uso |

**Regras de segurança:**
- Apenas usuários autenticados e com e‑mail verificado acessam `contracts`
- Usuários só podem editar seu próprio perfil em `users/{uid}`
- Demais coleções são bloqueadas por padrão

### NVIDIA NIM API

Integração com modelos de IA da NVIDIA para funcionalidades futuras.

**Configuração:**
- Obtenha a chave em https://build.genc.nvidia.com/
- Adicione em `.env` como `VITE_NVIDIA_NIM_API_KEY`

## 🧪 Testes

### Testes das Cloud Functions

```bash
npm run test:functions
```

### Testes manuais

| Funcionalidade | Como testar |
|----------------|-------------|
| **Notificações** | Crie contrato com vencimento <15 dias; badge deve aparecer no sino |
| **Dashboard** | Acesse "Dashboard Visual"; gráficos devem atualizar |
| **Filtros** | Aplique múltiplos filtros; badge mostra quantidade ativa |
| **Sessão** | Configure `inactivityTimeout={1}`; aviso deve aparecer após inatividade |
| **Autenticação** | Crie conta; verifique e‑mail; faça login |

**TODO:** Implementar testes automatizados (Vitest, React Testing Library).

## 📈 Roadmap

### ✅ Implementado
- [x] Autenticação com verificação de e‑mail
- [x] CRUD de contratos e convênios
- [x] Histórico de alterações (audit trail)
- [x] Apostilas e termos aditivos
- [x] Dashboard com gráficos
- [x] Filtros avançados
- [x] Notificações in-app
- [x] Exportação Excel e PDF
- [x] Gestão de documentos (upload)
- [x] Comentários e aprovações
- [x] Sessão com timeout por inatividade
- [x] Internacionalização (pt-BR/en)
- [x] Tabela virtualizada (performance)

### 🚧 Em desenvolvimento
- [ ] Upload real para Firebase Storage
- [ ] E‑mails proativos via Cloud Functions
- [ ] Relatórios avançados com gráficos em PDF
- [ ] Importação em massa via planilha
- [ ] Modo offline (PWA)

### 💡 Planejamento futuro
- [ ] Painel de auditoria para administradores
- [ ] Assinatura eletrônica de documentos
- [ ] Integração com sistemas externos (SEI, SIAFI)
- [ ] Aplicativo mobile nativo

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. **Fork** o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um **Pull Request**

### Padrões de código

- Use **TypeScript** para todo novo código
- Siga o estilo dos componentes existentes (shadcn/ui)
- Mantenha componentes pequenos e reutilizáveis
- Documente funções complexas com JSDoc

## 📄 Licença

**TODO:** Definir licença do projeto (ex: MIT, Apache 2.0).

## 👨‍💻 Autor

**SECTI - Secretaria de Ciência, Tecnologia e Inovação da Bahia**

Desenvolvido pela equipe de tecnologia da SECTI para gestão interna de contratos e convênios.

- **Site:** https://www.secti.ba.gov.br/
- **Email:** contato@secti.ba.gov.br

---

## Sugestões de melhoria

1. **Definir licença** – Adicionar arquivo `LICENSE`
2. **Configurar CI/CD** – GitHub Actions para testes e deploy
3. **Testes automatizados** – Implementar Vitest + React Testing Library
4. **Documentação de API** – Criar docs para Cloud Functions
5. **Variáveis de ambiente** – Migrar credenciais do Firebase para `.env`
6. **Screenshots** – Adicionar capturas reais em `docs/screenshots/`
7. **Badge de versão** – Adicionar badge no topo do README
8. **Deploy instructions** – Documentar processo de deploy
9. **CHANGELOG** – Criar arquivo de histórico de mudanças

---

<details>
<summary><strong>📋 Índice rápido</strong></summary>

1. [Funcionalidades](#-funcionalidades)
2. [Arquitetura](#-arquitetura)
3. [Tecnologias](#-tecnologias)
4. [Instalação](#-como-executar)
5. [Variáveis de Ambiente](#-variáveis-de-ambiente)
6. [Como usar](#-como-usar)
7. [APIs](#-apis-utilizadas)
8. [Testes](#-testes)
9. [Roadmap](#-roadmap)
10. [Contribuição](#-contribuição)

</details>