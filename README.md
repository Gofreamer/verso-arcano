# Verso Arcano

RPG de campanha em português. O Next.js serve as páginas e as ações do jogo no Cloudflare Workers. Firebase Authentication cuida das contas e Cloud Firestore guarda as fichas, os juramentos, as magias e o histórico. A aprovação manual está disponível sem IA.

## Firebase

1. Crie um projeto dedicado. Em **Authentication → Sign-in method**, habilite **Email/Password**. Em **Project settings**, registre um aplicativo web e use o ID do projeto e a chave de API da configuração web em `FIREBASE_PROJECT_ID` e `FIREBASE_API_KEY`.
2. Crie o banco padrão do **Cloud Firestore** em modo de produção. Publique o conteúdo de [firestore.rules](firestore.rules) em **Firestore → Rules**. Os clientes ficam sem acesso direto. O servidor verifica as permissões e usa IAM para ler e gravar. As coleções surgem no primeiro uso.
3. Crie uma conta de serviço dedicada no Google Cloud com a função **Cloud Datastore User** (`roles/datastore.user`) no projeto. Use o e-mail da conta e a chave privada em `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`. Guarde a chave somente no ambiente local privado ou nos segredos do Worker. O servidor usa a API de autenticação de usuários separadamente.
4. Use o template padrão de confirmação de e-mail do Firebase. O jogador confirma o endereço pelo link e volta ao site para entrar. Para usar o manipulador próprio, configure o URL da ação de verificação como `https://<dominio-do-site>/auth/confirm`.

## Desenvolvimento local

Requer Node.js 22 ou superior e a versão do pnpm indicada em `package.json`.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Preencha `.env.local` com as variáveis do Firebase e abra [localhost:3000](http://localhost:3000). Para a chave PEM em uma linha, use aspas e mantenha as quebras como `\n`.

## Primeiro mestre

Cadastre a conta escolhida no site e confirme o e-mail. Copie o UID dessa conta em **Firebase Authentication → Users**. Defina `FIREBASE_INITIAL_MASTER_UID` no servidor, reinicie a instância local ou publique a configuração no Worker. O UID precisa corresponder a uma conta autenticada e verificada. O mestre pode promover outras contas que já entraram pela tela de configurações.

## Cloudflare Workers

Conecte somente o repositório do Verso Arcano em **Workers & Pages → Create application**. Use Node.js 22 ou superior, `pnpm build:cloudflare` como comando de build e `pnpm deploy:cloudflare` como comando de implantação. O projeto inclui [wrangler.jsonc](wrangler.jsonc) e o adaptador OpenNext. Configure as variáveis do Firebase no runtime do Worker. Cadastre `FIREBASE_PRIVATE_KEY` como segredo. O build pode rodar sem a chave.

Em um ambiente Linux autenticado no Wrangler:

```sh
pnpm install --frozen-lockfile
pnpm build:cloudflare
pnpm deploy:cloudflare
```

Após configurar o Worker, repita a primeira sessão com uma conta de jogador e outra de mestre. Confirme cadastro, login, criação de ficha, envio, aprovação e leitura da fórmula publicada. Veja a [documentação do adaptador da Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).

## Primeira sessão e testes

1. O jogador cria uma ficha, registra um juramento e propõe um canalizador.
2. O mestre confirma o rito para ativar o vínculo.
3. O jogador compõe e envia um encantamento.
4. O mestre registra efeito, tier, alcance, duração, custo e limitações. A fórmula registrada aparece no Grimório oficial.
5. O jogador pode solicitar revisão ou maestria. A versão abreviada herda a escala e o efeito da fórmula de referência.

O tier **Iniciação (provisório)**, o mínimo inicial de dois versos e os limites quantitativos podem ser ajustados pelo mestre. O consumo de energia durante a sessão é arbitrado pelo mestre.

```sh
pnpm check
pnpm test
pnpm build
```

O teste exercita as regras do servidor com armazenamento de teste em memória. O Firebase real e o Worker devem passar pelo roteiro acima antes de liberar o site aos jogadores.

## Analista arcano opcional

Configure `ARCANE_AI_URL` com o endpoint completo de chat completions, `ARCANE_AI_MODEL` e `ARCANE_AI_KEY` como segredo. O provedor deve aceitar `response_format: { type: "json_object" }`. A análise recebe apenas a proposta e os dados autorizados para o contexto. Resultados inválidos seguem para avaliação manual. Somente o mestre pode aprovar, e o servidor revalida os limites.
