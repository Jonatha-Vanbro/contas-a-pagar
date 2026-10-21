// Login e sincronização com o Firebase. Expõe window.Nuvem e avisa o app com o evento "nuvem-pronta".
// Dados: usuarios/{uid}/meses/{AAAA-MM} = { itens: [...] } e usuarios/{uid}/ajustes/geral = { ... }.
import { firebaseConfig } from './firebase-config.js';

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
  });
}

iniciar().catch(() => anunciar({ configurado: false, falhou: true }));
