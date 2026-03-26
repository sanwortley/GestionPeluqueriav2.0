FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Instalar dependencias necesarias para whatsapp-web.js
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Evitar descarga de Chromium y apuntar al que ya trae la imagen
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Asegurar permisos para la carpeta de sesiones
RUN mkdir -p sessions && chown -R pptruser:pptruser sessions

USER pptruser

EXPOSE 3001

CMD ["node", "index.js"]
