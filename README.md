# Contas a Pagar

App de celular para controlar contas a pagar: vencimentos, contas fixas mensais, parceladas, alertas de vencidas e o quanto falta pagar no mês.

É um site estático (HTML, CSS e JavaScript, sem servidor). As contas ficam guardadas só no navegador do celular. Use **Ajustes → Fazer backup** com frequência e guarde o arquivo no Google Drive, e-mail ou WhatsApp.

## Publicar no GitHub Pages

1. Crie um repositório público chamado `contas-a-pagar` no GitHub.
2. Envie estes arquivos para ele:
   ```bash
   git remote add origin https://github.com/Jonatha-Vanbro/contas-a-pagar.git
   git push -u origin main
   ```
3. No repositório, abra **Settings → Pages**, em *Branch* escolha `main` e a pasta `/ (root)`, e salve.
4. Em um ou dois minutos o app fica em `https://jonatha-vanbro.github.io/contas-a-pagar/`.

## Instalar no celular

- **Android (Chrome):** abra o endereço, toque no menu ⋮ → *Adicionar à tela inicial* (ou *Instalar app*).
- **iPhone (Safari):** abra o endereço, toque em Compartilhar → *Adicionar à Tela de Início*.

Depois do primeiro acesso o app abre mesmo sem internet.

## Trocar de celular

No celular antigo: **Ajustes → Fazer backup**. No novo: abra o app e toque em **Restaurar de um backup**, escolhendo o arquivo `backup-contas-AAAA-MM-DD.json`.

## Atualizar o app

Depois de alterar os arquivos, mude `VERSAO` em `sw.js` (por exemplo `contas-v2`) para os celulares receberem a nova versão.
