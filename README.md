# UniController — Landing Page

Página institucional da **UniController** — sistemas e APIs para os mercados automotivo, financeiro e jurídico.

- **Domínio:** unicontroller.com.br
- **Stack:** HTML + CSS + JS puro, arquivo único. Sem build, sem dependência.
- **Fontes:** Syne (display) + DM Sans (texto), via Google Fonts.
- **Identidade:** navy `#050B33` · azure `#0061AF` / `#0084C7` · ciano `#7DD3F5`

## Estrutura

```
index.html                 página completa (HTML, CSS e JS inline)
img/jackson-tomelin.jpg    retrato usado no card de liderança e no depoimento
img/jackson-fenauto.jpg    foto do Congresso FENAUTO (seção Presença no mercado)
CNAME                      domínio customizado do GitHub Pages
```

## Deploy (Coolify — VPS KingHost)

Build pack: **Dockerfile**. A imagem serve o conteúdo estático com nginx
(gzip, cache de imagens, headers de segurança).

```
Dockerfile      imagem nginx:alpine
nginx.conf      compressão, cache e headers
robots.txt      indexação
sitemap.xml     sitemap
```

### Passos no Coolify

1. **+ New** → **Public Repository**
2. Repositório: `https://github.com/jacksontomelin/UniControllerpage`
3. Branch `main` · Build Pack **Dockerfile** · Port **80**
4. Domains: `https://unicontroller.com.br`
5. **Deploy**

### DNS (registrar do domínio)

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` | IP do VPS KingHost |
| A | `www` | IP do VPS KingHost |

O certificado SSL é emitido automaticamente pelo Coolify (Let's Encrypt)
depois que o DNS propagar e as portas 80/443 estiverem abertas.


## Depoimentos de clientes

A seção de depoimentos existe no `index.html` mas está **comentada**,
porque não há depoimentos reais ainda. Para ativar:

1. Peça a três clientes uma frase curta, autorizando nome e empresa
2. Substitua os textos marcados como `FRASE DO CLIENTE AQUI`
3. Remova as marcas de comentário `<!--` e `-->` que envolvem a seção

## Origem dos contatos

Cada link de WhatsApp carrega uma marca da seção de onde partiu o clique.
A mensagem chega com um sufixo entre colchetes:

| Marca | Onde fica |
|---|---|
| `botao-flutuante` | Bolinha verde fixa |
| `cta-final` | Bloco de chamada no fim da página |
| `formulario` | Atalho dentro do formulário corporativo |
| `rodape` | Rodapé |

Assim dá para saber o que mais converte sem instalar nenhuma ferramenta.

## Páginas

- `/` — landing principal
- `/privacidade.html` — política de privacidade (LGPD)

## Serviço de tickets (pasta `api/`)

Backend próprio que recebe o formulário, abre um ticket, avisa o Jackson por
e-mail e envia a confirmação para o cliente com o número do atendimento.

```
api/server.js    Express + SQLite + Nodemailer
api/Dockerfile   imagem Node 22 alpine
api/.env.example modelo das variáveis
```

### Deploy no Coolify (segunda aplicação)

1. **+ New** → **Public Repository** → mesmo repositório
2. **Base Directory:** `/api`
3. Build Pack **Dockerfile** · Port **3000**
4. **Storages:** adicione um volume persistente em `/data` (o banco fica ali)
5. **Domains:** `https://api.unicontroller.com.br`
6. Preencha as variáveis conforme `api/.env.example`
7. Deploy

No DNS, crie um registro **A** para `api` apontando para o IP do VPS.

### Endpoints

| Método | Rota | Uso |
|---|---|---|
| `POST` | `/api/tickets` | Abre o ticket (usado pelo formulário) |
| `GET` | `/api/tickets/:codigo` | Andamento público, sem dados sensíveis |
| `GET` | `/api/admin/tickets` | Lista os últimos 200 (exige token) |
| `PATCH` | `/api/admin/tickets/:codigo` | Muda o status e avisa o cliente (exige token) |
| `GET` | `/health` | Diagnóstico |

### Mudar o status de um ticket

```bash
curl -X PATCH https://api.unicontroller.com.br/api/admin/tickets/UC-2026-0001 \
  -H "Authorization: Bearer SEU_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"analise","nota":"Analisando o volume para montar a proposta."}'
```

Status disponíveis: `recebido`, `analise`, `respondido`, `concluido`.
Cada mudança dispara um e-mail para o cliente.

### Configurar o envio pelo Gmail

1. Ative a **verificação em duas etapas** na conta `jk2706@gmail.com`
2. Gere uma **senha de app** em `myaccount.google.com/apppasswords`
3. Nas variáveis da aplicação no Coolify, informe:

```
SMTP_SERVICE=gmail
SMTP_USER=jk2706@gmail.com
SMTP_PASS=a-senha-de-app-de-16-caracteres
SMTP_FROM=UniController <jk2706@gmail.com>
```

A senha comum do Gmail não funciona: o Google bloqueia login SMTP sem
senha de app.

Para o cliente ver `suporte@unicontroller.com.br` como remetente em vez
do Gmail, cadastre esse endereço em **Gmail → Configurações → Contas →
Enviar e-mail como**, confirme a verificação, e só então troque o
`SMTP_FROM`. Sem esse cadastro o Google reescreve o remetente e o
endereço do domínio é ignorado.

Limite do Gmail: cerca de 500 mensagens por dia, folgado para o volume
de um formulário de site.

### Verificação anti-robô

Não usa serviço externo. O navegador recebe um desafio assinado e precisa
encontrar um número que gere um hash SHA-256 com 15 bits zero à frente.

- Leva cerca de meio segundo no desktop e dois segundos no celular
- Começa a resolver quando a pessoa toca no primeiro campo, então já está
  pronto quando ela termina de preencher
- Ninguém clica em nada nem lê texto distorcido
- O desafio é assinado por HMAC: o servidor não guarda estado
- Cada desafio só vale uma vez, expira em 20 minutos e recusa envios com
  menos de 2,5 segundos

Ajuste a dificuldade em `DESAFIO_BITS` (cada bit a mais dobra o custo).
Defina também `DESAFIO_SECRET` com um valor longo e fixo, senão a chave
é sorteada a cada reinício e os desafios em aberto param de valer.

### Proteções já incluídas

- Campo isca invisível contra robôs
- Limite de 5 envios por IP a cada 10 minutos
- CORS restrito aos domínios da UniController
- Área interna protegida por token
- E-mail do cliente parcialmente oculto na consulta pública
