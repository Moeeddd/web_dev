import * as turf from '@turf/turf';

export interface Position {
  lat: number;
  lng: number;
}

/** Haversine distance between two points in kilometers */
export function haversineDistance(p1: Position, p2: Position): number {
  const from = turf.point([p1.lng, p1.lat]);
  const to = turf.point([p2.lng, p2.lat]);
  return turf.distance(from, to, { units: 'kilometers' });
}

/** Calculate bearing from p1 to p2 in degrees */
export function calculateBearing(from: Position, to: Position): number {
  const point1 = turf.point([from.lng, from.lat]);
  const point2 = turf.point([to.lng, to.lat]);
  return turf.bearing(point1, point2);
}

/** Move a point along a bearing by a distance (km) */
export function moveAlongBearing(pos: Position, bearing: number, distanceKm: number): Position {
  const point = turf.point([pos.lng, pos.lat]);
  const destination = turf.destination(point, distanceKm, bearing, { units: 'kilometers' });
  const [lng, lat] = destination.geometry.coordinates;
  return { lat, lng };
}

/** Convert knots to km/h */
export function knotsToKmh(knots: number): number {
  return knots * 1.852;
}

/** Check if a point is inside a polygon */
export function isPointInPolygon(point: Position, polygon: Position[]): boolean {
  if (polygon.length < 3) return false;
  const pt = turf.point([point.lng, point.lat]);
  const coords = polygon.map(p => [p.lng, p.lat]);
  // Close the polygon
  if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
    coords.push(coords[0]);
  }
  const poly = turf.polygon([coords]);
  return turf.booleanPointInPolygon(pt, poly);
}

/** Check if a line segment intersects a polygon */
export function doesRouteIntersectPolygon(route: Position[], polygon: Position[]): boolean {
  if (route.length < 2 || polygon.length < 3) return false;

  const lineCoords = route.map(p => [p.lng, p.lat]);
  const line = turf.lineString(lineCoords);

  const polyCoords = polygon.map(p => [p.lng, p.lat]);
  if (polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] ||
      polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]) {
    polyCoords.push(polyCoords[0]);
  }
  const poly = turf.polygon([polyCoords]);

  const intersection = turf.lineIntersect(line, poly);
  return intersection.features.length > 0;
}

/** Calculate ETA given current position, destination, and speed in knots */
export function calculateETA(from: Position, to: Position, speedKnots: number): Date {
  const distKm = haversineDistance(from, to);
  const speedKmh = knotsToKmh(speedKnots);
  if (speedKmh <= 0) return new Date(Date.now() + 999999999);
  const hoursToArrival = distKm / speedKmh;
  return new Date(Date.now() + hoursToArrival * 3600000);
}

/** Generate waypoints for a simple route avoiding restricted zones */
export function generateRoute(
  from: Position,
  to: Position,
  restrictedZones: { polygon: Position[] }[]
): Position[] {
  // Simple route: direct path with waypoints around restricted zones
  const route: Position[] = [from];

  // Check if direct path intersects any restricted zone
  let needsDetour = false;
  for (const zone of restrictedZones) {
    if (doesRouteIntersectPolygon([from, to], zone.polygon)) {
      needsDetour = true;
      // Generate waypoints around the zone
      const centroid = getCentroid(zone.polygon);
      const bearing = calculateBearing(from, to);

      // Create waypoints that go around the zone
      const offset1 = moveAlongBearing(centroid, bearing + 90, 30);
      const offset2 = moveAlongBearing(centroid, bearing - 90, 30);

      // Choose the shorter detour
      const dist1 = haversineDistance(from, offset1) + haversineDistance(offset1, to);
      const dist2 = haversineDistance(from, offset2) + haversineDistance(offset2, to);

      if (dist1 < dist2) {
        route.push(offset1);
      } else {
        route.push(offset2);
      }
      break;
    }
  }

  // Add intermediate waypoints for smoother path
  const totalDist = haversineDistance(from, to);
  if (totalDist > 100 && !needsDetour) {
    const midBearing = calculateBearing(from, to);
    const mid = moveAlongBearing(from, midBearing, totalDist / 2);
    route.push(mid);
  }

  route.push(to);
  return route;
}

function getCentroid(polygon: Position[]): Position {
  const lat = polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length;
  const lng = polygon.reduce((sum, p) => sum + p.lng, 0) / polygon.length;
  return { lat, lng };
}

/** Normalize bearing to 0-360 */
export function normalizeBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/** Interpolate between two positions */
export function interpolatePosition(from: Position, to: Position, fraction: number): Position {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}
