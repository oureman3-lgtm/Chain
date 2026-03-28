import { MAX_DAILY_AP, AP_COSTS } from "../config/items.js";

/**
 * APTracker – local action point accounting.
 * Mirrors the contract's commitDay validation so the frontend
 * can block actions before they reach the chain.
 */
export class APTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.gatherCount = 0;
    this.craftCount  = 0;
    this.eatCount    = 0;
    this.combatAP    = 0;
  }

  get used() {
    return (
      this.gatherCount * AP_COSTS.GATHER +
      this.craftCount  * AP_COSTS.CRAFT  +
      this.eatCount    * AP_COSTS.EAT    +
      this.combatAP
    );
  }

  get remaining() {
    return MAX_DAILY_AP - this.used;
  }

  get isFull() {
    return this.used >= MAX_DAILY_AP;
  }

  canGather() { return this.remaining >= AP_COSTS.GATHER; }
  canCraft()  { return this.remaining >= AP_COSTS.CRAFT;  }
  canEat()    { return this.remaining >= AP_COSTS.EAT;    }
  canFight(apCost) { return this.remaining >= apCost;     }

  recordGather() {
    if (!this.canGather()) throw new Error("AP不足，无法采集");
    this.gatherCount++;
  }

  recordCraft() {
    if (!this.canCraft()) throw new Error("AP不足，无法合成");
    this.craftCount++;
  }

  recordEat() {
    if (!this.canEat()) throw new Error("AP不足，无法进食");
    this.eatCount++;
  }

  recordCombat(apCost) {
    if (!this.canFight(apCost)) throw new Error("AP不足，无法战斗");
    this.combatAP += apCost;
  }

  toCommitParams(daysSurvived, newLevel, died, itemIdsToDestroy = []) {
    return {
      gatherCount: this.gatherCount,
      craftCount:  this.craftCount,
      eatCount:    this.eatCount,
      combatAP:    this.combatAP,
      daysSurvived,
      newLevel,
      died,
      itemIdsToDestroy
    };
  }
}
