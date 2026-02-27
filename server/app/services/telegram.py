import httpx
import logging
from typing import Optional
from app.core.config import settings
logger = logging.getLogger(__name__)

def _prepare_telegram_payload(message: str) -> dict:
    """
    Escapes HTML characters and prepares the payload for Telegram.
    """
    # Minimal HTML escaping to avoid 400 Bad Request
    # Only escape characters that are NOT part of our intended <b>/<i> tags
    safe_message = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Restore our intended tags
    safe_message = safe_message.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    safe_message = safe_message.replace("&lt;i&gt;", "<i>").replace("&lt;/i&gt;", "</i>")
    
    return {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": safe_message,
        "parse_mode": "HTML"
    }

async def send_telegram_message(message: str):
    """
    Sends a message to the barber via Telegram Bot. (Async)
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram credentials not configured.")
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = _prepare_telegram_payload(message)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {str(e)}")
            return False

def send_telegram_sync(message: str):
    """
    Sends a message to the barber via Telegram Bot. (Sync)
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = _prepare_telegram_payload(message)

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram (sync): {str(e)}")
        return False
