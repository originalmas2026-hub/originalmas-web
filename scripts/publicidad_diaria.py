#!/usr/bin/env python3
"""Publica una pieza de publicidad distinta de OriginalMas en Telegram."""
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import os
import urllib.parse
import urllib.request

TZ = ZoneInfo("Europe/Madrid")
now = datetime.now(TZ)

# GitHub Actions ejecuta el workflow en dos horas UTC para cubrir el cambio
# horario. Solo se publica cuando son las 18:00 en la zona peninsular.
# FORCE_SEND=1 permite una prueba manual desde GitHub Actions fuera de esa hora.
force_send = os.environ.get("FORCE_SEND", "0") == "1"
if now.hour != 18 and not force_send:
    print(f"No toca publicar: hora local {now:%H:%M} (Europe/Madrid).")
    raise SystemExit(0)

ADS = [
"""🔥 <b>¿AÚN NO HAS PROBADO ORIGINALMAS?</b> 🔥

📺 En OriginalMas tienes distintas opciones para disfrutar del entretenimiento:

⚽ <b>OriginalMas + VOD</b>: deporte y contenido bajo demanda.
📡 <b>OriginalMas+</b>: todos los canales y una experiencia estable.
🎬 <b>Emby</b>: películas y series para tus maratones.

💬 ¿Quieres información o solicitar una prueba?
Telegram: @OriginalMas
WhatsApp: +34 614 062 846

<b>ORIGINALMAS — entretenimiento a tu manera.</b>""",
"""⚽ <b>¡Que no se te escape el próximo partido!</b>

Si buscas una opción para seguir el deporte, descubre <b>OriginalMas + VOD</b>.

Y si hoy te apetece cambiar de plan:
📡 OriginalMas+ para disfrutar de los canales.
🎬 Emby para tus sesiones de películas y series.

📩 Pide información en @OriginalMas
WhatsApp: +34 614 062 846

<b>Conoce OriginalMas.</b>""",
"""🎬 <b>¿TE APETECE UNA BUENA PELÍCULA O UNA SERIE PARA MARATONEAR?</b>

Con <b>Emby de OriginalMas</b> tienes una opción pensada para disfrutar de películas y series cuando te apetezca.

🍿 Prepara tu próxima sesión, elige qué quieres ver y disfruta del entretenimiento a tu ritmo.

📩 ¿Quieres información o solicitar una prueba?
Telegram: @OriginalMas
WhatsApp: +34 614 062 846

<b>EMBY — tus próximas historias te esperan.</b>""",
"""📺 <b>¿Qué tipo de entretenimiento buscas?</b>

⚽ Deporte y contenido VOD: <b>OriginalMas + VOD</b>.
📡 Canales: <b>OriginalMas+</b>.
🎬 Películas y series: <b>Emby</b>.

Tres opciones para distintos gustos.
¿Quieres conocerlas o solicitar una prueba?

✈️ @OriginalMas
📱 +34 614 062 846

<b>¡Hablamos!</b>""",
"""💎 <b>En OriginalMas queremos que encuentres tu opción</b>

Tanto si disfrutas del deporte como si prefieres dedicar la tarde a una buena serie o película, tenemos diferentes servicios:

⚽ OriginalMas + VOD
📡 OriginalMas+
🎬 Emby

📩 Consulta sin compromiso:
@OriginalMas | WhatsApp +34 614 062 846

<b>Descubre OriginalMas.</b>""",
"""🔥 <b>¿Todavía estás pensando qué ver?</b>

Hay días de deporte, días de series y días de película.

⚽ Para deporte y VOD: OriginalMas + VOD.
📡 Para canales: OriginalMas+.
🎬 Para tus maratones: Emby.

Pídenos información y descubre las opciones disponibles.

Telegram: @OriginalMas
WhatsApp: +34 614 062 846

<b>ORIGINALMAS</b>""",
"""📣 <b>¡Conoce los servicios de OriginalMas!</b>

No todos buscamos lo mismo:
⚽ OriginalMas + VOD
📡 OriginalMas+
🎬 Emby

Cuéntanos qué tipo de contenido te interesa y te orientamos sobre el servicio adecuado.

✈️ Telegram: @OriginalMas
📱 WhatsApp: +34 614 062 846

<b>Estamos para ayudarte.</b>""",
"""🎬 <b>¿Plan de series y películas?</b>

Para quienes disfrutan de las buenas historias y las sesiones interminables, descubre <b>Emby</b>.

Y si buscas otras opciones de entretenimiento, pregunta también por OriginalMas + VOD y OriginalMas+.

📩 Más información:
@OriginalMas
+34 614 062 846

<b>Tu próximo plan puede empezar aquí.</b>""",
"""⚽ <b>El deporte se disfruta más cuando tienes ganas de verlo</b>

Descubre <b>OriginalMas + VOD</b> y consulta las opciones de entretenimiento de OriginalMas.

También puedes informarte sobre:
📡 OriginalMas+
🎬 Emby

📩 Contacto directo: @OriginalMas
WhatsApp: +34 614 062 846

<b>Pregunta por nuestros servicios.</b>""",
"""✨ <b>Un servicio para cada forma de disfrutar</b>

📺 OriginalMas + VOD
📡 OriginalMas+
🎥 Emby

Si todavía no conoces nuestros servicios, escríbenos. Te explicamos las opciones y cómo solicitar una prueba.

✈️ @OriginalMas
📱 WhatsApp: +34 614 062 846

<b>ORIGINALMAS — descubre tu opción.</b>"""
]

# Rotación diaria estable: no repite el mismo anuncio en días consecutivos.
day_number = now.date().toordinal()
message = ADS[day_number % len(ADS)]

token = os.environ["TELEGRAM_BOT_TOKEN"]
chat_id = os.environ.get("TELEGRAM_CHAT_ID", "@Info_OriginalMas")
thread_id = os.environ.get("TELEGRAM_MESSAGE_THREAD_ID", "113")

payload = {
    "chat_id": chat_id,
    "text": message,
    "parse_mode": "HTML",
    "disable_web_page_preview": True,
}
if thread_id:
    payload["message_thread_id"] = int(thread_id)

url = f"https://api.telegram.org/bot{token}/sendMessage"
data = urllib.parse.urlencode(payload).encode("utf-8")
request = urllib.request.Request(url, data=data, method="POST")
with urllib.request.urlopen(request, timeout=30) as response:
    result = json.loads(response.read().decode("utf-8"))

if not result.get("ok"):
    raise RuntimeError(f"Telegram rechazó el mensaje: {result}")
print(f"Publicidad publicada correctamente en {chat_id}, tema {thread_id}.")
