import { MAX_DAILY_AP, AP_COSTS, AP_BONUS_REST } from "../config/items.js";

/**
 * APTracker – local action point accounting.
 * Mirrors the contract's commitDay validation so the frontend
 * can block actions before they reach the chain.
 *
 * Net AP = gross AP used – (restCount × AP_BONUS_REST)
 */
export class APTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.gatherCount  = 0;
    this.craftCount   = 0;
    this.eatCount     = 0;
    this.combatAP     = 0;
    this.moveCount    = 0;
    this.exploreCount = 0;
    this.restCount    = 0;
    this.idleCount    = 0;
    // Extra AP granted by rest actions (added to effective budget)
    this._restBonus   = 0;
    // Item types crafted (for quest notifications at commitDay)
    this.craftedItemTypes = [];
  }

  get grossUsed() {
    return (
      this.gatherCount  * AP_COSTS.GATHER  +
      this.craftCount   * AP_COSTS.CRAFT   +
      this.eatCount     * AP_COSTS.EAT     +
      this.combatAP                        +
      this.moveCount    * AP_COSTS.MOVE    +
      this.exploreCount * AP_COSTS.EXPLORE +
      this.restCount    * AP_COSTS.REST    +
      this.idleCount    * AP_COSTS.IDLE
    );
  }

  get netUsed() {
    const net = this.grossUsed - this._restBonus;
    return net < 0 ? 0 : net;
  }

  get remaining() {
    return MAX_DAILY_AP - this.netUsed;
  }

  get isFull() {
    return this.netUsed >= MAX_DAILY_AP;
  }

  canGather()      { return this.remaining >= AP_COSTS.GATHER;  }
  canCraft()       { return this.remaining >= AP_COSTS.CRAFT;   }
  canEat()         { return this.remaining >= AP_COSTS.EAT;     }
  canMove()        { return this.remaining >= AP_COSTS.MOVE;    }
  canExplore()     { return this.remaining >= AP_COSTS.EXPLORE; }
  canRest()        { return this.remaining >= AP_COSTS.REST;    }
  canIdle()        { return this.remaining >= AP_COSTS.IDLE;    }
  canFight(apCost) { return this.remaining >= apCost;           }

  recordGather() {
    if (!this.canGather()) throw new Error("AP不足，无法采集");
    this.gatherCount++;
  }

  recordCraft(itemType) {
    if (!this.canCraft()) throw new Error("AP不足，无法合成");
    this.craftCount++;
    if (itemType) this.craftedItemTypes.push(itemType);
  }

  recordEat() {
    if (!this.canEat()) throw new Error("AP不足，无法进食");
    this.eatCount++;
  }

  recordMove() {
    if (!this.canMove()) throw new Error("AP不足，无法移动");
    this.moveCount++;
  }

  recordExplore() {
    if (!this.canExplore()) throw new Error("AP不足，无法探索");
    this.exploreCount++;
  }

  recordRest(apBonus = AP_BONUS_REST) {
    if (!this.canRest()) throw new Error("AP不足，无法休息");
    this.restCount++;
    this._restBonus += apBonus;
  }

  recordIdle() {
    if (!this.canIdle()) throw new Error("AP不足，无法挂机");
    this.idleCount++;
  }

  recordCombat(apCost) {
    if (!this.canFight(apCost)) throw new Error("AP不足，无法战斗");
    this.combatAP += apCost;
  }

  toCommitParams(daysSurvived, newLevel, died, itemIdsToDestroy = []) {
    return {
      gatherCount:      this.gatherCount,
      craftCount:       this.craftCount,
      eatCount:         this.eatCount,
      combatAP:         this.combatAP,
      moveCount:        this.moveCount,
      exploreCount:     this.exploreCount,
      restCount:        this.restCount,
      idleCount:        this.idleCount,
      daysSurvived,
      newLevel,
      died,
      itemIdsToDestroy,
      craftedItemTypes: this.craftedItemTypes
    };
  }
}
