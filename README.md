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
