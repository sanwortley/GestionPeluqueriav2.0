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

def send_whatsapp_sync(to_phone: str, message: str) -> tuple[bool, Optional[str]]:
    """
    Sync version for local bridge. 
    Returns (success, error_message)
    """
    bridge_url = settings.WHATSAPP_BRIDGE_URL
    if not bridge_url:
        return False, "WHATSAPP_BRIDGE_URL no configurada"

    clean_phone = to_phone.replace("+", "").replace(" ", "")
    base_url = bridge_url.rstrip("/")
    url = f"{base_url}/send"
    
    payload = {
        "to": clean_phone,
        "body": message
    }

    logger.info(f"📤 [WHATSAPP-SYNC] Enviando a {clean_phone} via {url}")
    
    try:
        # Usamos un timeout razonable para el bridge local
        with httpx.Client(timeout=35.0) as client:
            response = client.post(url, json=payload)
            
            if response.status_code == 200:
                logger.info(f"✅ [WHATSAPP-SYNC] Mensaje enviado a {clean_phone}")
                return True, None
            else:
                error_detail = response.text
                try:
                    # Intentar parsear el error si es JSON
                    error_json = response.json()
                    error_detail = error_json.get("error", response.text)
                except:
                    pass
                logger.error(f"❌ [WHATSAPP-SYNC] Error {response.status_code}: {error_detail}")
                return False, error_detail
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [WHATSAPP-SYNC] Error de conexión: {error_msg}")
        return False, error_msg
