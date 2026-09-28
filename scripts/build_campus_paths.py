"""Builds src/data/campusPaths.json, the walking network used for campus directions.

Downloads footpaths, sidewalks, steps, pedways and streets around North Campus
from OpenStreetMap (via Overpass), then keeps only the junctions and the
connected walkable network so the app can route offline.

Usage:  python scripts/build_campus_paths.py
Data (c) OpenStreetMap contributors, ODbL.
"""

import json
import math
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

# South, west, north, east: Butterdome to the river, 118 St to HUB.
BBOX = (53.5175, -113.5370, 53.5325, -113.5165)
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]
WALKABLE = "footway|path|pedestrian|steps|corridor|living_street|residential|service|unclassified|tertiary|secondary|primary|track|cycleway"
ROADS = {"living_street", "residential", "service", "unclassified", "tertiary", "secondary", "primary", "track"}
KINDS = ["path", "road", "steps", "pedway", "crossing"]
# Sidewalks and crossings take the name of a named street within this distance (m).
SIDEWALK_RADIUS = 25
CROSSING_RADIUS = 15
# Coordinates are stored as integer micro-degrees relative to the box corner.
SCALE = 1_000_000
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "campusPaths.json")


def fetch():
    south, west, north, east = BBOX
    query = (
        f'[out:json][timeout:60];(way["highway"~"^({WALKABLE})$"]'
        f"({south},{west},{north},{east}););out body;>;out skel qt;"
    )
    body = urllib.parse.urlencode({"data": query}).encode()
    for url in MIRRORS:
        try:
            request = urllib.request.Request(url, body, {"User-Agent": "MECE-OpenHouse-2026 (student project)"})
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.load(response)
        except Exception as error:  # try the next mirror
            print(f"{url} failed: {error}", file=sys.stderr)
    sys.exit("All Overpass mirrors failed; try again later.")


def is_walkable(tags):
    foot = tags.get("foot")
    if foot == "no":
        return False
    if tags.get("access") in ("no", "private") and foot not in ("yes", "designated", "permissive"):
        return False
    return True


def kind_of(tags):
    highway = tags.get("highway")
    if highway == "steps":
        return "steps"
    if tags.get("footway") == "crossing":
        return "crossing"
    if tags.get("name") == "Pedway" or highway == "corridor" or tags.get("tunnel") in ("yes", "building_passage", "covered") or (
        tags.get("bridge") and highway in ("footway", "path", "pedestrian")
    ):
        return "pedway"
    return "road" if highway in ROADS else "path"


def distance(a, b):
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


def point_to_segment(point, a, b):
    """Metres from a point to segment a-b, using a flat local projection."""
    scale_lng = math.cos(math.radians(point[0]))
    px, py = point[1] * scale_lng, point[0]
    ax, ay, bx, by = a[1] * scale_lng, a[0], b[1] * scale_lng, b[0]
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111_320


def heading(a, b):
    """Direction of travel a -> b in degrees, folded to 0-180 (a street runs both ways)."""
    dx = (b[1] - a[1]) * math.cos(math.radians(a[0]))
    dy = b[0] - a[0]
    return math.degrees(math.atan2(dy, dx)) % 180


def nearest_street(point, streets, radius, along=None):
    """Closest named street; with `along`, only streets running parallel to that heading (sidewalks)."""
    best, best_distance = None, radius
    for name, geometry in streets:
        for a, b in zip(geometry, geometry[1:]):
            if along is not None:
                difference = abs(heading(a, b) - along)
                if min(difference, 180 - difference) > 25:
                    continue
            gap = point_to_segment(point, a, b)
            if gap < best_distance:
                best, best_distance = name, gap
    return best


def main():
    data = fetch()
    coords = {e["id"]: (e["lat"], e["lon"]) for e in data["elements"] if e["type"] == "node"}
    ways = [e for e in data["elements"] if e["type"] == "way" and is_walkable(e.get("tags", {}))]

    # Junctions: way endpoints and nodes shared by more than one way.
    usage = defaultdict(int)
    for way in ways:
        for node in way["nodes"]:
            usage[node] += 1
    junctions = {n for way in ways for n in (way["nodes"][0], way["nodes"][-1])} | {n for n, c in usage.items() if c > 1}

    # Named streets, for labelling the sidewalks beside them and the crossings over them.
    streets = [
        (way["tags"]["name"], [coords[n] for n in way["nodes"]])
        for way in ways
        if way.get("tags", {}).get("highway") in ROADS and way["tags"].get("name")
    ]
    street_by_node = {}
    for way in ways:
        tags = way.get("tags", {})
        if tags.get("highway") in ROADS and tags.get("name"):
            for node in way["nodes"]:
                street_by_node[node] = tags["name"]

    def label(tags, kind, run):
        """Name for one piece of a way: its own name, or the street a sidewalk or crossing belongs to."""
        if kind == "pedway":
            return None
        if tags.get("name"):
            return tags["name"]
        middle = coords[run[len(run) // 2]]
        if kind == "crossing":
            shared = next((street_by_node[n] for n in run if n in street_by_node), None)
            return shared or nearest_street(middle, streets, CROSSING_RADIUS)
        if tags.get("footway") == "sidewalk":
            # Longest straight piece decides which street the sidewalk follows.
            a, b = max(zip(run, run[1:]), key=lambda pair: distance(coords[pair[0]], coords[pair[1]]))
            if coords[a] == coords[b]:
                return None
            return nearest_street(middle, streets, SIDEWALK_RADIUS, along=heading(coords[a], coords[b]))
        return None

    def corners(way):
        """Sharp bends in a sidewalk, where it turns from one street onto another."""
        nodes = way["nodes"]
        bends = set()
        for previous, node, following in zip(nodes, nodes[1:], nodes[2:]):
            if coords[previous] in (coords[node], coords[following]):
                continue
            turn = abs(heading(coords[previous], coords[node]) - heading(coords[node], coords[following]))
            if min(turn, 180 - turn) > 45:
                bends.add(node)
        return bends

    names = []
    edges = []  # (from, to, length, kind, name, [intermediate osm nodes])
    for way in ways:
        tags = way.get("tags", {})
        kind = kind_of(tags)
        cuts = junctions | (corners(way) if tags.get("footway") == "sidewalk" else set())
        run = [way["nodes"][0]]
        for node in way["nodes"][1:]:
            run.append(node)
            if node in cuts:
                length = sum(distance(coords[a], coords[b]) for a, b in zip(run, run[1:]))
                if run[0] != run[-1] and length > 0:
                    edges.append((run[0], run[-1], length, kind, label(tags, kind, run), run[1:-1]))
                run = [node]

    # Keep only the largest connected network, so every route can be completed.
    neighbours = defaultdict(set)
    for a, b, *_ in edges:
        neighbours[a].add(b)
        neighbours[b].add(a)
    best = set()
    seen = set()
    for start in neighbours:
        if start in seen:
            continue
        component, stack = {start}, [start]
        while stack:
            for nxt in neighbours[stack.pop()] - component:
                component.add(nxt)
                stack.append(nxt)
        seen |= component
        best = max(best, component, key=len)
    edges = [e for e in edges if e[0] in best]

    south, west = BBOX[0], BBOX[1]

    def pack(node):
        lat, lng = coords[node]
        return [round((lat - south) * SCALE), round((lng - west) * SCALE)]

    index = {}
    nodes = []
    for a, b, *_ in edges:
        for node in (a, b):
            if node not in index:
                index[node] = len(nodes)
                nodes.append(pack(node))

    packed_edges = []
    for a, b, length, kind, name, via in edges:
        if name and name not in names:
            names.append(name)
        packed_edges.append([
            index[a],
            index[b],
            round(length, 1),
            KINDS.index(kind),
            names.index(name) if name else -1,
            [value for node in via for value in pack(node)],
        ])

    output = {
        "attribution": "Data (c) OpenStreetMap contributors, ODbL",
        "origin": [south, west],
        "scale": SCALE,
        "kinds": KINDS,
        "names": names,
        "nodes": nodes,
        "edges": packed_edges,
    }
    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as file:
        json.dump(output, file, separators=(",", ":"))
        file.write("\n")
    print(f"{len(nodes)} junctions, {len(packed_edges)} path segments -> {os.path.normpath(OUTPUT)}")


if __name__ == "__main__":
    main()
