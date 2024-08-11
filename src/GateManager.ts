import EventEmitter from "events";
import { MqttService } from "./MqttService.ts";
import { Gate, PlainGate } from "./Gate.ts";

type EventMap = {
  "gate-connection-status-change": [PlainGate, PlainGate];
  "gate-circuit-status-change": [PlainGate, PlainGate];
};

export class GateManager extends EventEmitter<EventMap> {
  #gates: Map<string, Gate> = new Map();

  constructor(mqttService: MqttService) {
    super();

    mqttService.on("gate-connection-status", (message) => {
      const { deviceId, connectionStatus } = message;
      const gate = this.#gates.get(deviceId) ?? new Gate(deviceId);
      const prevGate = gate.plain();
      gate.setConnectionStatus(connectionStatus);
      this.#gates.set(deviceId, gate);
      this.emit("gate-connection-status-change", gate.plain(), prevGate);
    });

    mqttService.on("gate-circuit-status", (message) => {
      const { deviceId, circuitStatus, timestamp } = message;
      const gate = this.#gates.get(deviceId) ?? new Gate(deviceId);
      const prevGate = gate.plain();
      gate.setCircuitStatus(circuitStatus, timestamp);
      this.#gates.set(deviceId, gate);
      this.emit("gate-circuit-status-change", gate.plain(), prevGate);
    });
  }

  getGate(deviceId: string) {
    const gate = this.#gates.get(deviceId);
    if (!gate) {
      throw new Error(`Gate ${deviceId} not found`);
    }
    return gate;
  }

  getAllGates() {
    return this.#gates.values();
  }

  getGatesCount() {
    return this.#gates.size;
  }
}
