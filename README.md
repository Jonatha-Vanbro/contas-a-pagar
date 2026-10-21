# Contas a Pagar

App de celular para controlar contas a pagar: vencimentos, contas fixas mensais, parceladas, alertas de vencidas e o quanto falta pagar no mês.

É um site estático (HTML, CSS e JavaScript). O login e o salvamento na conta usam o **Firebase** (Google), no plano gratuito. Sem o Firebase configurado, o app funciona sem login e guarda tudo só no celular.

## 1. Configurar o Firebase (uma vez)

1. Acesse <https://console.firebase.google.com>, entre com sua conta Google e clique em **Criar projeto** (nome sugerido: `contas-a-pagar`). O Google Analytics pode ficar desativado.
2. Na página do projeto, clique no ícone **Web** (`</>`) para adicionar um app da Web. Dê um apelido (ex.: `Contas`) e **não** marque o Firebase Hosting.
3. O Firebase mostra um bloco `const firebaseConfig = { ... }`. Copie os valores para o arquivo [`firebase-config.js`](firebase-config.js), substituindo os textos `COLE_AQUI` e `SEU-PROJETO`.
   Esses valores não são senhas; quem protege os dados são as regras do passo 6.
4. Menu **Criação → Authentication → Vamos começar**. Em **Método de login**, ative:
   - **E-mail/senha**
   - **Google** (escolha seu e-mail como e-mail de suporte)
5. Ainda em Authentication, abra **Configurações → Domínios autorizados** e adicione `jonatha-vanbro.github.io`.
6. Menu **Criação → Firestore Database → Criar banco de dados**. Escolha o local `southamerica-east1 (São Paulo)` e o **modo de produção**. Depois abra a aba **Regras**, apague o conteúdo, cole o que está em [`firestore.rules`](firestore.rules) e clique em **Publicar**.

## 2. Publicar no GitHub Pages

1. Crie um repositório público chamado `contas-a-pagar` no GitHub.
2. Envie estes arquivos para ele:
   ```bash
   git remote add origin https://github.com/Jonatha-Vanbro/contas-a-pagar.git
   git push -u origin main
   ```
3. No repositório, abra **Settings → Pages**, em *Branch* escolha `main` e a pasta `/ (root)`, e salve.
4. Em um ou dois minutos o app fica em `https://jonatha-vanbro.github.io/contas-a-pagar/`.

## 3. Instalar no celular

- **Android (Chrome):** abra o endereço, toque no menu ⋮ → *Adicionar à tela inicial* (ou *Instalar app*).
- **iPhone (Safari):** abra o endereço, toque em Compartilhar → *Adicionar à Tela de Início*.

Na primeira vez o app pede para **entrar** ou **criar conta** (e-mail e senha, ou conta Google). Quem preferir pode tocar em *Usar sem conta*. Depois de entrar, as contas aparecem em qualquer celular ou computador em que você entrar com a mesma conta, e o app continua funcionando sem internet: o que você cadastrar offline é enviado quando a conexão voltar.

Se você já usava o app sem conta, ao entrar ele oferece enviar essas contas para a sua conta.

## Backup

Em **Ajustes → Fazer backup** o app gera um arquivo `backup-contas-AAAA-MM-DD.json` com tudo. Com a conta ele é opcional; sem conta é a única proteção se o celular for trocado ou o navegador limpo. Para recuperar: **Ajustes → Restaurar de um backup**.

## Atualizar o app

Depois de alterar os arquivos, mude `VERSAO` em `sw.js` (por exemplo `contas-v3`) para os celulares receberem a nova versão.
