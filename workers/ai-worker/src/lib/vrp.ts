// Cloudflare-safe replacement for the old OR-Tools VRP solver.
// OR-Tools (native CP-SAT) cannot run inside a Worker, so this implements a
// nearest-neighbour + capacity-feasible insertion heuristic followed by a
// 2-opt local search. The output shape matches the old `sync_solve_routing`
// contract exactly:
//   { ok, routes: [{ vehicle_id, route:[{id,lat,lng}], distance_meters, stops }],
//     total_distance_meters, total_vehicles }
// Route distances use haversine * 1.41 (int) to stay byte-compatible with the
// legacy solver's distance matrix.

export interface Location {
  id: string;
  lat: number;
  lng: number;
  demand?: number;
}
export interface Vehicle {
  id: string;
  capacity: number;
}
export interface RoutingResult {
  ok: boolean;
  routes?: Array<{
    vehicle_id: string;
    route: Array<{ id: string; lat: number; lng: number }>;
    distance_meters: number;
    stops: number;
  }>;
  total_distance_meters?: number;
  total_vehicles?: number;
  error?: string;
}

const EARTH_R = 6371000; // metres

function haversine(a: Location, b: Location): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return EARTH_R * c;
}

function distInt(a: Location, b: Location): number {
  return Math.floor(haversine(a, b) * 1.41);
}

function routeDistance(locs: Location[], order: number[]): number {
  if (order.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < order.length - 1; i++) d += distInt(locs[order[i]], locs[order[i + 1]]);
  return d;
}

function twoOpt(locs: Location[], order: number[]): number[] {
  // order is a full loop including the depot at index 0 (start) & end.
  let best = order.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const a = best[i - 1];
        const b = best[i];
        const c = best[k];
        const d = best[k + 1];
        const before = distInt(locs[a], locs[b]) + distInt(locs[c], locs[d]);
        const after = distInt(locs[a], locs[c]) + distInt(locs[b], locs[d]);
        if (after < before) {
          best.splice(i, k - i + 1, ...best.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return best;
}

export function solveRouting(
  locations: Location[],
  vehicles: Vehicle[],
  depotIndex: number
): RoutingResult {
  if (!locations || !vehicles) return { ok: false, error: 'Missing locations or vehicles' };
  if (depotIndex < 0 || depotIndex >= locations.length)
    return { ok: false, error: `Depot index ${depotIndex} out of range (0-${locations.length - 1})` };

  // Precompute distance matrix (symmetric).
  const n = locations.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = distInt(locations[i], locations[j]);
    matrix[i][j] = d;
    matrix[j][i] = d;
  }

  const unassigned = new Set<number>();
  for (let i = 0; i < n; i++) if (i !== depotIndex) unassigned.add(i);

  const routes: RoutingResult['routes'] = [];
  let totalDistance = 0;

  for (const vehicle of vehicles) {
    if (unassigned.size === 0) break;
    const cap = vehicle.capacity;
    let load = 0;
    // Start at the depot, greedily insert nearest feasible location.
    const order: number[] = [depotIndex];
    let cur = depotIndex;

    while (unassigned.size > 0) {
      let bestIdx: number | null = null;
      let bestDist = Infinity;
      for (const j of unassigned) {
        const demand = locations[j].demand || 0;
        if (load + demand > cap) continue; // capacity infeasible
        if (matrix[cur][j] < bestDist) {
          bestDist = matrix[cur][j];
          bestIdx = j;
        }
      }
      if (bestIdx === null) break; // no feasible insertion for this vehicle
      order.push(bestIdx);
      load += locations[bestIdx].demand || 0;
      unassigned.delete(bestIdx);
      cur = bestIdx;
    }

    if (order.length <= 1) continue; // vehicle did not move
    order.push(depotIndex); // close the loop back to depot

    const optimized = twoOpt(locations, order);
    const distance = routeDistance(locations, optimized);

    // Build the emitted route (drop the repeated closing depot to mirror OR-Tools output).
    const route = optimized.slice(0, -1).map((idx) => ({
      id: locations[idx].id,
      lat: locations[idx].lat,
      lng: locations[idx].lng,
    }));

    routes.push({
      vehicle_id: vehicle.id,
      route,
      distance_meters: distance,
      stops: route.length - 2, // exclude depot start/end (matches legacy)
    });
    totalDistance += distance;
  }

  // Only emit routes that actually left the depot (length > 2 = depot + stop + depot).
  const valid = routes.filter((r) => r.route.length > 2);

  if (unassigned.size > 0) {
    // Could not serve every location with the given fleet → infeasible.
    return {
      ok: false,
      routes: valid,
      total_distance_meters: totalDistance,
      total_vehicles: valid.length,
      error: `No feasible solution: ${unassigned.size} location(s) unassigned`,
    };
  }

  return {
    ok: true,
    routes: valid,
    total_distance_meters: totalDistance,
    total_vehicles: valid.length,
  };
}
