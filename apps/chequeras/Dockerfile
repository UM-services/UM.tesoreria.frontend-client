FROM nginx:alpine

# Instalamos openssl y generamos un certificado auto-firmado al vuelo
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/ssl \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=AR/ST=Mendoza/L=Mendoza/O=UM/OU=Tesoreria/CN=tesoreria.local"

# Copiamos el build previamente generado por Nx
COPY dist/apps/chequeras/browser /usr/share/nginx/html

# Copiamos la configuracion propia de Nginx (para el ruteo de SPA)
COPY apps/chequeras/nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos y damos permisos al script de inicializacion de entorno
COPY apps/chequeras/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80 443

# Configuramos el entrypoint para que ejecute nuestro script antes de nginx
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
