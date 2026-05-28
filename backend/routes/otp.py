"""OTP routes — send & verify phone OTP codes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.otp_helper import send_otp, verify_otp, mark_user_phone_verified

router = APIRouter()


class SendOtpInput(BaseModel):
    phone_number: str
    purpose: str = 'verification'


class VerifyOtpInput(BaseModel):
    phone_number: str
    code: str
    purpose: str = 'verification'


@router.post("/otp/send")
async def otp_send(input_data: SendOtpInput):
    """Send a fresh OTP via SMS to the given phone."""
    result = await send_otp(input_data.phone_number, input_data.purpose)
    if not result.get('success'):
        status = 429 if result.get('error') == 'RATE_LIMITED' else 400
        raise HTTPException(status_code=status, detail=result.get('message', 'Erreur lors de l\'envoi du code'))
    return result


@router.post("/otp/verify")
async def otp_verify(input_data: VerifyOtpInput):
    """Verify an OTP and flip phone_verified=True on the matching user."""
    result = await verify_otp(input_data.phone_number, input_data.code, input_data.purpose)
    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('message', 'Code invalide'))
    updated = await mark_user_phone_verified(input_data.phone_number)
    return {**result, "updated_users": updated}
