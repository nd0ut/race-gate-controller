import EventEmitter from "events";
import {
  DeviceId,
  MqttCircuitStatusMessage,
  MqttConnectionStatusMessage,
} from "./schemas.ts";

type CountdownMode = "on-entry" | "on-exit";
type Position = "unset" | "start" | "finish";

type EventMap = {
  "connection-status-change": [Gate];
  "circuit-status-change": [Gate];
  "countdown-mode-change": [Gate];
  "position-change": [Gate];
};

export type PlainGate = Readonly<
  Pick<
    Gate,
    | "deviceId"
    | "connectionStatus"
    | "circuitStatus"
    | "lastCircuitStatusChangeTimestamp"
    | "countdownMode"
    | "position"
  >
>;

export class Gate extends EventEmitter<EventMap> {
  deviceId: DeviceId;
  connectionStatus: MqttConnectionStatusMessage["connectionStatus"] = "online";
  circuitStatus: MqttCircuitStatusMessage["circuitStatus"] = "opened";
  lastCircuitStatusChangeTimestamp: Date = new Date();
  countdownMode: CountdownMode = "on-exit";
  position: Position = "unset";

  constructor(deviceId: DeviceId) {
    super();
    this.deviceId = deviceId;
  }

  setConnectionStatus(
    connectionStatus: MqttConnectionStatusMessage["connectionStatus"]
  ) {
    this.connectionStatus = connectionStatus;
    this.emit("connection-status-change", this);
  }

  setCircuitStatus(
    circuitStatus: MqttCircuitStatusMessage["circuitStatus"],
    timestamp: Date
  ) {
    this.circuitStatus = circuitStatus;
    this.lastCircuitStatusChangeTimestamp = timestamp;
    this.emit("circuit-status-change", this);
  }

  setCountdownMode(countdownMode: CountdownMode) {
    this.countdownMode = countdownMode;
    this.emit("countdown-mode-change", this);
  }

  setPosition(position: Position) {
    this.position = position;
    this.emit("position-change", this);
  }

  plain(): PlainGate {
    return {
      deviceId: this.deviceId,
      connectionStatus: this.connectionStatus,
      circuitStatus: this.circuitStatus,
      lastCircuitStatusChangeTimestamp: this.lastCircuitStatusChangeTimestamp,
      countdownMode: this.countdownMode,
      position: this.position,
    };
  }
}
