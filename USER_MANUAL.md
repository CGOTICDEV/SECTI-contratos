# 📘 Manual de Usuário – Sistema SECTI Contratos & Convênios

Bem‑vindo ao painel de **gestão unificada de contratos e convênios da SECTI**.  
Este documento explica, de maneira clara e direcionada a quem usa o sistema, tudo o que é possível fazer na aplicação – desde entrar com seu usuário até registrar alterações e consultar históricos.

---

## 🔑 Acesso e autenticação

O acesso é **restrito** e sempre feito com **e‑mail institucional `@secti.ba.gov.br`**.

- **Login tradicional**  
  Informe e‑mail + senha. Se a conta ainda não estiver verificada, o sistema envia um e‑mail automático e bloqueia o acesso até a confirmação.

- **Acesso por link mágico**  
  Se não quiser digitar senha, peça um link na tela de login. Ele é enviado para seu e‑mail institucional e funciona enquanto estiver válido.

- **Recuperação de senha**  
  Existe um botão “Esqueci a senha” no formulário. Você recebe um link para redefinição.

- **Cadastro de novo usuário**  
  Somente solicitado manualmente via tela de **“Criar nova conta”**. É necessário:
  - Nome de usuário
  - Foto (avatar)
  - E‑mail institucional
  - Senha (mínimo 6 caracteres)
  - Perfil de acesso (Gestor, Fiscal ou CCC)
  - Tel./setor (opcionali)

> Todos os cadastros exigem verificação de e‑mail. Até isso ser feito, não dá pra logar.

- **Dicas de uso**  
  - Não digite o domínio `@secti.ba.gov.br`; ele é completado automaticamente.
  - Se você começar a digitar o e‑mail e sair do campo, o sistema “digita” o domínio para você com animação.

---

## 👥 Perfis e permissões

Cada usuário é associado a um papel que define o que pode fazer:

| Perfil  | O que pode fazer |
|---------|------------------|
| **Gestor** | Criar e editar contratos/convênios, acompanhar execução |
| **Fiscal** | Atualizar execuções técnicas/financeiras, alterar valores/saldos |
| **CCC** | Acesso somente leitura global; pode **adicionar apostilas** (notas internas) |

⚠️ O botão **Novo Registro** na barra lateral só aparece para gestores e fiscais.

---

## 🧭 Navegação principal

O menu lateral fixo contém:

- **Painel Geral** – página inicial com lista e filtros;
- **Novo Registro** – abre formulário para criar contrato/convênio;
- **Meu Perfil** – editar seus dados e alterar senha;
- **Sair do Sistema** – encerra sessão.

No cabeçalho há também um “Olá, <nome>” com sua foto/iniciais; clicar leva ao perfil.

---

## 📊 Painel Geral

### Filtros por prazo

Logo no topo há **abinhas** com contadores:

- Todos (total de registros)
- <15 dias (inclui vencidos)
- <30, <60, <90

Clique para limitar a lista aos contratos próximos do fim de vigência.

### Busca livre

Campo de texto livre que procura por empresa, número de contrato, objeto, gestor, fiscal, convênio e até conteúdo de apostilas.

### Exportar para Excel

Botão “Exportar Excel” gera planilha com os contratos atualmente visíveis.

---

## 📃 Tabela de contratos/convênios

A lista mostra, por registro:

- **Status** (Vigente, Suspenso, Vencido, etc.)
- Tipo (Contrato ou Convênio)
- Números (contrato, convênio, acordo, termo…)
- Empresa/convenente e objeto
- Gestor / Fiscal
- Vigência atual
- Saldo & garantia

### Ações

- 🕵️ **Ver detalhes** – abre o modal com todas as informações e o histórico.
- ✏️ **Editar** – disponível para gestor/fiscal; abre o formulário de edição.
- 🗒️ **Apostila** – só para CCC; permite adicionar nota interna ao contrato.

Clique em qualquer linha também abre os detalhes.

---

## 🔍 Visualizar detalhes

Ao ver um contrato/convênio você encontra:

1. **Resumo**
   - Todas as informações de identificação, prazos, responsáveis e finanças
   - Lista de “apostilas” já registradas
2. **Histórico**
   - Linha do tempo com cada alteração feita
   - Data/hora, usuário e mudanças (antes/depois)
   - É possível expandir cada entrada para ver os campos alterados

Ótimo para auditoria e rastrear alterações.

---

## ✏️ Criar ou editar registro

O formulário aparece em uma **barra lateral deslizante** dividida em abas:

- **Geral** – tipo (contrato/convênio), status, códigos, empresa, gestor, fiscal, objeto.
- **Cronograma** – vigências, último termo aditivo.
- **Financeiro** – valores iniciais/atuais, saldo, pagamentos.

Campos específicos de convênio surgem automaticamente ao escolher esse tipo.

Ao salvar, o sistema calcula as diferenças e grava um registro de histórico. Se nada mudou, mostra aviso “Nenhuma alteração detectada”.

---

## 🗂 Apostilas (CCC)

Usuários do perfil CCC podem:

- Consultar contratos livremente.
- Ao clicar no ícone de apostila em uma linha, abrir uma janela para digitar uma nota.
- Ver as apostilas anteriores nessa mesma janela.

As anotações ficam visíveis no detalhe do contrato e são incluídas no histórico.

---

## 👤 Meu Perfil

Aqui você pode:

- Ver e editar nome, telefone e setor.
- Alterar sua foto de perfil.
- Enviar link de recuperação de senha ou alterar senha (requer digitar a atual).

As mudanças são salvas no banco e, quando necessário, atualizadas no Firebase Auth.

---

## ✅ Outras funcionalidades

- **Login via link**: acessa sem senha, ideal para usuários que perderam a credencial.
- **Mensagem de tutorial**: botão “?” na tela de login mostra descrição resumida dos perfis e do sistema.
- **Validação automática de e‑mail**: a aplicação insiste no domínio correto e impede uso de contas fora da SECTI.
- **Indicadores**: contadores nos filtros ajudam a ter visão rápida do volume de contratos por prazo.

---

## 💡 Observações de uso

- Use sempre seu e‑mail institucional e mantenha a conta verificada.
- Mantenha os dados de perfil atualizados; a foto aparece nos logs de histórico.
- Em caso de dúvidas ou problemas de autenticação, contate o administrador responsável.

---

Esse é o panorama completo do sistema. Com ele você consegue gerenciar contratos e convênios de forma centralizada, segura e com rastreabilidade total das alterações. Aproveite! ✅