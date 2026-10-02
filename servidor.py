"""Servidor local del simulador (sin dependencias externas).

Uso:  python servidor.py            -> http://localhost:8000
      python servidor.py 8080       -> otro puerto

Desactiva la caché del navegador para que siempre se vean las últimas versiones
de las preguntas (data/*.json) y del código.
"""
import http.server
import socketserver
import sys
import webbrowser
from functools import partial
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PUERTO = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8000)


class SinCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".json": "application/json", ".css": "text/css"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, formato, *args):
        pass  # silencioso


def ip_local():
    """IP de esta PC en la red local (sin enviar datos: solo consulta la ruta de salida)."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
        except OSError:
            return "127.0.0.1"


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    en_red = "--red" in sys.argv  # accesible desde otros dispositivos de la misma red Wi-Fi
    with socketserver.ThreadingTCPServer(("0.0.0.0" if en_red else "127.0.0.1", PUERTO),
                                         partial(SinCache, directory=str(RAIZ))) as srv:
        url = f"http://localhost:{PUERTO}"
        print(f"Simulador disponible en {url}  (Ctrl+C para detener)")
        if en_red:
            print(f"Desde otro dispositivo en la misma red: http://{ip_local()}:{PUERTO}")
        if "--no-abrir" not in sys.argv:
            webbrowser.open(url)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
