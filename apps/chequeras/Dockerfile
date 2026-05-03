# Etapa 1: Construccion
FROM node:24-alpine AS build

WORKDIR /app

# Copiamos package info e instalamos dependencias
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiamos la configuracion del workspace
COPY nx.json ./
COPY tsconfig.base.json ./
COPY eslint.config.mjs ./

# Copiamos todo el código fuente del monorepo
COPY . .

# Construimos la aplicación de chequeras
RUN npx nx run chequeras:build:production

# Etapa 2: Nginx y ejecucion
FROM nginx:alpine

# Copiamos el build desde la etapa anterior
COPY --from=build /app/dist/apps/chequeras/browser /usr/share/nginx/html

# Copiamos la configuracion propia de Nginx (para el ruteo de SPA)
COPY apps/chequeras/nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos y damos permisos al script de inicializacion de entorno
COPY apps/chequeras/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

# Configuramos el entrypoint para que ejecute nuestro script antes de nginx
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
