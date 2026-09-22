#!/bin/sh

ROOT_DIR=/usr/share/nginx/html

echo "--- App Entrypoint Script Start ---"
echo "Received BACKEND_URL: [${BACKEND_URL}]"
echo "Received ENV_NAME: [${ENV_NAME}]"
echo "Received APP_VERSION: [${APP_VERSION}]"
echo "-------------------------------------"

replace_placeholder() {
  placeholder="$1"
  value="$2"
  for file in "$ROOT_DIR"/*.js;
  do
    if [ -f "$file" ] && grep -q "$placeholder" "$file"; then
      echo "   ... $placeholder found in $(basename "$file"). Replacing with ${value}."
      sed -i "s#$placeholder#${value}#g" "$file"
    fi
  done
}

if [ -z "$BACKEND_URL" ]; then
  echo "Warning: BACKEND_URL environment variable is not set."
else
  replace_placeholder "BACKEND_URL_PLACEHOLDER" "$BACKEND_URL"
fi

# El entorno y la version se inyectan siempre: sin variable queda un valor
# por defecto que la UI muestra como "SIN DEFINIR" (rojo) para evidenciarlo.
replace_placeholder "ENV_NAME_PLACEHOLDER" "${ENV_NAME:-desconocido}"
replace_placeholder "APP_VERSION_PLACEHOLDER" "${APP_VERSION:-sin-version}"

echo "-----------------------------------"
echo "--- App Entrypoint Script End ---"
echo ""

echo "Starting Nginx..."
exec "$@"
