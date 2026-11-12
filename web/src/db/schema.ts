import { pgTable, text, varchar, timestamp, uuid, real, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const roadSegments = pgTable(
  'road_segments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    osmWayId: varchar('osm_way_id', { length: 64 }).notNull(),
    uNode: varchar('u_node', { length: 64 }).notNull(),
    vNode: varchar('v_node', { length: 64 }).notNull(),
    geometry: jsonb('geometry').notNull(), // GeoJSON LineString coordinates [[lng, lat], ...]
    lengthM: real('length_m').notNull(),
    grade: real('grade').default(0.0),
    highway: varchar('highway', { length: 32 }),
    lit: varchar('lit', { length: 16 }),
    sidewalk: varchar('sidewalk', { length: 16 }),
    maxspeed: varchar('maxspeed', { length: 16 }),
    safetyScore: real('safety_score').default(0.5),
    bboxKey: varchar('bbox_key', { length: 64 }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('osm_segment_idx').on(table.osmWayId, table.uNode, table.vNode),
    index('bbox_idx').on(table.bboxKey),
  ]
);

export const savedRoutes = pgTable(
  'saved_routes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkUserId: varchar('clerk_user_id', { length: 128 }).notNull(),
    name: text('name').notNull(),
    waypoints: jsonb('waypoints').notNull(), // [[lat, lng], ...]
    routeGeojson: jsonb('route_geojson').notNull(), // Full GeoJSON Feature
    elevationProfile: jsonb('elevation_profile').notNull(), // Array of samples
    distanceKm: real('distance_km').notNull(),
    elevationGainM: real('elevation_gain_m').notNull(),
    effortTolerance: real('effort_tolerance').notNull(),
    safetyStrictness: real('safety_strictness').notNull(),
    hazards: jsonb('hazards').default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('user_routes_idx').on(table.clerkUserId),
  ]
);

export type RoadSegment = typeof roadSegments.$inferSelect;
export type NewRoadSegment = typeof roadSegments.$inferInsert;
export type SavedRoute = typeof savedRoutes.$inferSelect;
export type NewSavedRoute = typeof savedRoutes.$inferInsert;
