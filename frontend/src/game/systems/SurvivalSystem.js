import { WORLD } from "../config/world.js";

export class SurvivalSystem {
  constructor(scene) {
    this.scene = scene;
  }

  /** Call every game frame. delta = ms since last frame. */
  update(delta, state, isNight, nearCampfire) {
    const dt = delta / 1000; // convert to seconds

    // Hunger decay
    state.hunger = Math.max(0, state.hunger - WORLD.HUNGER_DECAY * dt);

    // Sanity decay (faster at night, restore near campfire)
    if (nearCampfire) {
      state.sanity = Math.min(state.maxSanity, state.sanity + WORLD.CAMPFIRE_SANITY_RESTORE * dt);
    } else {
      const sanityRate = isNight ? WORLD.SANITY_DECAY_NIGHT : WORLD.SANITY_DECAY_DAY;
      state.sanity = Math.max(0, state.sanity - sanityRate * dt);
    }

    // Health decay when starving
    if (state.hunger === 0) {
      state.health = Math.max(0, state.health - WORLD.HEALTH_DECAY_HUNGRY * dt);
    }

    return {
      isDead:    state.health <= 0,
      isLowSanity: state.sanity < 30
    };
  }

  eatBerry(state) {
    state.hunger = Math.min(state.maxHunger, state.hunger + WORLD.BERRY_HUNGER_RESTORE);
  }
}
