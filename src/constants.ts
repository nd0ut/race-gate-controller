import { env } from "./env.ts";
import { getLocalAddress } from "./util/getLocalAddress.ts";

export const DEVICE_ID = "GATE-CONTROLLER-1";
export const BROADCAST_PORT = 8266;

export const MQTT_SERVER =
  env.MQTT_SERVER === "auto" ? getLocalAddress() : env.MQTT_SERVER;

export const MQTT_PORT = 1883;
export const MQTT_USERNAME = env.MQTT_USERNAME
export const MQTT_PASSWORD = env.MQTT_PASSWORD;
export const MQTT_GATES_STATUS_TOPIC = "gates/status";
export const MQTT_GATES_SWITCH_TOPIC = "gates/switch";

export const TELEGRAM_ADMIN_TOKEN = env.TELEGRAM_ADMIN_TOKEN;
export const TELEGRAM_ADMIN_ID = env.TELEGRAM_ADMIN_ID;
export const TELEGRAM_EVENT_MANAGER_TOKEN = env.TELEGRAM_EVENT_MANAGER_TOKEN;

export const BroadcastAction = {
  DISCOVER: 0,
} as const;
