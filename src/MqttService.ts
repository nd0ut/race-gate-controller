import EventEmitter from "events";
import { connect, MqttClient } from "mqtt";
import { MQTT_GATES_STATUS_TOPIC, MQTT_GATES_SWITCH_TOPIC, MQTT_PORT, MQTT_SERVER } from "./constants.ts";
import {
  MqttConnectionStatusMessage,
  MqttConnectionStatusMessageSchema,
  MqttCircuitStatusMessage,
  MqttCircuitStatusMessageSchema,
} from "./schemas.ts";
import { safeJsonParse } from "./util/safeJsonParse.ts";

type EventMap = {
  "gate-connection-status": [MqttConnectionStatusMessage];
  "gate-circuit-status": [MqttCircuitStatusMessage];
};

export class MqttService extends EventEmitter<EventMap> {
  client: MqttClient;

  constructor() {
    super();

    const url = `mqtt://${MQTT_SERVER}:${MQTT_PORT}`;
    this.client = connect(url, {
      manualConnect: true,
      clientId: "GATE_CONTROLLER",
    });

    this.client.on("error", (err) => {
      console.log("Failed to connect to MQTT server:", err);
      this.client.end();
    });

    this.client.on("connect", () => {
      console.log("MQTT client connected");

      const handleError = (err: Error | null) => {
        if (!err) return;
        console.log("MQTT subscription error:", err);
      };

      this.client.subscribe(MQTT_GATES_STATUS_TOPIC, handleError);
      this.client.subscribe(MQTT_GATES_SWITCH_TOPIC, handleError);
    });

    this.client.on("message", (topic, message) => {
      const jsonMessage = safeJsonParse(message.toString());
      if (!jsonMessage) {
        console.log("Error parsing MQTT message as JSON");
        console.log("Message:", message.toString());
        return;
      }
      
      console.log("Received MQTT message:", jsonMessage);

      if (topic === MQTT_GATES_STATUS_TOPIC) {
        const { data, error } = MqttConnectionStatusMessageSchema.safeParse(jsonMessage);
        if (error) {
          console.log("Error parsing MQTT message:", error);
          console.log("Message:", message.toString());
        } else {
          this.emit("gate-connection-status", data);
        }
      }

      if (topic === MQTT_GATES_SWITCH_TOPIC) {
        const { data, error } = MqttCircuitStatusMessageSchema.safeParse(jsonMessage);
        if (error) {
          console.log("Error parsing MQTT message:", error);
          console.log("Message:", message.toString());
        } else {
          this.emit("gate-circuit-status", data);
        }
      }
    });

    this.client.on("disconnect", () => {
      console.log("MQTT client disconnected");
    });
  }

  connect() {
    this.client.connect();
  }

  destroy() {
    this.client.end();
    console.log("MQTT client disconnected");
  }
}
