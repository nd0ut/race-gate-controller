import { PlainGate } from "./Gate.ts";

export type GateIntersectionEntry = {
  gate: PlainGate;
  entryTime: Date;
  exitTime: Date;
  duration: number;
};