"""Draw the extension icon (three board columns, the first highlighted) as PNGs.

Usage: python3 scripts/make_icons.py icons [store/src]
The optional second folder gets icon-art.png, an unpadded 256px version for store art.
"""
import struct
import sys
import zlib
from pathlib import Path

OUT = Path(sys.argv[1])
SS = 4  # supersampling factor

BG = (49, 42, 99)        # deep indigo
ACCENT = (252, 161, 48)  # orange: the Backlog column, moved to the front
MUTED = (137, 128, 196)  # soft violet: the other columns
CARD = (255, 255, 255)


def in_round_rect(x, y, x0, y0, x1, y1, r):
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


# Shapes in a 0..1 unit square, painted in order: (x0, y0, x1, y1, radius, color)
SHAPES = [
    (0.00, 0.00, 1.00, 1.00, 0.22, BG),
    (0.14, 0.18, 0.36, 0.82, 0.06, ACCENT),
    (0.40, 0.18, 0.62, 0.66, 0.06, MUTED),
    (0.66, 0.18, 0.88, 0.50, 0.06, MUTED),
    # cards in the highlighted column (dropped on tiny sizes)
    (0.175, 0.24, 0.325, 0.36, 0.025, CARD),
    (0.175, 0.40, 0.325, 0.52, 0.025, CARD),
]


def render(size, pad=0):
    """`pad` is transparent space per side, in pixels (Chrome asks 16 of 128)."""
    shapes = SHAPES if size >= 32 else SHAPES[:4]
    art = size - 2 * pad
    rows = []
    for py in range(size):
        row = bytearray([0])  # PNG filter type: none
        for px in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    x = ((px * SS + sx + 0.5) / SS - pad) / art
                    y = ((py * SS + sy + 0.5) / SS - pad) / art
                    color = None
                    for x0, y0, x1, y1, r, c in shapes:
                        if in_round_rect(x, y, x0, y0, x1, y1, r):
                            color = c
                    if color:
                        for i in range(3):
                            acc[i] += color[i]
                        acc[3] += 1
            covered = acc[3]
            if covered:
                row += bytes(round(acc[i] / covered) for i in range(3))
                row.append(round(255 * covered / (SS * SS)))
            else:
                row += b"\0\0\0\0"
        rows.append(bytes(row))
    return png(size, b"".join(rows))


def png(size, raw):
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


OUT.mkdir(parents=True, exist_ok=True)
for s in (16, 32, 48):
    (OUT / f"icon{s}.png").write_bytes(render(s))
# Chrome's icon guidelines: 96x96 artwork with 16px of transparent padding.
(OUT / "icon128.png").write_bytes(render(128, pad=16))
if len(sys.argv) > 2:
    (Path(sys.argv[2]) / "icon-art.png").write_bytes(render(256))
print("done")
