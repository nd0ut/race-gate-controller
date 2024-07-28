import { BroadcastService } from "./BroadcastService.ts";
import { DbManager } from "./DbManager.ts";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { GateManager } from "./GateManager.ts";
import { MqttService } from "./MqttService.ts";
import { RaceEventManager } from "./RaceEventManager.ts";
import { TelegramAdminBot } from "./TelegramAdminBot.ts";
import { TelegramRaceEventBot } from "./TelegramRaceEventBot.ts";

export class Server {
  broadcastService: BroadcastService;
  mqttService: MqttService;
  gateManager: GateManager;
  telegramAdminBot: TelegramAdminBot;
  gateIntersectionDetector: GateIntersectionDetector;
  telegramEventBot: TelegramRaceEventBot;
  dbManager: DbManager;
  raceEventManager: RaceEventManager;

  constructor() {
    this.raceEventManager = new RaceEventManager();
    this.dbManager = new DbManager();
    this.broadcastService = new BroadcastService();
    this.mqttService = new MqttService();
    this.gateManager = new GateManager(this.mqttService);
    this.gateIntersectionDetector = new GateIntersectionDetector(
      this.gateManager
    );
    this.telegramAdminBot = new TelegramAdminBot(
      this.gateManager,
      this.mqttService,
      this.gateIntersectionDetector,
      this.raceEventManager
    );
    this.telegramEventBot = new TelegramRaceEventBot(
      this.gateManager,
      this.mqttService,
      this.gateIntersectionDetector,
      this.raceEventManager
    );
  }

  start() {
    this.telegramAdminBot.connect();
    this.telegramEventBot.connect();
    this.broadcastService.listen();
    this.mqttService.connect();
  }

  stop() {
    this.telegramEventBot.destroy();
    this.telegramAdminBot.destroy();
    this.broadcastService.destroy();
    this.mqttService.destroy();
  }
}
