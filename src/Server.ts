import { BroadcastService } from "./BroadcastService.ts";
import { DbManager } from "./DbManager.ts";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { GateManager } from "./GateManager.ts";
import { MqttService } from "./MqttService.ts";
import { TelegramAdminBot } from "./TelegramAdminBot.ts";
import { TelegramEventManagerBot } from "./TelegramEventManagerBot.ts";

export class Server {
  broadcastService: BroadcastService;
  mqttService: MqttService;
  gateManager: GateManager;
  telegramAdminBot: TelegramAdminBot;
  gateIntersectionDetector: GateIntersectionDetector;
  telegramEventManagerBot: TelegramEventManagerBot;
  dbManager: DbManager;

  constructor() {
    this.dbManager = new DbManager();
    this.broadcastService = new BroadcastService();
    this.mqttService = new MqttService();
    this.gateManager = new GateManager(this.mqttService);
    this.gateIntersectionDetector = new GateIntersectionDetector(
      this.gateManager
    );
    this.telegramAdminBot = new TelegramAdminBot({
      gateManager: this.gateManager,
      mqttService: this.mqttService,
      gateIntersectionDetector: this.gateIntersectionDetector,
    });
    this.telegramEventManagerBot = new TelegramEventManagerBot({
      gateManager: this.gateManager,
      mqttService: this.mqttService,
      gateIntersectionDetector: this.gateIntersectionDetector,
    });
  }

  start() {
    this.telegramAdminBot.connect();
    this.telegramEventManagerBot.connect();
    this.broadcastService.listen();
    this.mqttService.connect();
  }

  stop() {
    this.telegramEventManagerBot.destroy();
    this.telegramAdminBot.destroy();
    this.broadcastService.destroy();
    this.mqttService.destroy();
  }
}
