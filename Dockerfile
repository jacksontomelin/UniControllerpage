FROM nginx:1.27-alpine

# Configuração própria (gzip, cache, headers de segurança)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Conteúdo estático
COPY index.html /usr/share/nginx/html/index.html
COPY img/ /usr/share/nginx/html/img/
COPY robots.txt sitemap.xml favicon.ico /usr/share/nginx/html/
COPY privacidade.html ticket.html home-v1.html 404.html /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
