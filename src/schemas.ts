import { z } from "zod";
import { BroadcastAction } from "./constants.ts";
import { time } from "console";

export const DeviceIdSchema = z.string().brand("DeviceId");
export type DeviceId = z.infer<typeof DeviceIdSchema>;

export const BroadcastMessageSchema = z.object({
  deviceId: DeviceIdSchema,
  unicastPort: z.number(),
  action: z.nativeEnum(BroadcastAction),
});
export type BroadcastMessage = z.infer<typeof BroadcastMessageSchema>;

export const MqttConnectionStatusMessageSchema = z.object({
  deviceId: DeviceIdSchema,
  connectionStatus: z.enum(["online", "offline"]),
});
export type MqttConnectionStatusMessage = z.infer<
  typeof MqttConnectionStatusMessageSchema
>;

export const MqttCircuitStatusMessageSchema = z.object({
  deviceId: DeviceIdSchema,
  circuitStatus: z.enum(["opened", "closed"]),
  timestamp: z
    .string()
    .datetime()
    .transform((timestamp) => new Date(timestamp)),
});
export type MqttCircuitStatusMessage = z.infer<
  typeof MqttCircuitStatusMessageSchema
>;
