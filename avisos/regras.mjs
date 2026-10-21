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

// Recebe todas as contas lidas e devolve { titulo, corpo } ou null quando não há nada a avisar hoje.
export function montarAviso(contas, hoje, notif) {
  const n = { ...NOTIF_PADRAO, ...(notif || {}) };
  const dias = Array.isArray(n.dias) ? n.dias : NOTIF_PADRAO.dias;
  const h = diaNum(hoje);
  const abertas = contas.filter(c => c && !c.pago && typeof c.valor === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(c.venc || ''));
  const proximas = abertas.map(c => ({ c, d: diaNum(c.venc) - h })).filter(x => x.d >= 0 && dias.includes(x.d)).sort((a, b) => a.d - b.d || b.c.valor - a.c.valor);
  const vencidas = n.vencidas ? abertas.filter(c => diaNum(c.venc) < h).sort((a, b) => a.venc.localeCompare(b.venc)) : [];
  if (!proximas.length && !vencidas.length) return null;

  // Uma conta só: título direto.
  if (proximas.length === 1 && !vencidas.length) {
    const { c, d } = proximas[0];
    return { titulo: `${nomeDe(c)} vence ${quando(d)}`, corpo: `${fmt(c.valor)}${c.pag ? ' · ' + c.pag : ''}` };
  }
  if (!proximas.length && vencidas.length === 1) {
    const c = vencidas[0];
    const atraso = h - diaNum(c.venc);
    return { titulo: `${nomeDe(c)} está vencida`, corpo: `${fmt(c.valor)} · venceu há ${atraso} dia${atraso === 1 ? '' : 's'}` };
  }

  const total = proximas.reduce((s, x) => s + x.c.valor, 0) + vencidas.reduce((s, c) => s + c.valor, 0);
  const qtd = proximas.length + vencidas.length;
  const partes = [];
  if (vencidas.length) partes.push(`${vencidas.length} vencida${vencidas.length === 1 ? '' : 's'}`);
  const linhas = proximas.slice(0, 4).map(({ c, d }) => `${quando(d).replace(/^./, s => s.toUpperCase())}: ${nomeDe(c)} ${fmt(c.valor)}`);
  if (proximas.length > 4) linhas.push(`e mais ${proximas.length - 4}`);
  if (vencidas.length) linhas.unshift(`Vencidas: ${vencidas.slice(0, 3).map(nomeDe).join(', ')}${vencidas.length > 3 ? '…' : ''}`);
  return {
    titulo: `${qtd} contas para pagar · ${fmt(total)}${partes.length ? ' (' + partes.join(', ') + ')' : ''}`,
    corpo: linhas.join('\n'),
  };
}
