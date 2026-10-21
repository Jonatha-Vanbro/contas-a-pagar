// Robô diário: lê as contas de quem ativou os avisos e manda a notificação de vencimento.
// Roda no GitHub Actions (.github/workflows/avisos.yml) com a chave da conta de serviço do Firebase
// guardada no segredo FIREBASE_SERVICE_ACCOUNT.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { hojeEmBrasilia, mesesParaLer, montarAviso } from './regras.mjs';

const URL_APP = 'https://jonatha-vanbro.github.io/contas-a-pagar/';
const TESTE = process.env.TESTE === 'true';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Sem a chave ainda: termina sem erro para o GitHub não mandar e-mail de falha todo dia.
  console.log('Avisos desligados: falta o segredo FIREBASE_SERVICE_ACCOUNT (Settings → Secrets and variables → Actions).');
  process.exit(0);
}
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const messaging = getMessaging();

const hoje = hojeEmBrasilia();
const meses = mesesParaLer(hoje);
console.log(`Hoje (Brasília): ${hoje}${TESTE ? ' · modo teste' : ''}`);

let pessoas = 0, enviados = 0, removidos = 0;
const usuarios = await db.collection('usuarios').listDocuments();
for (const ref of usuarios) {
  const dispositivos = await ref.collection('dispositivos').get();
  if (dispositivos.empty) continue;
  pessoas++;

  let aviso;
  if (TESTE) {
    aviso = { titulo: 'Avisos funcionando', corpo: 'Este é um aviso de teste do Contas a Pagar.' };
  } else {
    const ajustes = await ref.collection('ajustes').doc('geral').get();
    const notif = ajustes.exists ? ajustes.data().notif : null;
    const docs = await Promise.all(meses.map(mk => ref.collection('meses').doc(mk).get()));
    const contas = docs.flatMap(d => (d.exists && Array.isArray(d.data().itens) ? d.data().itens : []));
    aviso = montarAviso(contas, hoje, notif);
  }
  if (!aviso) continue;

  const tokens = dispositivos.docs.map(d => d.data().token).filter(Boolean);
  const r = await messaging.sendEachForMulticast({
    tokens,
    data: { titulo: aviso.titulo, corpo: aviso.corpo, url: URL_APP, tag: 'vencimentos-' + hoje },
    webpush: { headers: { Urgency: 'high', TTL: String(12 * 3600) } },
  });
  enviados += r.successCount;

  // Aparelhos que desinstalaram o app ou bloquearam as notificações: tira da lista.
  await Promise.all(r.responses.map((resp, i) => {
    const codigo = resp.error && resp.error.code;
    if (codigo === 'messaging/registration-token-not-registered' || codigo === 'messaging/invalid-registration-token') {
      removidos++;
      return dispositivos.docs[i].ref.delete();
    }
    if (resp.error) console.warn(`Falha ao enviar para um aparelho: ${codigo}`);
    return null;
  }));
}

console.log(`Pessoas com avisos ativos: ${pessoas} · notificações enviadas: ${enviados} · aparelhos removidos: ${removidos}`);
