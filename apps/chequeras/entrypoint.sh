#!/bin/sh

ROOT_DIR=/usr/share/nginx/html

echo "--- App Entrypoint Script Start ---"
echo "Received BACKEND_URL: [${BACKEND_URL}]"
echo "-------------------------------------"

if [ -z "$BACKEND_URL" ]; then
    echo "Warning: BACKEND_URL environment variable is not set."
else
    echo "Searching for files to process in $ROOT_DIR..."
    for file in $ROOT_DIR/*.js;
    do
      if [ -f "$file" ]; then
        echo "Processing file: $file";
        
        grep -q "BACKEND_URL_PLACEHOLDER" "$file"
        if [ $? -eq 0 ]; then
            echo "   ... BACKEND_URL_PLACEHOLDER found. Replacing with ${BACKEND_URL}."
            sed -i 's#BACKEND_URL_PLACEHOLDER#'"$BACKEND_URL"'#g' "$file"
        else
            echo "   ... BACKEND_URL_PLACEHOLDER not found in this file."
        fi
      fi
    done
fi

echo "-----------------------------------"
echo "--- App Entrypoint Script End ---"
echo ""

echo "Starting Nginx..."
exec "$@"
