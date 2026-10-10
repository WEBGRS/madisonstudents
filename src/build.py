# Build index.html from src/index.template.html and the projected lake outlines in src/lakes.json
import json
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent

lk = json.loads((SRC / "lakes.json").read_text(encoding="utf-8"))
(bx, by), (cx, cy) = lk["bascom"], lk["capitol"]
vals = {
    "MENDOTA": lk["Lake_Mendota"], "MONONA": lk["Lake_Monona"], "WINGRA": lk["Lake_Wingra"],
    "MEN_X": lk["mendota_label"][0], "MEN_Y": lk["mendota_label"][1],
    "MON_X": lk["monona_label"][0], "MON_Y": lk["monona_label"][1],
    "BAS_X": bx, "BAS_Y": by, "BAS_TX": bx, "BAS_TY": round(by + 26, 1),
    "PHONE_VB": f"{round(bx - 150)} 20 560 440", "CAP_X": cx, "CAP_Y": cy, "CAP_TX": round(cx + 14, 1), "CAP_TY": round(cy + 5, 1),
}
page = (SRC / "index.template.html").read_text(encoding="utf-8")
for k, v in vals.items():
    page = page.replace("{{" + k + "}}", str(v))
assert "{{" not in page, "unfilled placeholder"
(ROOT / "index.html").write_text(page, encoding="utf-8")
print("index.html", len(page.encode("utf-8")) // 1024, "KB")
