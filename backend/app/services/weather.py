"""
Weather service using the free Open-Meteo API (no API key required).
https://open-meteo.com/

WMO Weather interpretation codes (WW):
  0        Clear sky
  1,2,3    Mainly clear, partly cloudy, overcast
  45,48    Fog
  51-57    Drizzle (light/moderate/dense)
  61-67    Rain (slight/moderate/heavy)
  71-77    Snow
  80-82    Rain showers
  85,86    Snow showers
  95       Thunderstorm
  96,99    Thunderstorm with hail
"""

from datetime import date, timedelta
from typing import Any

import httpx

from app.logging_config import get_logger

logger = get_logger("weather")

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# WMO codes that indicate rain / bad weather for outdoor tennis
RAIN_CODES = {
    51, 53, 55,       # Drizzle
    56, 57,           # Freezing drizzle
    61, 63, 65,       # Rain
    66, 67,           # Freezing rain
    80, 81, 82,       # Rain showers
    95, 96, 99,       # Thunderstorm
}

ICON_MAP: dict[int, str] = {
    0: "☀️",
    1: "🌤️", 2: "⛅", 3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️",
    56: "🌧️", 57: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    66: "🌧️", 67: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "❄️", 77: "❄️",
    80: "🌦️", 81: "🌧️", 82: "⛈️",
    85: "🌨️", 86: "❄️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
}

DESCRIPTION_MAP: dict[int, str] = {
    0: "Helder",
    1: "Overwegend helder", 2: "Gedeeltelijk bewolkt", 3: "Bewolkt",
    45: "Mist", 48: "Rijpzwam mist",
    51: "Lichte motregen", 53: "Matige motregen", 55: "Dichte motregen",
    56: "Lichte ijzelregen", 57: "Dichte ijzelregen",
    61: "Lichte regen", 63: "Matige regen", 65: "Zware regen",
    66: "Lichte ijsregen", 67: "Zware ijsregen",
    71: "Lichte sneeuw", 73: "Matige sneeuw", 75: "Zware sneeuw", 77: "Ijskorrels",
    80: "Lichte buien", 81: "Matige buien", 82: "Zware buien",
    85: "Lichte sneeuwbuien", 86: "Zware sneeuwbuien",
    95: "Onweer", 96: "Onweer met hagel", 99: "Onweer met zware hagel",
}


def get_weather_icon(wmo_code: int) -> str:
    return ICON_MAP.get(wmo_code, "❓")


def get_weather_description(wmo_code: int) -> str:
    return DESCRIPTION_MAP.get(wmo_code, "Onbekend")


def is_rain_expected(wmo_code: int, precipitation_mm: float) -> bool:
    return wmo_code in RAIN_CODES or precipitation_mm >= 2.0


async def get_weather_for_dates(
    latitude: float,
    longitude: float,
    dates: list[date],
) -> dict[str, Any]:
    """
    Fetch daily weather forecast for a list of dates.

    Returns a dict keyed by ISO date string with weather info per day.
    If coordinates are outside forecast range (>16 days), returns empty dict for those dates.
    """
    if not dates:
        return {}

    today = date.today()
    future_dates = [d for d in dates if d >= today]
    if not future_dates:
        return {}

    start = min(future_dates)
    end = max(future_dates)

    # Open-Meteo only forecasts up to 16 days
    max_forecast_end = today + timedelta(days=16)
    if start > max_forecast_end:
        return {}
    end = min(end, max_forecast_end)

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "weathercode,precipitation_sum,temperature_2m_max,temperature_2m_min",
        "timezone": "Europe/Amsterdam",
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(OPEN_METEO_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.warning("weather_fetch_failed", error=str(e))
        return {}

    daily = data.get("daily", {})
    date_list = daily.get("time", [])
    wmo_codes = daily.get("weathercode", [])
    precip = daily.get("precipitation_sum", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])

    result: dict[str, Any] = {}
    for i, d_str in enumerate(date_list):
        wmo = int(wmo_codes[i]) if i < len(wmo_codes) and wmo_codes[i] is not None else 0
        prec = float(precip[i]) if i < len(precip) and precip[i] is not None else 0.0
        tmax = round(float(temp_max[i]), 1) if i < len(temp_max) and temp_max[i] is not None else None
        tmin = round(float(temp_min[i]), 1) if i < len(temp_min) and temp_min[i] is not None else None
        result[d_str] = {
            "wmo_code": wmo,
            "icon": get_weather_icon(wmo),
            "description": get_weather_description(wmo),
            "precipitation_mm": round(prec, 1),
            "temp_max": tmax,
            "temp_min": tmin,
            "regen_verwacht": is_rain_expected(wmo, prec),
        }

    return result
