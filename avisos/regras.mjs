// Decide o que avisar a cada dia. Sem dependências, para poder testar no navegador.

export const NOTIF_PADRAO = { dias: [3, 1, 0], vencidas: true };

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = c => brl.format((c || 0) / 100);
const diaNum = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const pad = n => String(n).padStart(2, '0');

// Data de hoje no fuso de Brasília, no formato AAAA-MM-DD.
export function hojeEmBrasilia(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

// Meses (AAAA-MM) que o robô precisa ler: dois para trás (vencidas) e um à frente (avisos de 3 dias na virada do mês).
export function mesesParaLer(hoje) {
  const [y, m] = hoje.split('-').map(Number);
  return [-2, -1, 0, 1].map(k => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; });
}

const quando = d => d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`;
const nomeDe = c => c.desc || 'Conta sem descrição';
// Valor estimado (conta que muda todo mês e ainda não teve o valor confirmado) aparece com "~".
const valorDe = c => (c.estimado ? '~' : '') + fmt(c.valor);
// Dias antes do vencimento em que o robô pede para confirmar um valor estimado, mesmo sem outro aviso.
export const DIAS_CONFIRMAR = 5;

// Recebe todas as contas lidas e devolve { titulo, corpo } ou null quando não há nada a avisar hoje.
export function montarAviso(contas, hoje, notif) {
  const n = { ...NOTIF_PADRAO, ...(notif || {}) };
  const dias = Array.isArray(n.dias) ? n.dias : NOTIF_PADRAO.dias;
  const h = diaNum(hoje);
  const abertas = contas.filter(c => c && !c.pago && typeof c.valor === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(c.venc || ''));
  const proximas = abertas.map(c => ({ c, d: diaNum(c.venc) - h })).filter(x => x.d >= 0 && dias.includes(x.d)).sort((a, b) => a.d - b.d || b.c.valor - a.c.valor);
  const vencidas = n.vencidas ? abertas.filter(c => diaNum(c.venc) < h).sort((a, b) => a.venc.localeCompare(b.venc)) : [];
  // Estimadas que vencem em até DIAS_CONFIRMAR dias: a fatura já deve ter chegado.
  const aConfirmar = abertas.filter(c => c.estimado && diaNum(c.venc) - h >= 0 && diaNum(c.venc) - h <= DIAS_CONFIRMAR);
  const pedeConfirmacaoHoje = aConfirmar.some(c => diaNum(c.venc) - h === DIAS_CONFIRMAR);
  if (!proximas.length && !vencidas.length && !pedeConfirmacaoHoje) return null;
  const linhaConfirmar = aConfirmar.length ? `Confirme o valor: ${aConfirmar.slice(0, 3).map(nomeDe).join(', ')}${aConfirmar.length > 3 ? '…' : ''}` : '';

  // Só o pedido de confirmação (5 dias antes de uma conta estimada).
  if (!proximas.length && !vencidas.length) {
    const c = aConfirmar.find(x => diaNum(x.venc) - h === DIAS_CONFIRMAR);
    return aConfirmar.length === 1
      ? { titulo: `Confirme o valor: ${nomeDe(c)}`, corpo: `Vence em ${DIAS_CONFIRMAR} dias · estimado em ${fmt(c.valor)}. Atualize quando a fatura chegar.` }
      : { titulo: `${aConfirmar.length} contas com valor a confirmar`, corpo: linhaConfirmar };
  }

  // Uma conta só: título direto.
  if (proximas.length === 1 && !vencidas.length) {
    const { c, d } = proximas[0];
    const corpo = c.estimado
      ? `Valor estimado ${fmt(c.valor)} · confirme quando a fatura chegar`
      : `${fmt(c.valor)}${c.pag ? ' · ' + c.pag : ''}`;
    return { titulo: `${nomeDe(c)} vence ${quando(d)}`, corpo: [corpo, aConfirmar.some(x => x !== c) ? linhaConfirmar : ''].filter(Boolean).join('\n') };
  }
  if (!proximas.length && vencidas.length === 1) {
    const c = vencidas[0];
    const atraso = h - diaNum(c.venc);
    return { titulo: `${nomeDe(c)} está vencida`, corpo: [`${valorDe(c)} · venceu há ${atraso} dia${atraso === 1 ? '' : 's'}`, linhaConfirmar].filter(Boolean).join('\n') };
  }

  const total = proximas.reduce((s, x) => s + x.c.valor, 0) + vencidas.reduce((s, c) => s + c.valor, 0);
  const qtd = proximas.length + vencidas.length;
  const partes = [];
  if (vencidas.length) partes.push(`${vencidas.length} vencida${vencidas.length === 1 ? '' : 's'}`);
  const linhas = proximas.slice(0, 4).map(({ c, d }) => `${quando(d).replace(/^./, s => s.toUpperCase())}: ${nomeDe(c)} ${valorDe(c)}`);
  if (proximas.length > 4) linhas.push(`e mais ${proximas.length - 4}`);
  if (vencidas.length) linhas.unshift(`Vencidas: ${vencidas.slice(0, 3).map(nomeDe).join(', ')}${vencidas.length > 3 ? '…' : ''}`);
  if (linhaConfirmar) linhas.push(linhaConfirmar);
  return {
    titulo: `${qtd} contas para pagar · ${fmt(total)}${partes.length ? ' (' + partes.join(', ') + ')' : ''}`,
    corpo: linhas.join('\n'),
  };
}
