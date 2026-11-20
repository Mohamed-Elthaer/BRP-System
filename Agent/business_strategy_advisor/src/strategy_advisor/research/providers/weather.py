"""Optional weather provider using Open-Meteo (no API key required)."""

from __future__ import annotations

import json
import urllib.request
from typing import Any, Dict, Optional

from ...core.logging import get_logger

logger = get_logger("research.weather")


class WeatherProvider:
    name = "weather"

    def is_configured(self) -> bool:
        return True

    async def current(self, latitude: float, longitude: float) -> Dict[str, Any]:
        try:
            url = (f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}"
                   f"&current=temperature_2m,weather_code,wind_speed_10m")
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            return data.get("current", {})
        except Exception as exc:
            logger.warning("weather fetch failed: %s", exc)
            return {}