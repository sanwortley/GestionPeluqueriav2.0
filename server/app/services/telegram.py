import httpx
import logging
from typing import Optional
from app.core.config import settings
logger = logging.getLogger(__name__)

def _prepare_telegram_payload(message: str) -> dict:
    """
    Escapes HTML characters and prepares the payload for Telegram.
    """
    # Escaping for HTML mode: & -> &amp;, < -> &lt;, > -> &gt;
    # But we want to allow <b> and <i>
    safe_message = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe_message = safe_message.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    safe_message = safe_message.replace("&lt;i&gt;", "<i>").replace("&lt;/i&gt;", "</i>")
    
    chat_id = settings.TELEGRAM_CHAT_ID
    # Try to convert to int if it looks like a number
    try:
        if chat_id and str(chat_id).isdigit():
            chat_id = int(chat_id)
    except:
        pass

    return {
        "chat_id": chat_id,
        "text": safe_message,
        "parse_mode": "HTML"
    }

async def send_telegram_message(message: str):
    """
    Sends a message via Telegram Bot. (Async)
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.error("❌ [TELEGRAM] Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en la configuración.")
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = _prepare_telegram_payload(message)
    
    masked_token = settings.TELEGRAM_BOT_TOKEN[:8] + "..." if settings.TELEGRAM_BOT_TOKEN else "None"
    logger.info(f"📤 [TELEGRAM] Intentando enviar mensaje a chat {payload.get('chat_id')} via bot {masked_token}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            if response.status_code != 200:
                logger.error(f"Telegram API Error ({response.status_code}): {response.text}")
                return False
            logger.info("Telegram message sent successfully (async)")
            return True
    except Exception as e:
        logger.error(f"Exception sending Telegram message: {str(e)}")
        return False

import threading

def _send_telegram_thread(url: str, payload: dict):
    try:
        with httpx.Client() as client:
            response = client.post(url, json=payload, timeout=10.0)
            if response.status_code != 200:
                logger.error(f"❌ [TELEGRAM] Error API ({response.status_code}): {response.text}")
            else:
                logger.info("✅ [TELEGRAM] Mensaje enviado correctamente (hilo sync)")
    except Exception as e:
        logger.error(f"❌ [TELEGRAM] Excepción en envío sync: {str(e)}")

def send_telegram_sync(message: str):
    """
    Sends a message via Telegram Bot. (Sync non-blocking)
    """
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.error("Missing sync TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = _prepare_telegram_payload(message)

    threading.Thread(target=_send_telegram_thread, args=(url, payload)).start()
    return True
