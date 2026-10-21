// Login e sincronização com o Firebase. Expõe window.Nuvem e avisa o app com o evento "nuvem-pronta".
// Dados: usuarios/{uid}/meses/{AAAA-MM} = { itens: [...] }, usuarios/{uid}/ajustes/geral = { ... }
// e usuarios/{uid}/dispositivos/{id} = { token } para os avisos de vencimento (lidos pelo robô em avisos/).
import * as cfg from './firebase-config.js';

const { firebaseConfig } = cfg;
const vapidKey = cfg.vapidKey && cfg.vapidKey !== 'COLE_AQUI' ? cfg.vapidKey : '';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

function anunciar(nuvem) {
  window.Nuvem = nuvem;
  window.dispatchEvent(new Event('nuvem-pronta'));
}

const MENSAGENS = {
  'auth/invalid-email': 'Este e-mail não parece válido. Confira se digitou certo.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Use "Entrar".',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Conecte-se para entrar.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
  'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar.',
  'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase. Adicione-o em Authentication → Configurações → Domínios autorizados.',
  'auth/operation-not-allowed': 'Este tipo de login não está ativado no Firebase.',
  'auth/configuration-not-found': 'O login ainda não foi ativado no Firebase (Authentication → Método de login).',
};
const traduzir = e => MENSAGENS[e && e.code] || 'Não foi possível concluir. Tente de novo.';

async function iniciar() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'COLE_AQUI') {
    anunciar({ configurado: false });
    return;
  }
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  auth.languageCode = 'pt';
  // Cache local do Firestore: o app abre e grava sem internet e sincroniza quando a conexão voltar.
  let db;
  try {
    db = F.initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch (e) {
    db = F.getFirestore(app);
  }
  // Notificações push (Firebase Cloud Messaging). Nem todo navegador aceita: no iPhone, só o app da Tela de Início.
  let M = null, messaging = null, pushSuportado = false;
  try {
    M = await import(`${SDK}/firebase-messaging.js`);
    pushSuportado = await M.isSupported();
    if (pushSuportado) messaging = M.getMessaging(app);
  } catch (e) { pushSuportado = false; }
  const idDoToken = async token => {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  };

  const embrulhar = fn => async (...args) => {
    try { return await fn(...args); }
    catch (e) { throw Object.assign(new Error(traduzir(e)), { code: e && e.code }); }
  };

  anunciar({
    configurado: true,
    aoMudarUsuario(cb) {
      return A.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email, nome: u.displayName || '' } : null));
    },
    entrar: embrulhar((email, senha) => A.signInWithEmailAndPassword(auth, email, senha)),
    criarConta: embrulhar(async (email, senha, nome) => {
      const r = await A.createUserWithEmailAndPassword(auth, email, senha);
      if (nome) await A.updateProfile(r.user, { displayName: nome });
    }),
    entrarComGoogle: embrulhar(() => A.signInWithPopup(auth, new A.GoogleAuthProvider())),
    recuperarSenha: embrulhar(email => A.sendPasswordResetEmail(auth, email)),
    sair: () => A.signOut(auth),

    // Entrega { meses, config, doServidor } sempre que algo muda (neste ou em outro aparelho).
    assinar(uid, cb, erro) {
      let meses = null, config = null, servMeses = false, servConfig = false;
      const enviar = () => { if (meses && config) cb({ meses, config: config.dados, doServidor: servMeses && servConfig }); };
      const u1 = F.onSnapshot(F.collection(db, 'usuarios', uid, 'meses'), { includeMetadataChanges: true }, snap => {
        meses = {};
        snap.forEach(d => { const b = d.data(); meses[d.id] = Array.isArray(b.itens) ? b.itens : []; });
        servMeses = servMeses || !snap.metadata.fromCache;
        enviar();
      }, erro);
      const u2 = F.onSnapshot(F.doc(db, 'usuarios', uid, 'ajustes', 'geral'), { includeMetadataChanges: true }, snap => {
        config = { dados: snap.exists() ? snap.data() : null };
        servConfig = servConfig || !snap.metadata.fromCache;
        enviar();
      }, erro);
      return () => { u1(); u2(); };
    },
    gravarMes(uid, mk, itens) {
      const ref = F.doc(db, 'usuarios', uid, 'meses', mk);
      return itens.length ? F.setDoc(ref, { itens }) : F.deleteDoc(ref);
    },
    gravarAjustes(uid, config) {
      return F.setDoc(F.doc(db, 'usuarios', uid, 'ajustes', 'geral'), config);
    },

    pushSuportado,
    avisosConfigurados: !!vapidKey,
    // Pede permissão, gera o endereço de entrega deste aparelho e o guarda na conta. Chamar a partir de um toque.
    async ativarAvisos(uid) {
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') {
        throw Object.assign(new Error('As notificações não foram permitidas. Para ativar, libere as notificações deste site nas configurações do navegador.'), { code: 'permissao' });
      }
      try {
        const registro = await navigator.serviceWorker.ready;
        const token = await M.getToken(messaging, { vapidKey, serviceWorkerRegistration: registro });
        if (!token) throw new Error('sem token');
        const id = await idDoToken(token);
        await F.setDoc(F.doc(db, 'usuarios', uid, 'dispositivos', id), {
          token,
          criadoEm: F.serverTimestamp(),
          aparelho: navigator.userAgent.slice(0, 200),
        });
        return id;
      } catch (e) {
        throw Object.assign(new Error('Não foi possível ativar os avisos agora. Verifique a internet e tente de novo.'), { code: e && e.code });
      }
    },
    async desativarAvisos(uid, id) {
      try { await M.deleteToken(messaging); } catch (e) {}
      if (id) await F.deleteDoc(F.doc(db, 'usuarios', uid, 'dispositivos', id));
    },
  });
}

iniciar().catch(() => anunciar({ configurado: false, falhou: true }));
