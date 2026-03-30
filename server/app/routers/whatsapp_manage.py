from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
import logging
from app.core.deps import get_current_admin
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/status", dependencies=[Depends(get_current_admin)])
async def get_whatsapp_status():
    """
    Checks the status of the WhatsApp bridge.
    """
    if not settings.WHATSAPP_BRIDGE_URL:
        raise HTTPException(status_code=503, detail="WhatsApp bridge URL not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{settings.WHATSAPP_BRIDGE_URL}/status", timeout=5.0)
            data = res.json()
            data["qrUrl"] = f"{settings.WHATSAPP_BRIDGE_URL}/qr"
            return data
    except Exception as e:
        logger.error(f"Error checking bridge status: {str(e)}")
        return {"isReady": False, "error": str(e)}

@router.post("/logout", dependencies=[Depends(get_current_admin)])
async def logout_whatsapp():
    """
    Triggers a soft restart of the WhatsApp bridge (clears session).
    """
    if not settings.WHATSAPP_BRIDGE_URL:
        raise HTTPException(status_code=503, detail="WhatsApp bridge URL not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            # We use a longer timeout for logout/restart
            response = await client.post(f"{settings.WHATSAPP_BRIDGE_URL}/logout", timeout=30.0)
            return response.json()
    except Exception as e:
        logger.error(f"Error logging out WhatsApp: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to bridge: {str(e)}")

@router.post("/test-send", dependencies=[Depends(get_current_admin)])
async def test_send_whatsapp(phone: str, message: str):
    """
    Manually send a test message to a specific number.
    """
    from app.services.whatsapp import send_whatsapp_sync
    success = send_whatsapp_sync(phone, message)
    if not success:
        raise HTTPException(status_code=500, detail="Could not trigger message. Check bridge URL.")
    return {"ok": True, "message": "Test message triggered in background"}

@router.post("/retroactive-notify", dependencies=[Depends(get_current_admin)])
async def trigger_retroactive_notifications(days: int = 4, db: Session = Depends(get_db)):
    """
    Triggers retroactive creation notifications for future PENDING appointments.
    """
    from app.services.appointment_service import send_retro_notifications
    count = send_retro_notifications(db, days_back=days)
    return {"ok": True, "notifications_sent": count}
