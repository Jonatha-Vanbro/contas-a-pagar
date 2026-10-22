# Contas a Pagar

App de celular (PWA) para controlar contas a pagar: vencimentos, contas fixas, parceladas, vencidas e quanto falta pagar no mês. Detalhes de instalação e configuração no `README.md`.

- **Repositório:** https://github.com/Jonatha-Vanbro/contas-a-pagar
- **Publicado em:** https://jonatha-vanbro.github.io/contas-a-pagar/ (GitHub Pages, `main`, raiz; `.nojekyll`)
- **Stack:** HTML/CSS/JS estático, sem build. Login e dados no **Firebase** (Auth e-mail/senha + Google; Firestore em `southamerica-east1`). Sem Firebase configurado, funciona offline só no aparelho.

## Arquivos
| Caminho | O que é |
|---|---|
| `index.html` | O app inteiro (telas, lógica, estilos) |
| `nuvem.js` | Sincronização com Firestore / login |
| `firebase-config.js` | Config pública do Firebase + `vapidKey` (não são segredos) |
| `firestore.rules` | Regras de segurança — colar no console do Firestore ao mudar |
| `sw.js` | Service worker (cache offline). **Ao publicar mudança, incrementar `VERSAO`** (ex.: `contas-v5` → `contas-v6`) |
| `manifest.webmanifest`, `icons/` | Instalação como app |
| `avisos/` | Robô de notificações (Node 20): `avisos.mjs` envia via FCM, `regras.mjs` decide quando avisar |
| `.github/workflows/avisos.yml` | Roda o robô todo dia às 8h de Brasília (11h UTC); tem opção de aviso de teste |

## Cuidados
- Segredo `FIREBASE_SERVICE_ACCOUNT` fica só nos Secrets do GitHub (conta de serviço restrita `robo-avisos`, projeto `contas-a-pagar-b86cb`). Nunca gravar chave no repositório.
- Backup/restauração em JSON pelo próprio app (Ajustes).
- iPhone: avisos só no app adicionado à Tela de Início, iOS 16.4+.
