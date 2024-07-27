import { BroadcastService } from "./BroadcastService.ts";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { GateManager } from "./GateManager.ts";
import { MqttService } from "./MqttService.ts";
import { TelegramAdminService } from "./TelegramAdminService.ts";

export class Server {
  broadcastService: BroadcastService;
  mqttService: MqttService;
  gateManager: GateManager;
  telegramAdminService: TelegramAdminService;
  gateIntersectionDetector: GateIntersectionDetector;

  constructor() {
    this.broadcastService = new BroadcastService();
    this.mqttService = new MqttService();
    this.gateManager = new GateManager(this.mqttService);
    this.gateIntersectionDetector = new GateIntersectionDetector(
      this.gateManager
    );
    this.telegramAdminService = new TelegramAdminService({
      gateManager: this.gateManager,
      mqttService: this.mqttService,
      gateIntersectionDetector: this.gateIntersectionDetector,
    });
  }

  start() {
    this.telegramAdminService.connect();
    this.broadcastService.listen();
    this.mqttService.connect();
  }

  stop() {
    this.telegramAdminService.destroy();
    this.broadcastService.destroy();
    this.mqttService.destroy();
  }
}
