import { WORLD } from "../config/world.js";

export const Phase = { DAY: "day", DUSK: "dusk", NIGHT: "night" };

export class DayNightSystem {
  constructor(scene, onDayEnd) {
    this.scene    = scene;
    this.onDayEnd = onDayEnd; // callback when night ends → triggers commitDay
    this.elapsed  = 0;
    this.day      = 1;
    this.phase    = Phase.DAY;

    this.cycleDuration = WORLD.DAY_DURATION + WORLD.DUSK_DURATION + WORLD.NIGHT_DURATION;
  }

  update(delta) {
    this.elapsed += delta;

    const t = this.elapsed % this.cycleDuration;
    let newPhase;

    if (t < WORLD.DAY_DURATION) {
      newPhase = Phase.DAY;
    } else if (t < WORLD.DAY_DURATION + WORLD.DUSK_DURATION) {
      newPhase = Phase.DUSK;
    } else {
      newPhase = Phase.NIGHT;
    }

    if (newPhase !== this.phase) {
      const prevPhase = this.phase;
      this.phase = newPhase;
      this._onPhaseChange(prevPhase, newPhase);
    }

    return this._getLightAlpha();
  }

  _onPhaseChange(from, to) {
    if (to === Phase.DUSK) {
      this.scene.events.emit("dusk");
    } else if (to === Phase.NIGHT) {
      this.scene.events.emit("night");
    } else if (to === Phase.DAY) {
      this.day++;
      this.scene.events.emit("dawn", this.day);
      this.onDayEnd(this.day);
    }
  }

  /** Returns darkness overlay alpha: 0 = full day, 0.85 = full night */
  _getLightAlpha() {
    const t = this.elapsed % this.cycleDuration;
    if (t < WORLD.DAY_DURATION) return 0;
    if (t < WORLD.DAY_DURATION + WORLD.DUSK_DURATION) {
      return ((t - WORLD.DAY_DURATION) / WORLD.DUSK_DURATION) * 0.85;
    }
    return 0.85;
  }

  get isNight() { return this.phase === Phase.NIGHT; }
  get isDusk()  { return this.phase === Phase.DUSK;  }
  get isDay()   { return this.phase === Phase.DAY;   }

  /** Progress 0–1 within current full cycle */
  get cycleProgress() {
    return (this.elapsed % this.cycleDuration) / this.cycleDuration;
  }
}
