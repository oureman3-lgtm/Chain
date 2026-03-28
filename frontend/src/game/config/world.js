export const WORLD = {
  WIDTH:  2400,
  HEIGHT: 2400,
  TILE_SIZE: 32,

  // Day/night timings (milliseconds)
  DAY_DURATION:   300_000,  // 5 minutes
  DUSK_DURATION:   30_000,  // 30 seconds
  NIGHT_DURATION:  30_000,  // 30 seconds (AP commit window)

  // Resource nodes per world
  TREE_COUNT:       40,
  ROCK_COUNT:       20,
  GRASS_COUNT:      30,
  BERRY_COUNT:      20,

  // Survival decay per second
  HUNGER_DECAY:     0.05,   // 100 → 0 in ~33 minutes
  SANITY_DECAY_DAY: 0.02,
  SANITY_DECAY_NIGHT: 0.08, // 4× faster at night
  HEALTH_DECAY_HUNGRY: 0.1, // lose HP when hunger = 0

  // Near-campfire sanity restore per second
  CAMPFIRE_SANITY_RESTORE: 0.15,

  // Berry restores
  BERRY_HUNGER_RESTORE: 20,

  // Player speed (pixels/second)
  PLAYER_SPEED: 150,

  // Interaction radius (pixels)
  INTERACT_RADIUS: 50,
};
