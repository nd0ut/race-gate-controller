import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  MQTT_SERVER: z.string().ip().or(z.literal("auto")),
  TELEGRAM_ADMIN_TOKEN: z.string(),
  TELEGRAM_ADMIN_ID: z.string().transform((v) => parseInt(v)),
  MQTT_USERNAME: z.string(),
  MQTT_PASSWORD: z.string(),
  TELEGRAM_EVENT_MANAGER_TOKEN: z.string(),
});

export const env = EnvSchema.parse(process.env);