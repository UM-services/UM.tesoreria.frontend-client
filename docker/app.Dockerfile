# syntax=docker/dockerfile:1
#
# Imagen multinodo para los ocho clientes Angular del monorepo.
#
#   docker build -f docker/app.Dockerfile --build-arg APP=externo-consulta \
#     -t um-tesoreria-externo-consulta-client .
#
# La compilación ocurre DENTRO del contenedor: la imagen es función exclusiva
# del código fuente, nunca del `dist/` que haya en el disco. El Dockerfile
# anterior copiaba `dist/apps/<app>/browser` y reconstruir la imagen dejaba
# servir el bundle anterior si el `nx build` no se había vuelto a ejecutar.
#
# Toda la config propia de cada app (nginx.conf, entrypoint.sh) sigue viviendo
# en `apps/<app>/`; este archivo sólo parametriza el nombre.

ARG NODE_VERSION=24
ARG APP

# ---------- Etapa de compilación ----------
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app
ENV NX_DAEMON=false

# Los manifiestos van primero para que `npm ci` sólo se re-ejecute cuando cambia
# el lockfile. El cache mount conserva los tarballs de npm entre builds.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# El resto del workspace. Cualquier cambio en `apps/` o `libs/` invalida esta
# capa y, con ella, la compilación: esa es la garantía de frescura.
COPY . .

# `--skip-nx-cache` evita que un `.nx/cache` persistente devuelva un `dist`
# por contenido; dentro de Docker la capa ya se descarta sola si cambió algo.
ARG APP
RUN npx nx build "${APP}" --configuration=production --skip-nx-cache

# ---------- Etapa de ejecución ----------
FROM nginx:alpine

# Instalamos openssl y generamos un certificado auto-firmado al vuelo
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/ssl \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=AR/ST=Mendoza/L=Mendoza/O=UM/OU=Tesoreria/CN=tesoreria.local"

# Build compilado en la etapa anterior + configuración propia de la app
ARG APP
COPY --from=build /app/dist/apps/${APP}/browser /usr/share/nginx/html
COPY --from=build /app/apps/${APP}/nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos y damos permisos al script de inicializacion de entorno
COPY --from=build /app/apps/${APP}/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80 443

# Configuramos el entrypoint para que ejecute nuestro script antes de nginx
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
