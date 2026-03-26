from fastapi import APIRouter, Depends, HTTPException
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
            response = await client.get(f"{settings.WHATSAPP_BRIDGE_URL}/status", timeout=5.0)
            return response.json()
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
