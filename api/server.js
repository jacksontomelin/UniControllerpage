'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// Configuração
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const DB_DIR = process.env.DB_DIR || '/data';
const DESTINO = process.env.DESTINO_EMAIL || 'jk2706@gmail.com';
const REMETENTE = process.env.SMTP_FROM || process.env.SMTP_USER || 'jk2706@gmail.com';
const RESPONDER_PARA = process.env.REPLY_TO || DESTINO;
const SITE = process.env.SITE_URL || 'https://unicontroller.com.br';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ORIGENS = (process.env.CORS_ORIGINS ||
  'https://unicontroller.com.br,https://www.unicontroller.com.br')
  .split(',').map(s => s.trim()).filter(Boolean);

const STATUS = {
  recebido:   { rotulo: 'Recebido',    desc: 'Sua solicitação chegou e está na fila de análise.' },
  analise:    { rotulo: 'Em análise',  desc: 'Estamos avaliando o cenário para montar a proposta.' },
  respondido: { rotulo: 'Respondido',  desc: 'Enviamos um retorno para o seu e-mail.' },
  concluido:  { rotulo: 'Concluído',   desc: 'Atendimento encerrado. Se precisar, é só reabrir o contato.' }
};

// ─────────────────────────────────────────────────────────────
// Banco
// ─────────────────────────────────────────────────────────────
fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, 'tickets.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo     TEXT UNIQUE NOT NULL,
    nome       TEXT NOT NULL,
    empresa    TEXT NOT NULL,
    email      TEXT NOT NULL,
    telefone   TEXT,
    segmento   TEXT,
    volume     TEXT,
    mensagem   TEXT,
    origem     TEXT,
    status     TEXT NOT NULL DEFAULT 'recebido',
    criado_em  TEXT NOT NULL,
    atualizado TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS eventos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    status    TEXT NOT NULL,
    nota      TEXT,
    criado_em TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_codigo ON tickets(codigo);
`);

function proximoCodigo() {
  const ano = new Date().getFullYear();
  const row = db.prepare(
    "SELECT COUNT(*) AS n FROM tickets WHERE codigo LIKE ?"
  ).get(`UC-${ano}-%`);
  return `UC-${ano}-${String(row.n + 1).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// E-mail
// ─────────────────────────────────────────────────────────────
// Gmail: basta SMTP_SERVICE=gmail com usuário e senha de app.
// Qualquer outro provedor: informe SMTP_HOST/SMTP_PORT.
const transporter = nodemailer.createTransport(
  process.env.SMTP_SERVICE === 'gmail'
    ? { service: 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      }
);

const smtpAtivo = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function layout(titulo, corpo) {
  return `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#F7F9FD;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FD;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #DDE6F5">
  <tr><td style="background:#050B33;padding:26px 30px">
    <div style="font-size:19px;font-weight:800;letter-spacing:-.5px;color:#fff">
      <span style="color:#7DD3F5">UNI</span>CONTROLLER<span style="color:#7DD3F5">.</span>
    </div>
  </td></tr>
  <tr><td style="padding:32px 30px">
    <h1 style="margin:0 0 18px;font-size:21px;color:#050B33;letter-spacing:-.4px">${esc(titulo)}</h1>
    ${corpo}
  </td></tr>
  <tr><td style="background:#F7F9FD;padding:20px 30px;border-top:1px solid #DDE6F5;font-size:12px;color:#5A6A8A;line-height:1.7">
    UniController &middot; Blumenau e Timbó, Santa Catarina<br>
    <a href="mailto:suporte@unicontroller.com.br" style="color:#0084C7">suporte@unicontroller.com.br</a> &middot; (47) 99935-7131
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function linha(rot, val) {
  if (!val) return '';
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #EDF2F8;font-size:13px;color:#5A6A8A;width:170px;vertical-align:top">${esc(rot)}</td>
    <td style="padding:9px 0;border-bottom:1px solid #EDF2F8;font-size:14px;color:#0D1B3E;font-weight:600">${esc(val)}</td>
  </tr>`;
}

function emailInterno(t) {
  const corpo = `
  <p style="margin:0 0 20px;font-size:14px;color:#5A6A8A;line-height:1.7">
    Nova solicitação pelo site. Ticket <b style="color:#0D1B3E">${esc(t.codigo)}</b>.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${linha('Nome', t.nome)}
    ${linha('Empresa', t.empresa)}
    ${linha('E-mail', t.email)}
    ${linha('Telefone', t.telefone)}
    ${linha('Segmento', t.segmento)}
    ${linha('Volume mensal', t.volume)}
    ${linha('Origem', t.origem)}
  </table>
  ${t.mensagem ? `<div style="margin-top:22px;background:#E8F4FD;border-left:3px solid #0084C7;border-radius:10px;padding:16px 18px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#0084C7;margin-bottom:8px">O que está travando</div>
    <div style="font-size:14px;color:#0D1B3E;line-height:1.7;white-space:pre-wrap">${esc(t.mensagem)}</div>
  </div>` : ''}
  <div style="margin-top:26px">
    <a href="mailto:${esc(t.email)}?subject=${encodeURIComponent('Re: ' + t.codigo + ' | UniController')}"
       style="display:inline-block;background:#0061AF;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:14px;font-weight:700">
      Responder ${esc(t.nome.split(' ')[0])}
    </a>
    ${t.telefone ? `<a href="https://wa.me/55${esc(String(t.telefone).replace(/\D/g, ''))}"
       style="display:inline-block;margin-left:8px;background:#25D366;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:14px;font-weight:700">
      WhatsApp</a>` : ''}
  </div>`;
  return { assunto: `[${t.codigo}] ${t.empresa} · ${t.segmento || 'contato'}`, html: layout('Nova solicitação de proposta', corpo) };
}

function emailCliente(t) {
  const st = STATUS[t.status] || STATUS.recebido;
  const corpo = `
  <p style="margin:0 0 18px;font-size:15px;color:#0D1B3E;line-height:1.75">
    Olá, ${esc(t.nome.split(' ')[0])}. Recebemos a sua solicitação e abrimos um atendimento.
  </p>
  <div style="background:#050B33;border-radius:14px;padding:22px 24px;margin-bottom:22px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#7DD3F5;margin-bottom:8px">Número do ticket</div>
    <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-.5px">${esc(t.codigo)}</div>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.14);font-size:13px;color:rgba(255,255,255,.7)">
      Status atual: <b style="color:#fff">${esc(st.rotulo)}</b><br>${esc(st.desc)}
    </div>
  </div>
  <p style="margin:0 0 18px;font-size:14px;color:#5A6A8A;line-height:1.75">
    Retornamos em até <b style="color:#0D1B3E">um dia útil</b>. Você pode acompanhar o andamento a qualquer momento:
  </p>
  <a href="${SITE}/ticket.html?c=${encodeURIComponent(t.codigo)}"
     style="display:inline-block;background:#0061AF;color:#fff;text-decoration:none;padding:14px 26px;border-radius:11px;font-size:14px;font-weight:700">
    Acompanhar meu atendimento
  </a>
  <div style="margin-top:28px;padding-top:22px;border-top:1px solid #EDF2F8">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#5A6A8A;margin-bottom:12px">Resumo do que você enviou</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${linha('Empresa', t.empresa)}
      ${linha('Segmento', t.segmento)}
      ${linha('Volume mensal', t.volume)}
    </table>
  </div>
  <p style="margin:22px 0 0;font-size:13px;color:#5A6A8A;line-height:1.7">
    Precisa de algo urgente? Fale direto no WhatsApp
    <a href="https://wa.me/5547999357131" style="color:#0084C7;font-weight:700">(47) 99935-7131</a>.
  </p>`;
  return { assunto: `${t.codigo} · Recebemos a sua solicitação`, html: layout('Atendimento aberto', corpo) };
}

function emailStatus(t, nota) {
  const st = STATUS[t.status] || STATUS.recebido;
  const corpo = `
  <p style="margin:0 0 20px;font-size:15px;color:#0D1B3E;line-height:1.75">
    Olá, ${esc(t.nome.split(' ')[0])}. O seu atendimento <b>${esc(t.codigo)}</b> mudou de status.
  </p>
  <div style="background:#E8F4FD;border-left:3px solid #0084C7;border-radius:12px;padding:20px 22px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#0084C7;margin-bottom:7px">Status atual</div>
    <div style="font-size:19px;font-weight:800;color:#050B33;letter-spacing:-.3px">${esc(st.rotulo)}</div>
    <div style="margin-top:8px;font-size:14px;color:#5A6A8A;line-height:1.7">${esc(nota || st.desc)}</div>
  </div>
  <div style="margin-top:24px">
    <a href="${SITE}/ticket.html?c=${encodeURIComponent(t.codigo)}"
       style="display:inline-block;background:#0061AF;color:#fff;text-decoration:none;padding:14px 26px;border-radius:11px;font-size:14px;font-weight:700">
      Ver o andamento
    </a>
  </div>`;
  return { assunto: `${t.codigo} · ${st.rotulo}`, html: layout('Atualização do seu atendimento', corpo) };
}

async function enviar(para, assunto, html, responder) {
  if (!smtpAtivo()) {
    console.warn('[email] SMTP não configurado, ignorando envio para', para);
    return false;
  }
  try {
    await transporter.sendMail({
      from: REMETENTE,
      to: para,
      replyTo: responder || RESPONDER_PARA,
      subject: assunto,
      html
    });
    console.log('[email] enviado para', para, '|', assunto);
    return true;
  } catch (err) {
    console.error('[email] falhou para', para, '|', err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const origem = req.headers.origin;
  if (origem && ORIGENS.includes(origem)) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// limite simples por IP: 5 envios a cada 10 minutos
const janela = new Map();
function limitado(ip) {
  const agora = Date.now();
  const reg = (janela.get(ip) || []).filter(t => agora - t < 600000);
  if (reg.length >= 5) return true;
  reg.push(agora);
  janela.set(ip, reg);
  return false;
}
setInterval(() => {
  const agora = Date.now();
  for (const [ip, ts] of janela) {
    const vivos = ts.filter(t => agora - t < 600000);
    if (vivos.length) janela.set(ip, vivos); else janela.delete(ip);
  }
}, 600000).unref();

app.get('/health', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n;
  res.json({ ok: true, tickets: n, smtp: smtpAtivo() });
});

// Raiz: página de status legível, para não devolver "Cannot GET /"
app.get('/', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n;
  const smtp = smtpAtivo();
  res.type('html').send(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>API UniController</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#F7F9FD;color:#0D1B3E;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.c{background:#fff;border:1px solid #DDE6F5;border-radius:20px;padding:38px;max-width:520px;width:100%}
.lg{font-size:19px;font-weight:800;letter-spacing:-.5px;color:#050B33;margin-bottom:6px}
.lg span{color:#0084C7}
.sb{font-size:13px;color:#5A6A8A;margin-bottom:24px}
.st{display:inline-flex;align-items:center;gap:8px;background:#E7F7EF;border:1px solid #A7E3C8;color:#0B7A4E;padding:7px 14px;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:26px}
.st i{width:7px;height:7px;border-radius:50%;background:#10B981;display:block}
table{width:100%;border-collapse:collapse;margin-bottom:26px}
td{padding:10px 0;border-bottom:1px solid #EDF2F8;font-size:13.5px}
td:first-child{color:#5A6A8A;width:150px}
td:last-child{font-weight:600;text-align:right}
.warn{background:#FFF6E6;border-left:3px solid #E0A93B;border-radius:10px;padding:14px 16px;font-size:13px;color:#7A5A16;line-height:1.65;margin-bottom:22px}
a.b{display:inline-block;background:#0061AF;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:13.5px;font-weight:700}
.ft{margin-top:22px;padding-top:18px;border-top:1px solid #EDF2F8;font-size:12px;color:#5A6A8A;line-height:1.7}
code{background:#F1F5FA;padding:2px 6px;border-radius:5px;font-size:12px}
</style></head><body>
<div class="c">
  <div class="lg"><span>UNI</span>CONTROLLER<span>.</span></div>
  <div class="sb">Serviço de tickets</div>
  <div class="st"><i></i>NO AR</div>
  ${smtp ? '' : '<div class="warn"><b>SMTP não configurado.</b> Os tickets são gravados, mas nenhum e-mail sai. Preencha as variáveis SMTP_* nas configurações da aplicação.</div>'}
  <table>
    <tr><td>Status</td><td>operando</td></tr>
    <tr><td>Tickets registrados</td><td>${n}</td></tr>
    <tr><td>Envio de e-mail</td><td>${smtp ? 'configurado' : 'pendente'}</td></tr>
    <tr><td>Notificações para</td><td>${esc(DESTINO)}</td></tr>
  </table>
  <a class="b" href="${SITE}">Ir para o site</a>
  <div class="ft">
    Esta é a API do site, não uma página para visitantes.<br>
    Consulta de andamento: <code>${SITE}/ticket.html</code>
  </div>
</div></body></html>`);
});

// Abertura de ticket
app.post('/api/tickets', async (req, res) => {
  const b = req.body || {};

  // campo isca: bot preenche, humano não vê
  if (b.website) return res.status(200).json({ ok: true });

  const ip = req.ip || 'desconhecido';
  if (limitado(ip)) {
    return res.status(429).json({ ok: false, erro: 'Muitas solicitações. Tente novamente em alguns minutos.' });
  }

  const lim = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const nome = lim(b.nome, 120);
  const empresa = lim(b.empresa, 120);
  const email = lim(b.email, 160);

  if (!nome || !empresa || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ ok: false, erro: 'Preencha nome, empresa e um e-mail válido.' });
  }

  const agora = new Date().toISOString();
  const t = {
    codigo: proximoCodigo(),
    nome, empresa, email,
    telefone: lim(b.telefone, 40),
    segmento: lim(b.segmento, 80),
    volume: lim(b.volume, 80),
    mensagem: lim(b.mensagem, 4000),
    origem: lim(b.origem, 60) || 'site',
    status: 'recebido',
    criado_em: agora,
    atualizado: agora
  };

  const info = db.prepare(`INSERT INTO tickets
    (codigo,nome,empresa,email,telefone,segmento,volume,mensagem,origem,status,criado_em,atualizado)
    VALUES (@codigo,@nome,@empresa,@email,@telefone,@segmento,@volume,@mensagem,@origem,@status,@criado_em,@atualizado)`).run(t);

  db.prepare('INSERT INTO eventos (ticket_id,status,nota,criado_em) VALUES (?,?,?,?)')
    .run(info.lastInsertRowid, 'recebido', 'Solicitação recebida pelo site.', agora);

  // responde já; e-mail sai em seguida sem travar o cliente
  res.json({ ok: true, codigo: t.codigo, url: `${SITE}/ticket.html?c=${encodeURIComponent(t.codigo)}` });

  const interno = emailInterno(t);
  const cliente = emailCliente(t);
  enviar(DESTINO, interno.assunto, interno.html, t.email);  // responder cai no cliente
  enviar(t.email, cliente.assunto, cliente.html);
});

// Consulta pública do andamento
app.get('/api/tickets/:codigo', (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE codigo = ?').get(String(req.params.codigo).toUpperCase());
  if (!t) return res.status(404).json({ ok: false, erro: 'Ticket não encontrado.' });
  const ev = db.prepare('SELECT status,nota,criado_em FROM eventos WHERE ticket_id = ? ORDER BY id').all(t.id);
  const oculto = t.email.replace(/^(.).*(.@)/, (m, a, b) => a + '****' + b);
  res.json({
    ok: true,
    codigo: t.codigo,
    empresa: t.empresa,
    email: oculto,
    status: t.status,
    rotulo: (STATUS[t.status] || STATUS.recebido).rotulo,
    descricao: (STATUS[t.status] || STATUS.recebido).desc,
    criado_em: t.criado_em,
    atualizado: t.atualizado,
    historico: ev.map(e => ({
      status: e.status,
      rotulo: (STATUS[e.status] || {}).rotulo || e.status,
      nota: e.nota,
      criado_em: e.criado_em
    }))
  });
});

// ── Área interna (exige token) ──
function auth(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ ok: false, erro: 'ADMIN_TOKEN não configurado.' });
  const h = req.headers.authorization || '';
  if (h !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ ok: false, erro: 'Não autorizado.' });
  next();
}

app.get('/api/admin/tickets', auth, (req, res) => {
  const linhas = db.prepare('SELECT * FROM tickets ORDER BY id DESC LIMIT 200').all();
  res.json({ ok: true, total: linhas.length, tickets: linhas });
});

app.patch('/api/admin/tickets/:codigo', auth, async (req, res) => {
  const novo = String((req.body || {}).status || '');
  const nota = String((req.body || {}).nota || '').slice(0, 1000);
  if (!STATUS[novo]) {
    return res.status(400).json({ ok: false, erro: 'Status inválido. Use: ' + Object.keys(STATUS).join(', ') });
  }
  const t = db.prepare('SELECT * FROM tickets WHERE codigo = ?').get(String(req.params.codigo).toUpperCase());
  if (!t) return res.status(404).json({ ok: false, erro: 'Ticket não encontrado.' });

  const agora = new Date().toISOString();
  db.prepare('UPDATE tickets SET status = ?, atualizado = ? WHERE id = ?').run(novo, agora, t.id);
  db.prepare('INSERT INTO eventos (ticket_id,status,nota,criado_em) VALUES (?,?,?,?)').run(t.id, novo, nota, agora);

  t.status = novo;
  const msg = emailStatus(t, nota);
  const ok = await enviar(t.email, msg.assunto, msg.html);
  res.json({ ok: true, codigo: t.codigo, status: novo, email_enviado: ok });
});

// Rota inexistente: responde em JSON, não com o HTML padrão do Express
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    erro: 'Rota não encontrada.',
    rotas: ['GET /', 'GET /health', 'POST /api/tickets', 'GET /api/tickets/:codigo']
  });
});

// Erro inesperado: nunca vaza detalhe interno para o cliente
app.use((err, req, res, next) => {
  console.error('[erro]', err && err.message);
  res.status(500).json({ ok: false, erro: 'Erro interno. Tente novamente em instantes.' });
});

// Backup diário do banco, mantendo os 14 mais recentes.
// Ticket é lead comercial: se o volume sumir, não há como recuperar.
function backup() {
  try {
    const dir = path.join(DB_DIR, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const nome = `tickets-${new Date().toISOString().slice(0, 10)}.db`;
    db.backup(path.join(dir, nome))
      .then(() => {
        const antigos = fs.readdirSync(dir).filter(f => f.endsWith('.db')).sort();
        while (antigos.length > 14) fs.unlinkSync(path.join(dir, antigos.shift()));
        console.log('[backup]', nome);
      })
      .catch(e => console.error('[backup] falhou:', e.message));
  } catch (e) {
    console.error('[backup] falhou:', e.message);
  }
}
backup();
setInterval(backup, 24 * 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`[tickets] ouvindo na porta ${PORT}`);
  console.log(`[tickets] banco em ${DB_DIR}`);
  console.log(`[tickets] notificações para ${DESTINO}`);
  console.log(`[tickets] SMTP ${smtpAtivo() ? 'configurado (' + process.env.SMTP_USER + ')' : 'NÃO configurado'}`);
});
