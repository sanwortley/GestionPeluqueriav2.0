FROM node:20-slim

# Instalar dependencias necesarias para Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    tini \
    libxss1 \
    tar \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Evitar descarga de Chromium y apuntar al Chrome instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN npm install

# Copiar el resto del código
COPY . .

# Crear carpeta de sesiones
RUN mkdir -p sessions

EXPOSE 3001

# tini como PID 1: recoge los procesos huérfanos de Chrome. Con node como PID 1 quedaban
# zombis en cada reinicio de Chrome hasta agotar el límite de procesos (spawn EAGAIN)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
