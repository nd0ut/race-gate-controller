import { EventEmitter } from "events";
import { GateManager } from "./GateManager.ts";
import { GateIntersectionEntry } from "./types.ts";

type EventMap = {
  "gate-intersection": [GateIntersectionEntry];
};

export class GateIntersectionDetector extends EventEmitter<EventMap> {
  gateManager: GateManager;

  constructor(gateManager: GateManager) {
    super();

    this.gateManager = gateManager;

    this.gateManager.addListener(
      "gate-circuit-status-change",
      (gate, prevGate) => {
        if (
          gate.circuitStatus === "closed" &&
          prevGate.circuitStatus === "opened"
        ) {
          const entryTime = prevGate.lastCircuitStatusChangeTimestamp;
          const exitTime = gate.lastCircuitStatusChangeTimestamp;
          const duration = exitTime.getTime() - entryTime.getTime();

          if (duration < 0) {
            console.log(`Invalid duration: ${duration}`);
            return;
          }

          const entry: GateIntersectionEntry = {
            gate,
            entryTime,
            exitTime,
            duration,
          };

          this.emit("gate-intersection", entry);
        }
      }
    );
  }
}
