import type { LatLng } from "../types/content";

/** Walking network produced by scripts/build_campus_paths.py. */
export interface CampusPathsData {
  origin: [lat: number, lng: number];
  scale: number;
  kinds: string[];
  names: string[];
  /** Junctions as integer offsets from `origin`, multiplied by `scale`. */
  nodes: [number, number][];
  /** [from, to, lengthMeters, kindIndex, nameIndex (-1 = unnamed), flat intermediate offsets]. */
  edges: [number, number, number, number, number, number[]][];
}

export type PathKind = "path" | "road" | "steps" | "pedway" | "crossing";
export type Coordinate = [lat: number, lng: number];

export type Maneuver =
  | "depart"
  | "straight"
  | "slight-left"
  | "slight-right"
  | "left"
  | "right"
  | "u-turn"
  | "stairs"
  | "cross"
  | "pedway"
  | "arrive";

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  maneuver: Maneuver;
}

export interface CampusRoute {
  path: Coordinate[];
  distanceMeters: number;
  minutes: number;
  steps: RouteStep[];
  usesPedway: boolean;
}

interface Edge {
  from: number;
  to: number;
  length: number;
  kind: PathKind;
  name?: string;
  /** Full geometry from `from` to `to`, with cumulative distance at each point. */
  points: Coordinate[];
  cumulative: number[];
}

interface Snap {
  edge: number;
  /** Metres from the edge's `from` end. */
  along: number;
  point: Coordinate;
  /** Index of the geometry segment the point lies on. */
  segment: number;
  offRoute: number;
}

interface Leg {
  kind: PathKind;
  name?: string;
  points: Coordinate[];
  length: number;
}

const WALKING_METERS_PER_MINUTE = 80;
/** Legs shorter than this are folded into their neighbours to keep directions readable. */
const MIN_LEG_METERS = 15;

export function metersBetween([lat1, lng1]: Coordinate, [lat2, lng2]: Coordinate): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

function bearing([lat1, lng1]: Coordinate, [lat2, lng2]: Coordinate): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const y = Math.sin(toRadians(lng2 - lng1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function compass(degrees: number): string {
  return ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(degrees / 45) % 8]!;
}

function turnOf(change: number): { phrase: string; maneuver: Maneuver } {
  const size = Math.abs(change);
  const side = change > 0 ? "right" : "left";
  if (size < 25) return { phrase: "Continue", maneuver: "straight" };
  if (size < 60) return { phrase: `Bear ${side}`, maneuver: `slight-${side}` };
  if (size < 150) return { phrase: `Turn ${side}`, maneuver: side };
  return { phrase: "Turn around and continue", maneuver: "u-turn" };
}

/** Where a leg goes, e.g. "onto 87 Avenue NW"; empty for unnamed paths and roads. */
function describe(leg: Leg, isFirst: boolean): string {
  if (leg.kind === "pedway") return "through the pedway (indoors)";
  if (leg.name) return `${isFirst ? "along" : "onto"} ${leg.name}`;
  return "";
}

/** Crossings and stairs always stay their own step. */
function isStandalone(leg: Leg): boolean {
  return leg.kind === "crossing" || leg.kind === "steps";
}

/** Whether two consecutive legs read as one instruction; unnamed paths and roads look the same to a walker. */
function continuesAs(previous: Leg, leg: Leg): boolean {
  if (isStandalone(previous) || isStandalone(leg)) {
    return previous.kind === leg.kind && previous.name === leg.name;
  }
  const group = (candidate: Leg) => (candidate.kind === "pedway" ? "pedway" : "walk");
  return group(previous) === group(leg) && previous.name === leg.name;
}

function roundDistance(meters: number): number {
  return Math.max(5, Math.round(meters / 5) * 5);
}

class MinHeap {
  private items: [cost: number, node: number][] = [];

  get size() {
    return this.items.length;
  }

  push(item: [number, number]) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent]![0] <= items[index]![0]) break;
      [items[parent], items[index]] = [items[index]!, items[parent]!];
      index = parent;
    }
  }

  pop(): [number, number] {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < items.length && items[left]![0] < items[smallest]![0]) smallest = left;
        if (right < items.length && items[right]![0] < items[smallest]![0]) smallest = right;
        if (smallest === index) break;
        [items[smallest], items[index]] = [items[index]!, items[smallest]!];
        index = smallest;
      }
    }
    return top;
  }
}

export class CampusRouter {
  private readonly nodes: Coordinate[];
  private readonly edges: Edge[];
  private readonly adjacency: number[][];

  constructor(data: CampusPathsData) {
    const [originLat, originLng] = data.origin;
    const decode = (lat: number, lng: number): Coordinate => [originLat + lat / data.scale, originLng + lng / data.scale];

    this.nodes = data.nodes.map(([lat, lng]) => decode(lat, lng));
    this.adjacency = this.nodes.map(() => []);
    this.edges = data.edges.map(([from, to, length, kindIndex, nameIndex, via], index) => {
      const points: Coordinate[] = [this.nodes[from]!];
      for (let offset = 0; offset < via.length; offset += 2) {
        points.push(decode(via[offset]!, via[offset + 1]!));
      }
      points.push(this.nodes[to]!);
      const cumulative = [0];
      for (let point = 1; point < points.length; point += 1) {
        cumulative.push(cumulative[point - 1]! + metersBetween(points[point - 1]!, points[point]!));
      }
      this.adjacency[from]!.push(index);
      this.adjacency[to]!.push(index);
      return {
        from,
        to,
        length: Math.max(length, cumulative[cumulative.length - 1]!),
        kind: data.kinds[kindIndex] as PathKind,
        name: nameIndex >= 0 ? data.names[nameIndex] : undefined,
        points,
        cumulative,
      };
    });
  }

  /** Nearest point on the walking network to a location. */
  private snap([lat, lng]: Coordinate): Snap {
    // Work in a local flat projection: metres east/north of the query point.
    const metersPerDegreeLat = 111_320;
    const metersPerDegreeLng = 111_320 * Math.cos((lat * Math.PI) / 180);
    const project = ([pLat, pLng]: Coordinate) => [(pLng - lng) * metersPerDegreeLng, (pLat - lat) * metersPerDegreeLat];

    let best: Snap | undefined;
    this.edges.forEach((edge, edgeIndex) => {
      for (let segment = 0; segment < edge.points.length - 1; segment += 1) {
        const [ax, ay] = project(edge.points[segment]!);
        const [bx, by] = project(edge.points[segment + 1]!);
        const dx = bx! - ax!;
        const dy = by! - ay!;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, -(ax! * dx + ay! * dy) / lengthSquared));
        const x = ax! + dx * t;
        const y = ay! + dy * t;
        const offRoute = Math.hypot(x, y);
        if (!best || offRoute < best.offRoute) {
          const segmentLength = edge.cumulative[segment + 1]! - edge.cumulative[segment]!;
          best = {
            edge: edgeIndex,
            along: edge.cumulative[segment]! + segmentLength * t,
            point: [lat + y / metersPerDegreeLat, lng + x / metersPerDegreeLng],
            segment,
            offRoute,
          };
        }
      }
    });
    return best!;
  }

  /** Geometry of an edge between two distances from its `from` end (either direction). */
  private slice(edge: Edge, fromAlong: number, toAlong: number, snapPoints: { from?: Coordinate; to?: Coordinate } = {}): Coordinate[] {
    const forward = toAlong >= fromAlong;
    const low = Math.min(fromAlong, toAlong);
    const high = Math.max(fromAlong, toAlong);
    const inner = edge.points.filter((_, index) => edge.cumulative[index]! > low && edge.cumulative[index]! < high);
    const start = snapPoints.from ?? (fromAlong <= 0 ? edge.points[0]! : edge.points[edge.points.length - 1]!);
    const end = snapPoints.to ?? (toAlong <= 0 ? edge.points[0]! : edge.points[edge.points.length - 1]!);
    return [start, ...(forward ? inner : inner.reverse()), end];
  }

  route(from: LatLng, to: LatLng, destinationName: string): CampusRoute | undefined {
    const origin: Coordinate = [from.lat, from.lng];
    const destination: Coordinate = [to.lat, to.lng];
    const start = this.snap(origin);
    const end = this.snap(destination);
    const startEdge = this.edges[start.edge]!;
    const endEdge = this.edges[end.edge]!;

    // Dijkstra from the two ends of the starting edge.
    const cost = new Float64Array(this.nodes.length).fill(Infinity);
    const previousEdge = new Int32Array(this.nodes.length).fill(-1);
    const heap = new MinHeap();
    cost[startEdge.from] = start.along;
    cost[startEdge.to] = startEdge.length - start.along;
    heap.push([cost[startEdge.from]!, startEdge.from]);
    heap.push([cost[startEdge.to]!, startEdge.to]);

    while (heap.size > 0) {
      const [nodeCost, node] = heap.pop();
      if (nodeCost > cost[node]!) continue;
      for (const edgeIndex of this.adjacency[node]!) {
        const edge = this.edges[edgeIndex]!;
        const next = edge.from === node ? edge.to : edge.from;
        const nextCost = nodeCost + edge.length;
        if (nextCost < cost[next]!) {
          cost[next] = nextCost;
          previousEdge[next] = edgeIndex;
          heap.push([nextCost, next]);
        }
      }
    }

    // Best way onto the destination edge, or straight along a shared edge.
    const options: { total: number; via?: number }[] = [
      { total: cost[endEdge.from]! + end.along, via: endEdge.from },
      { total: cost[endEdge.to]! + (endEdge.length - end.along), via: endEdge.to },
    ];
    if (start.edge === end.edge) {
      options.push({ total: Math.abs(end.along - start.along) });
    }
    const best = options.reduce((first, second) => (second.total < first.total ? second : first));
    if (!Number.isFinite(best.total)) {
      return undefined;
    }

    const legs: Leg[] = [];
    const addLeg = (edge: Edge, points: Coordinate[]) => {
      let length = 0;
      for (let index = 1; index < points.length; index += 1) {
        length += metersBetween(points[index - 1]!, points[index]!);
      }
      legs.push({ kind: edge.kind, name: edge.name, points, length });
    };

    if (best.via === undefined) {
      addLeg(startEdge, this.slice(startEdge, start.along, end.along, { from: start.point, to: end.point }));
    } else {
      // Walk back from the destination edge to the start edge.
      const middle: { edge: Edge; forward: boolean }[] = [];
      let node = best.via;
      while (previousEdge[node] !== -1) {
        const edge = this.edges[previousEdge[node]!]!;
        const forward = edge.to === node;
        middle.unshift({ edge, forward });
        node = forward ? edge.from : edge.to;
      }
      const leavesThroughFrom = node === startEdge.from;
      addLeg(startEdge, this.slice(startEdge, start.along, leavesThroughFrom ? 0 : startEdge.length, { from: start.point }));
      for (const { edge, forward } of middle) {
        addLeg(edge, forward ? edge.points : [...edge.points].reverse());
      }
      const entersThroughFrom = best.via === endEdge.from;
      addLeg(endEdge, this.slice(endEdge, entersThroughFrom ? 0 : endEdge.length, end.along, { to: end.point }));
    }

    const distanceMeters = best.total + start.offRoute + end.offRoute;
    const path: Coordinate[] = [origin, ...legs.flatMap((leg) => leg.points), destination];
    return {
      path,
      distanceMeters: Math.round(distanceMeters),
      minutes: Math.max(1, Math.ceil(distanceMeters / WALKING_METERS_PER_MINUTE)),
      steps: buildSteps(legs, destinationName),
      usesPedway: legs.some((leg) => leg.kind === "pedway" && leg.length >= MIN_LEG_METERS),
    };
  }
}

/** Merges legs into readable, turn-by-turn steps. */
export function buildSteps(rawLegs: Leg[], destinationName: string): RouteStep[] {
  const legs: Leg[] = [];
  for (const leg of rawLegs) {
    if (leg.points.length < 2 || leg.length === 0) continue;
    const previous = legs[legs.length - 1];
    if (previous && continuesAs(previous, leg)) {
      previous.points = [...previous.points, ...leg.points.slice(1)];
      previous.length += leg.length;
    } else {
      legs.push({ ...leg, points: [...leg.points] });
    }
  }

  // Fold very short legs (crossings, tiny connectors) into the leg before them.
  const merged: Leg[] = [];
  for (const leg of legs) {
    const previous = merged[merged.length - 1];
    if (previous && leg.length < MIN_LEG_METERS && !isStandalone(leg) && !isStandalone(previous)) {
      previous.points = [...previous.points, ...leg.points.slice(1)];
      previous.length += leg.length;
    } else if (previous && continuesAs(previous, leg)) {
      previous.points = [...previous.points, ...leg.points.slice(1)];
      previous.length += leg.length;
    } else {
      merged.push(leg);
    }
  }

  const steps: RouteStep[] = merged.map((leg, index) => {
    const distanceMeters = roundDistance(leg.length);
    if (leg.kind === "crossing") {
      return { instruction: `Cross ${leg.name ?? "the road"}`, distanceMeters, maneuver: "cross" };
    }
    if (index === 0) {
      const heading = compass(bearing(leg.points[0]!, leg.points[Math.min(leg.points.length - 1, 2)]!));
      return leg.kind === "steps"
        ? { instruction: `Take the stairs heading ${heading}`, distanceMeters, maneuver: "stairs" }
        : { instruction: `Head ${heading} ${describe(leg, true)}`.trim(), distanceMeters, maneuver: "depart" };
    }
    const previous = merged[index - 1]!;
    const incoming = bearing(previous.points[Math.max(0, previous.points.length - 3)]!, previous.points[previous.points.length - 1]!);
    const outgoing = bearing(leg.points[0]!, leg.points[Math.min(leg.points.length - 1, 2)]!);
    const change = ((outgoing - incoming + 540) % 360) - 180;
    if (leg.kind === "steps") {
      return { instruction: "Take the stairs", distanceMeters, maneuver: "stairs" };
    }
    const where = describe(leg, false);
    const { phrase, maneuver } = turnOf(change);
    const instruction = where ? `${phrase} ${where}` : phrase === "Continue" ? "Continue straight" : phrase;
    return { instruction, distanceMeters, maneuver: leg.kind === "pedway" && maneuver === "straight" ? "pedway" : maneuver };
  });

  steps.push({ instruction: `Arrive at ${destinationName}`, distanceMeters: 0, maneuver: "arrive" });
  return steps;
}
