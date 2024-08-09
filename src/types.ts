import { PlainGate } from "./Gate.ts";

export type GateIntersectionEntry = {
  gate: PlainGate;
  entryTime: Date;
  exitTime: Date;
  duration: number;
};

export type BroadcastDiscoverMessage = {
  deviceId: string,
  mqttServer: string,
  mqttPort: number,
  imageServer: string,
  imagePort: number,
}