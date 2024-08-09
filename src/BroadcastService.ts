import {
  BROADCAST_PORT,
  BroadcastAction,
  DEVICE_ID,
  IMAGE_SERVER_PORT,
  MQTT_PORT,
  MQTT_SERVER,
} from "./constants.ts";
import dgram from "dgram";
import { BroadcastMessage, BroadcastMessageSchema } from "./schemas.ts";
import EventEmitter from "events";
import { BroadcastDiscoverMessage } from "./types.ts";
import { getLocalAddress } from "./util/getLocalAddress.ts";

export class BroadcastService extends EventEmitter {
  socket: dgram.Socket;

  constructor() {
    super();

    this.socket = dgram.createSocket("udp4");
  }

  listen() {
    this.socket.on("listening", () => {
      const address = this.socket.address();
      console.log(
        "UDP socket listening on " + address.address + ":" + address.port
      );
    });

    this.socket.on("message", (message, remote) => {
      try {
        const json = JSON.parse(message.toString());
        const result = BroadcastMessageSchema.parse(json);
        this.handleMessage(result, remote);
      } catch (err) {
        console.log("Error parsing message:", err);
      }
    });

    this.socket.bind(BROADCAST_PORT);
  }

  handleMessage(message: BroadcastMessage, remote: dgram.RemoteInfo) {
    console.log("Received message from", remote.address, message);

    const { action } = message;
    if (action === BroadcastAction.DISCOVER) {
      const response: BroadcastDiscoverMessage = {
        deviceId: DEVICE_ID,
        mqttServer: MQTT_SERVER,
        mqttPort: MQTT_PORT,
        imageServer: getLocalAddress(),
        imagePort: IMAGE_SERVER_PORT,
      };
      const json = JSON.stringify(response);
      this.socket.send(json, message.unicastPort, remote.address);
    }
  }

  destroy() {
    this.socket.close();
    console.log("UDP socket closed");
  }
}
