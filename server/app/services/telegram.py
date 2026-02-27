import httpx
import logging
from typing import Optional
from app.core.config import settings
logger = logging.getLogger(__name__)

async def send_telegram_message(message: str):
    """
    Sends a message to the barber via Telegram Bot.
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram credentials not configured. Skipping admin notification.")
        return False

    # Minimal HTML escaping to avoid 400 Bad Request
    # Only escape characters that are NOT part of our intended <b>/<i> tags
    # Since we control the template, we'll escape the dynamic parts in the service layer 
    # OR just do it here carefully. 
    safe_message = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Restore our intended tags
    safe_message = safe_message.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    safe_message = safe_message.replace("&lt;i&gt;", "<i>").replace("&lt;/i&gt;", "</i>")
    
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": safe_message,
        "parse_mode": "HTML"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {str(e)}")
            return False

def send_telegram_sync(message: str):
    """
    Sync version of Telegram sender.
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram (sync): {str(e)}")
        return False
