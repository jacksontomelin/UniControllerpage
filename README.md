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

## Publicação (GitHub Pages)

1. Settings → Pages → Source: `main` / raiz `/`
2. Custom domain: `unicontroller.com.br`
3. Marcar **Enforce HTTPS** depois que o certificado for emitido

### DNS necessário no provedor do domínio

Para o domínio raiz, criar 4 registros **A** apontando para o GitHub Pages:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

E um **CNAME** para `www` apontando para `jacksontomelin.github.io`.

## Seções

Hero · Dores do setor · A empresa · Corporativo · Liderança · Presença no mercado · Depoimento · Performance · Portfólio · Contato

## Contato

suporte@unicontroller.com.br · (47) 99935-7131
