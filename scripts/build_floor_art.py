"""Builds the wall linework drawn under each MEC E floor plan.

The building drawings only exist as raster images: floors 2 and 3 in the
Open House tour map PDF, floor 1 in assets/maps/source/mece-1-floor-plan.png. This script keeps
the dark, grey architectural lines (walls, doors, stairs), drops the coloured
annotations (numbered boxes, arrows, icons), tiny text and structural columns,
and saves the lines as a transparent PNG in the site's wall colour.

Each output lines up 1:1 with the plan units in src/data/floorPlans.json.

    python scripts/build_floor_art.py            # needs pymupdf, pillow, numpy, scipy
"""

from io import BytesIO
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
TOUR_PDF = ROOT / "assets/maps/MECE Tour Map.pdf"
OUT_DIR = ROOT / "assets/maps"
WALL_RGB = (47, 74, 58)

FLOORS = [
    {
        "out": "mece-1-walls.png",
        "source": ROOT / "assets/maps/source/mece-1-floor-plan.png",
        "crop": (0, 0, 990, 452),  # drops the title text along the bottom
        "scale": 2,
        "erase": [(755, 655, 895, 730)],  # the large "1-19" label
    },
    {
        "out": "mece-2-walls.png",
        "pdf_image": 50,
        "crop": (55, 147, 1853, 784),
        # Plan-unit boxes to erase: the 2025 stop squares, "You are here" and the elevator sign.
        "erase": [(390, 100, 460, 262), (634, 276, 701, 360), (1149, 353, 1233, 419),
                  (1187, 453, 1271, 520), (1294, 353, 1360, 437), (1350, 212, 1432, 358)],
    },
    {
        "out": "mece-3-walls.png",
        "pdf_image": 51,
        "crop": (190, 145, 1768, 772),
        "erase": [(135, 36, 192, 96), (339, 189, 395, 246), (361, 329, 417, 386), (420, 329, 476, 386),
                  (223, 379, 280, 438), (782, 393, 839, 452), (398, 483, 455, 541), (1100, 279, 1156, 338)],
    },
]


def load_pdf_image(xref: int) -> Image.Image:
    doc = pymupdf.open(TOUR_PDF)
    data = doc.extract_image(xref)["image"]
    return Image.open(BytesIO(data)).convert("RGB")


def wall_art(image: Image.Image, erase: list[tuple[int, int, int, int]], min_size: int = 24) -> Image.Image:
    rgb = np.asarray(image, dtype=np.float32)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    ink = (lum < 150) & (sat < 45)

    for x0, y0, x1, y1 in erase:
        ink[y0:y1, x0:x1] = False

    # Drop small specks (room numbers, "UP"/"DN" labels, column squares) and solid fills.
    labels, _ = ndimage.label(ink, structure=np.ones((3, 3)))
    for index, box in enumerate(ndimage.find_objects(labels), start=1):
        height = box[0].stop - box[0].start
        width = box[1].stop - box[1].start
        component = labels[box] == index
        is_fill = component.sum() > 1500 and component.sum() > 0.35 * height * width
        if max(height, width) < min_size or is_fill:
            ink[box][component] = False

    # Thicken the 1px drawing lines so they stay visible when the plan is zoomed out.
    alpha = np.clip((215 - lum) / 110, 0.35, 1) * 255 * ink
    alpha = ndimage.grey_dilation(alpha, size=(2, 2))
    out = np.zeros((*ink.shape, 4), dtype=np.uint8)
    out[..., :3] = WALL_RGB
    out[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main() -> None:
    for floor in FLOORS:
        source = Image.open(floor["source"]).convert("RGB") if "source" in floor else load_pdf_image(floor["pdf_image"])
        image = source.crop(floor["crop"])
        if floor.get("scale", 1) != 1:
            image = image.resize((image.width * floor["scale"], image.height * floor["scale"]), Image.LANCZOS)
        art = wall_art(image, floor["erase"])
        art.save(OUT_DIR / floor["out"], optimize=True)
        print(floor["out"], art.size)


if __name__ == "__main__":
    main()
