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
    url = f"{settings.WHATSAPP_BRIDGE_URL}/send"
    
    payload = {
        "to": clean_phone,
        "body": message
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"WhatsApp message sent to {clean_phone} via bridge")
            return True
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message via bridge: {str(e)}")
            return False

def send_whatsapp_sync(to_phone: str, message: str):
    """
    Sync version for local bridge
    """
    if not settings.WHATSAPP_BRIDGE_URL:
        return False

    clean_phone = to_phone.replace("+", "").replace(" ", "")
    url = f"{settings.WHATSAPP_BRIDGE_URL}/send"
    
    payload = {
        "to": clean_phone,
        "body": message
    }

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send WhatsApp (sync) via bridge: {str(e)}")
        return False
