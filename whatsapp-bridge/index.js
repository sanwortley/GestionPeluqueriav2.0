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

let latestQR = null;
let isReady = false;

let client;

function createClient() {
    const newClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: './sessions'
        }),
        authTimeoutMs: 0, // No timeout for initial sync
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        },
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Known to help in limited resource environments
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || undefined
        }
    });

    // QR Code Generation
    newClient.on('qr', (qr) => {
        latestQR = qr;
        isReady = false;
        console.log('--- NUEVO QR GENERADO ---');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('También puedes verlo en /qr');
    });

    newClient.on('ready', () => {
        isReady = true;
        latestQR = null;
        console.log('✅ WhatsApp Bridge está listo y conectado!');
    });

    newClient.on('message_create', async (msg) => {
        const from = msg.from;
        const body = msg.body || "";
        logToFile(`[DETECCION] De: ${from} | Body: "${body}" | FromMe: ${msg.fromMe}`);

        if (msg.from === 'status@broadcast') return;

        if (body.trim() === '1' || body.trim() === '2') {
            logToFile(`🎯 COINCIDENCIA CON EL "1" o "2"`);
            try {
                const res = await axios.post(`${BACKEND_URL}/api/webhooks/ultramsg`, {
                    data: {
                        body: body.trim(),
                        from: msg.from
                    }
                });
                logToFile(`✅ Backend webhook response: ${JSON.stringify(res.data)}`);
            } catch (error) {
                logToFile(`❌ Error avisando al backend: ${error.message}`);
            }
        }
    });

    newClient.initialize();
    return newClient;
}

// Global client instance
client = createClient();

app.get('/status', (req, res) => {
    res.json({ isReady });
});

// API Endpoint to send messages from Python
app.post('/send', async (req, res) => {
    let { to, body } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'Missing "to" or "body"' });

    try {
        to = to.replace(/\D/g, '');
        if (to.length === 10) to = '549' + to;
        else if (to.length === 12 && to.startsWith('15')) to = '549' + to.substring(2);
        else if (to.startsWith('54') && to.length === 12 && to[2] !== '9') to = '549' + to.substring(2);
        else if (to.startsWith('5490')) to = '549' + to.substring(4);
        console.log(`[SEND] Solicitud recibida para: ${to}`);
        const chatId = `${to}@c.us`;

        console.log(`[SEND] Intentando enviar a ${chatId}...`);
        
        // Safety timeout for the send operation
        const sendPromise = client.sendMessage(chatId, body);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_INTERNO_WHATSAPP')), 25000)
        );

        const response = await Promise.race([sendPromise, timeoutPromise]);
        
        console.log(`[SEND] ✅ Mensaje enviado correctamente a ${chatId}`);
        res.json({ success: true, messageId: response.id?.id });
    } catch (error) {
        console.error(`[SEND] ❌ Error enviando mensaje a ${to}:`, error.message);
        res.status(500).json({ error: error.message });
    }
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
                <h1>✅ Ya estás conectado</h1>
                <p>No necesitas escanear nada.</p>
                <form action="/logout" method="POST">
                    <button type="submit" style="background:#ff4757; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">
                        Desconectar WhatsApp
                    </button>
                </form>
            </div>
        `);
    }
    if (!latestQR) return res.send('<h1>⏳ Generando QR...</h1><script>setTimeout(()=>location.reload(), 2000)</script>');

    try {
        const qrImage = await QRCode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1>Escanea este código</h1>
                <img src="${qrImage}" style="border: 10px solid white; box-shadow: 0 0 20px rgba(0,0,0,0.1);" />
                <form action="/logout" method="POST" style="margin-top:20px;">
                    <button type="submit" style="background:#ff4757; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">
                        Forzar Cierre de Sesión / Limpiar Todo
                    </button>
                </form>
                <script>
                    setInterval(async () => {
                        const r = await fetch('/status');
                        const d = await r.json();
                        if (d.isReady) window.location.reload();
                    }, 2000);
                </script>
            </div>
        `);
    } catch (err) { res.status(500).send('Error'); }
});

app.post('/logout', async (req, res) => {
    try {
        console.log('--- REINICIO SOFT SOLICITADO ---');
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1>🧼 Limpiando y Reiniciando...</h1>
                <p>Estamos borrando los archivos temporales para que puedas escanear de nuevo.</p>
                <p>No cierres esta pestaña, te avisaremos cuando esté listo.</p>
                <script>setTimeout(() => location.href='/qr', 5000);</script>
            </div>
        `);

        // Execute background cleanup
        try { await client.destroy(); } catch(e) {}
        
        isReady = false;
        latestQR = null;

        const sessionPath = path.join(__dirname, 'sessions');
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
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
