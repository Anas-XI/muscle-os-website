import socket
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pathlib import Path

router = APIRouter()

HERE = Path(__file__).parent
INDEX_HTML = (HERE / "index.html").read_text(encoding="utf-8")
QRCODE_HTML = (HERE / "qrcode.html").read_text(encoding="utf-8")

@router.get("/")
async def index():
    return HTMLResponse(INDEX_HTML)

@router.get("/expo")
async def expo_qr():
    return HTMLResponse(QRCODE_HTML)

@router.get("/api/network-ip")
async def network_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return {"ip": ip}
    except Exception:
        return {"ip": "127.0.0.1"}
