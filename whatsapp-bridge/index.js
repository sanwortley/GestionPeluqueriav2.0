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
const BACKEND_URL = process.env.BACKEND_WEBSITE_URL || 'http://127.0.0.1:8000'; // API to notify about incoming messages

let latestQR = null;
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: process.env.CHROME_PATH || undefined
    }
});

// QR Code Generation
client.on('qr', (qr) => {
    latestQR = qr;
    isReady = false;
    console.log('--- NUEVO QR GENERADO ---');
    qrcodeTerminal.generate(qr, { small: true });
    console.log('También puedes verlo en: http://localhost:' + PORT + '/qr');
});

client.on('ready', () => {
    isReady = true;
    latestQR = null;
    console.log('✅ WhatsApp Bridge está listo y conectado!');
});

client.on('message_create', async (msg) => {
    // CAPTURAR TODO PARA DEBUG
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

// API Endpoint to send messages from Python
app.post('/send', async (req, res) => {
    let { to, body } = req.body;

    if (!to || !body) {
        return res.status(400).json({ error: 'Missing "to" or "body"' });
    }

    try {
        // Cleaning all non-numeric characters
        to = to.replace(/\D/g, '');

        // ARGENTINA NORMALIZATION (54)
        // If the number is local (10 digits, e.g. 3517552167), add 549
        if (to.length === 10) {
            to = '549' + to;
        }
        // If it has '15' (common in Argentina) e.g. 153517552167 (12 digits)
        else if (to.length === 12 && to.startsWith('15')) {
            to = '549' + to.substring(2);
        }
        // If it starts with 54 but is missing the 9 (54351... 12 digits)
        else if (to.startsWith('54') && to.length === 12 && to[2] !== '9') {
            to = '549' + to.substring(2);
        }
        // If it starts with 549 but the next digit is 0 (wrong format 5490351...)
        else if (to.startsWith('5490')) {
            to = '549' + to.substring(4);
        }

        console.log(`Normalizado para WhatsApp: ${to}`);

        const chatId = `${to}@c.us`;

        const numberId = await client.getNumberId(to);

        if (!numberId) {
            console.error(`El número ${to} no está registrado en WhatsApp.`);
            return res.status(400).json({ error: 'Number not registered' });
        }

        console.log(`Enviando a ID oficial: ${numberId._serialized}`);
        console.log(`Contenido: "${body.substring(0, 30)}..."`);

        const response = await client.sendMessage(numberId._serialized, body);

        if (response.id && response.id.fromMe) {
            console.log(`✅ Mensaje entregado a la cola de salida de WhatsApp (ID: ${response.id.id})`);
            res.json({ success: true, messageId: response.id.id });
        } else {
            console.log(`⚠️ WhatsApp no devolvió confirmación de envío, pero no dio error.`);
            res.json({ success: true });
        }
    } catch (error) {
        console.error('Error detallado mandando mensaje:', error);
        res.status(500).json({ error: error.message });
    }
});

// Status Endpoint
app.get('/', (req, res) => {
    if (isReady) {
        res.send('<h1>✅ WhatsApp Bridge está ONLINE</h1><p>Conectado y listo para procesar mensajes.</p>');
    } else if (latestQR) {
        res.send('<h1>⚠️ Esperando conexión</h1><p>Por favor escanea el código QR en <a href="/qr">/qr</a></p>');
    } else {
        res.send('<h1>⏳ Iniciando...</h1><p>El sistema se está levantando, espera unos segundos.</p>');
    }
});

// View QR Endpoint (Crucial for remote servers like Render)
app.get('/qr', async (req, res) => {
    if (isReady) {
        return res.send('<h1>✅ Ya estás conectado</h1><p>No necesitas escanear nada.</p>');
    }
    if (!latestQR) {
        return res.send('<h1>⏳ Generando QR...</h1><p>Vuelve a cargar esta página en unos segundos.</p>');
    }

    try {
        const qrImage = await QRCode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1>Escanea este código con tu WhatsApp</h1>
                <img src="${qrImage}" style="border: 10px solid white; box-shadow: 0 0 20px rgba(0,0,0,0.1);" />
                <p>El código se actualiza automáticamente si expira.</p>
                <script>setTimeout(() => location.reload(), 30000);</script>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Error generando imagen QR');
    }
});

client.initialize();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Puerto de control del Bridge abierto en: http://0.0.0.0:${PORT}`);
});
