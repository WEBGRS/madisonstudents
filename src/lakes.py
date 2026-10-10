# Project the OpenStreetMap lake outlines (src/data, from Nominatim) into SVG paths for the hero map
import json, math, sys
from pathlib import Path

S = Path(__file__).parent / "data"
LON0, LON1 = -89.495, -89.345
LATC = 43.078
W = 1200
K = W / ((LON1 - LON0) * math.cos(math.radians(LATC)))
H = 460
LAT1 = LATC + (H / 2) / K  # top edge


def xy(lon, lat):
    return ((lon - LON0) * math.cos(math.radians(LATC)) * K, (LAT1 - lat) * K)


def ring_path(ring):
    pts = [xy(lon, lat) for lon, lat in ring]
    return "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"


out = {"w": W, "h": H}
for name in ["Lake_Mendota", "Lake_Monona", "Lake_Wingra"]:
    g = json.loads((S / f"{name}.json").read_text(encoding="utf-8"))[0]["geojson"]
    rings = g["coordinates"] if g["type"] == "Polygon" else [r for p in g["coordinates"] for r in p]
    out[name] = "".join(ring_path(r) for r in rings)
for label, (lat, lon) in {"capitol": (43.0747, -89.3841), "bascom": (43.0753, -89.4041),
                          "mendota_label": (43.094, -89.452), "monona_label": (43.060, -89.380)}.items():
    x, y = xy(lon, lat)
    out[label] = [round(x, 1), round(y, 1)]
(Path(__file__).parent / "lakes.json").write_text(json.dumps(out), encoding="utf-8")
print({k: (len(v) if isinstance(v, str) else v) for k, v in out.items()})
