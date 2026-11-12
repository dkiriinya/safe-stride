import { z } from 'zod';

export const RouteRequestSchema = z.object({
  startCoords: z.tuple([z.number(), z.number()]),
  endCoords: z.tuple([z.number(), z.number()]),
  waypoints: z.array(z.tuple([z.number(), z.number()])).optional(),
  effortTolerance: z.number().min(0).max(1), // alpha multiplier
  safetyStrictness: z.number().min(0).max(1), // beta multiplier
  targetDistanceKm: z.number().optional(), // for loop generation
  isRoundTrip: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional(), // Step-free, curb cuts, max 6% grade
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export const ElevationSampleSchema = z.object({
  distance: z.number(),
  elevation: z.number(),
  grade: z.number(),
  safetyScore: z.number(),
});

export type ElevationSample = z.infer<typeof ElevationSampleSchema>;

export const HazardSchema = z.object({
  id: z.string(),
  coord: z.tuple([z.number(), z.number()]), // [lat, lng]
  distanceKm: z.number(),
  lengthM: z.number(),
  kind: z.enum(['unlit', 'no_sidewalk', 'high_speed', 'steep_incline', 'stairs', 'curb']),
  description: z.string(),
});

export type Hazard = z.infer<typeof HazardSchema>;

export const GeoJSONGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])), // [lng, lat]
});

export const GeoJSONFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeoJSONGeometrySchema,
  properties: z.record(z.any()).default({}),
});

export type GeoJSONFeature = z.infer<typeof GeoJSONFeatureSchema>;

export const RouteResponseSchema = z.object({
  route: GeoJSONFeatureSchema,
  distanceKm: z.number(),
  elevationGainM: z.number(),
  estDurationMin: z.number(),
  elevationProfile: z.array(ElevationSampleSchema),
  hazards: z.array(HazardSchema),
});

export type RouteResponse = z.infer<typeof RouteResponseSchema>;
