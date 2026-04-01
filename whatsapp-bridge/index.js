const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'bridge.log');
function logToFile(msg) {
    const time = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${time}] ${msg}\n`);
    console.log(msg);
}

const app = express();
app.use(bodyParser.json());

// CONFIGURATION
const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_WEBSITE_URL || 'http://127.0.0.1:8001'; // API to notify about incoming messages
logToFile(`📡 [CONFIG] Backend URL set to: ${BACKEND_URL}`);
let isReady = false;

let client;

// Function to clean up stale Chrome lock files that prevent startup in Railway/Docker
function cleanupLocks(dir) {
    if (!fs.existsSync(dir)) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (file === 'SingletonLock' || file === 'SingletonCookie') {
                console.log(`🧹 Eliminando archivo de bloqueo ${file} para permitir el inicio...`);
                try { fs.unlinkSync(fullPath); } catch(e) {}
            } else if (fs.lstatSync(fullPath).isDirectory()) {
                cleanupLocks(fullPath);
            }
        }
    } catch (err) {
        // Silently fail if we can't access a subfolder
    }
}

function createClient() {
    console.log('🚀 Inicializando nuevo cliente de WhatsApp...');
    
    // Clean locks in sessions volume before starting
    const sessionPath = path.join(__dirname, 'sessions');
    cleanupLocks(sessionPath);

    const newClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: sessionPath
        }),
        authTimeoutMs: 60000, 

        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--hide-scrollbars',
                '--disable-notifications',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-extensions',
                '--disable-sync',
                '--metrics-recording-only',
                '--js-flags="--max-old-space-size=512"' 
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined
        }
    });

    // QR Code Generation
    newClient.on('qr', (qr) => {
        latestQR = qr;
        isReady = false;
        logToFile('--- NUEVO QR GENERADO ---');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('También puedes verlo en /qr');
    });

    newClient.on('loading_screen', (percent, message) => {
        logToFile(`[CARGA] ${percent}% - ${message}`);
    });

    newClient.on('authenticated', () => {
        // Authenticated means the session is loaded, but not yet fully synchronized
        latestQR = null;
        logToFile('📡 Autenticación exitosa (Sesión cargada)');
    });

    newClient.on('auth_failure', (msg) => {
        logToFile(`❌ Error de Autenticación: ${msg}`);
        isReady = false;
    });

    newClient.on('ready', () => {
        isReady = true;
        latestQR = null;
        logToFile('✅ WhatsApp Bridge está listo y conectado!');
        logToFile(`📱 Info Sesión: ${JSON.stringify(newClient.info)}`);
    });

    newClient.on('message_create', async (msg) => {
        const from = msg.from;
        const body = (msg.body || "").trim();

        // 1. Ignore background broadcast status
        if (from === 'status@broadcast') return;
        
        // 2. Ignore ALL group messages for privacy
        if (from.endsWith('@g.us')) return;

        // 3. Only process and log if it's a potential appointment response (1 or 2)
        if (body === '1' || body === '2') {
            logToFile(`🎯 [RESPUESTA] Coincidencia con "${body}" desde ${from}`);
            try {
                const url = `${BACKEND_URL}/api/webhooks/ultramsg`;
                logToFile(`📤 Enviando webhook a: ${url}`);
                const res = await axios.post(url, {
                    data: {
                        body: body,
                        from: from
                    }
                });
                logToFile(`✅ Backend webhook response: ${JSON.stringify(res.data)}`);
            } catch (error) {
                logToFile(`❌ Error avisando al backend en ${BACKEND_URL}: ${error.message}`);
            }
        }
    });

    newClient.initialize();
    return newClient;
}

// Global client instance
client = createClient();

// Redundant route removed (moved logic to the detailed one below)

let messageQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    while (messageQueue.length > 0) {
        const item = messageQueue[0];
        const { to, body, res } = item;

        try {
            console.log(`[QUEUE] Procesando (${messageQueue.length} pendientes): ${to}`);
            // Resolviendo JID adecuado (maneja migración LID y números no registrados)
            console.log(`[QUEUE] Resolviendo JID para ${to}...`);
            const numberDetails = await client.getNumberId(to);
            
            if (!numberDetails) {
                throw new Error(`EL NÚMERO ${to} NO ESTÁ REGISTRADO EN WHATSAPP`);
            }

            const chatId = numberDetails._serialized;
            console.log(`[QUEUE] JID Resuelta: ${chatId}. Enviando mensaje...`);

            // Safety timeout for the send operation
            const sendPromise = client.sendMessage(chatId, body);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TIMEOUT_INTERN_WA')), 25000)
            );

            const response = await Promise.race([sendPromise, timeoutPromise]);
            
            console.log(`[SEND] ✅ Mensaje enviado a ${chatId}`);
            if (!res.headersSent) {
                res.json({ success: true, messageId: response.id?.id });
            }
        } catch (error) {
            console.error(`[SEND] ❌ Error a ${to}:`, error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }

        messageQueue.shift();
        // Breve pausa para no saturar
        await new Promise(r => setTimeout(r, 500));
    }

    isProcessing = false;
}

// API Endpoint to send messages from Python
app.post('/send', async (req, res) => {
    let { to, body } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'Missing "to" or "body"' });

    if (!isReady) {
        console.warn(`[SEND] ❌ Intento denegado: Puente no listo.`);
        return res.status(503).json({ error: 'WhatsApp bridge is not ready.' });
    }

    to = to.replace(/\D/g, '');
    if (to.length === 10) to = '549' + to;
    else if (to.length === 12 && to.startsWith('15')) to = '549' + to.substring(2);
    else if (to.startsWith('54') && to.length === 12 && (to[2] !== '9')) to = '549' + to.substring(2);
    else if (to.startsWith('5490')) to = '549' + to.substring(4);

    // Añadir a la cola y disparar proceso
    messageQueue.push({ to, body, res, timestamp: new Date() });
    console.log(`[QUEUE] Nuevo mensaje para ${to}. Total en cola: ${messageQueue.length}`);
    processQueue();
});

app.get('/status', (req, res) => {
    const sInfo = isReady && client?.info ? {
        pushname: client.info.pushname || 'Usuario',
        wid: client.info.wid?.user || 'N/A',
        platform: client.info.platform || 'WhatsApp'
    } : null;

    res.json({
        isReady: isReady,
        hasQR: !!latestQR,
        sessionInfo: sInfo,
        queueLength: messageQueue.length,
        pendingMessages: messageQueue.map(m => ({ 
            to: m.to, 
            timestamp: m.timestamp,
            bodyPreview: m.body.substring(0, 20) + "..."
        }))
    });
});

// Routes
app.get('/', (req, res) => {
    if (isReady) res.send('<h1>✅ WhatsApp Bridge está ONLINE</h1><p>Conectado y listo.</p>');
    else if (latestQR) res.send('<h1>⚠️ Esperando conexión</h1><p>Escanea el QR en <a href="/qr">/qr</a></p>');
    else res.send('<h1>⏳ Iniciando...</h1><p>El sistema se está levantando.</p>');
});

app.get('/qr', async (req, res) => {
    if (isReady) {
        return res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
                <h1>WhatsApp Vinculado Exitosamente</h1>
                <p style="color: #666; font-size: 1.2rem;">El servicio ya está funcionando en Roma Cabello.</p>
                <p style="color: #999;">Por seguridad, la desconexión solo se puede realizar desde el Panel de Administración.</p>
                <div style="margin-top: 30px; padding: 15px; background: #f0f9f1; color: #2e7d32; border-radius: 8px; display: inline-block;">
                    Status: <strong>Activo y Protegido</strong>
                </div>
            </div>
        `);
    }
    if (!latestQR) return res.send('<div style="text-align:center; font-family:sans-serif; padding:50px;"><h1>⏳ Generando QR...</h1><p>Espera un momento.</p></div><script>setTimeout(()=>location.reload(), 2000)</script>');

    try {
        const qrImage = await QRCode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1>Vinculá el WhatsApp del Salón</h1>
                <p>Escanea este código con el celular que enviará los mensajes.</p>
                <div style="background: white; padding: 20px; display: inline-block; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <img src="${qrImage}" style="display: block;" />
                </div>
                <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
                    ⚠️ Una vez vinculado, esta página se bloqueará automáticamente por seguridad.
                </p>
                <script>
                    setInterval(async () => {
                        try {
                            const r = await fetch('/status');
                            const d = await r.json();
                            if (d.isReady) window.location.reload();
                        } catch(e) {}
                    }, 3000);
                </script>
            </div>
        `);
    } catch (err) { res.status(500).send('Error'); }
});

app.post('/logout', async (req, res) => {
    try {
        console.log('--- REINICIO SOFT SOLICITADO ---');
        
        // Return JSON success immediately so the backend can finish
        res.json({ success: true, message: 'Reinicio iniciado' });

        // Execute background cleanup
        try { await client.destroy(); } catch(e) {}
        
        isReady = false;
        latestQR = null;

        const sessionPath = path.join(__dirname, 'sessions');
        if (fs.existsSync(sessionPath)) {
            try {
                const files = fs.readdirSync(sessionPath);
                for (const file of files) {
                    fs.rmSync(path.join(sessionPath, file), { recursive: true, force: true });
                }
                console.log('✅ Carpeta de sesiones vaciada (manteniendo mount point)');
            } catch (err) {
                console.error('❌ Error parcial vaciando sesiones:', err.message);
            }
        }

        // Recreate the client in the same process
        client = createClient();

    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bridge OK en puerto ${PORT}`);
});
