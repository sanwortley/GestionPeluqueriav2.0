import httpx
import logging
from typing import Optional
from app.core.config import settings
logger = logging.getLogger(__name__)

async def send_whatsapp_message(to_phone: str, message: str):
    """
    Sends a WhatsApp message using Local Bridge.
    """
    if not settings.WHATSAPP_BRIDGE_URL:
        logger.warning("WhatsApp bridge URL not configured. Skipping notification.")
        return False

    clean_phone = to_phone.replace("+", "").replace(" ", "")
    base_url = settings.WHATSAPP_BRIDGE_URL.rstrip("/")
    url = f"{base_url}/send"
    
    logger.info(f"📤 [WHATSAPP] Intentando enviar mensaje a {clean_phone} via {url}")
    
    payload = {
        "to": clean_phone,
        "body": message
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code == 200:
                logger.info(f"✅ [WHATSAPP] Mensaje enviado correctamente a {clean_phone}")
                return True
            else:
                logger.error(f"❌ [WHATSAPP] El bridge respondió con error {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ [WHATSAPP] Error de conexión al bridge en {url}: {str(e)}")
            return False

import threading

def _send_whatsapp_thread(url: str, payload: dict):
    """
    Worker for the background thread to avoid blocking the main API response
    """
    try:
        clean_msg = payload.get("body", "")[:30].replace("\n", " ") + "..."
        to_phone = payload.get("to")
        logger.info(f"🚀 [THREAD-WHATSAPP] Iniciando envío a {to_phone}: {clean_msg}")
        
        # Usar un cliente síncrono explícito para asegurar cierre de recursos
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            
            if response.status_code == 200:
                logger.info(f"✅ [THREAD-WHATSAPP] Mensaje enviado a {to_phone}")
            else:
                logger.error(f"❌ [THREAD-WHATSAPP] El bridge respondió con error {response.status_code} para {to_phone}: {response.text}")
    except Exception as e:
        logger.error(f"❌ [THREAD-WHATSAPP] Error de conexión al bridge {url}: {str(e)}")

def send_whatsapp_sync(to_phone: str, message: str):
    """
    Sync version for local bridge (non-blocking)
    """
    bridge_url = settings.WHATSAPP_BRIDGE_URL
    if not bridge_url:
        logger.error("❌ ERROR: WHATSAPP_BRIDGE_URL no está configurada. Mensaje no enviado.")
        return False

    clean_phone = to_phone.replace("+", "").replace(" ", "")
    # Asegurar que la URL sea base + /send
    base_url = bridge_url.rstrip("/")
    url = f"{base_url}/send"
    
    payload = {
        "to": clean_phone,
        "body": message
    }

    logger.info(f"📤 [WHATSAPP-SYNC] Iniciando hilo para {clean_phone} via {url}")
    threading.Thread(target=_send_whatsapp_thread, args=(url, payload)).start()
    return True
