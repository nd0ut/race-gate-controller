import { BroadcastService } from "./BroadcastService.ts";
import { DbManager } from "./DbManager.ts";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { GateManager } from "./GateManager.ts";
import { ImageReceiver } from "./ImageReceiver.ts";
import { MqttService } from "./MqttService.ts";
import { RaceEventManager } from "./RaceEventManager.ts";
import { TelegramAdminBot } from "./TelegramAdminBot.ts";
import { TelegramRaceEventBot } from "./TelegramRaceEventBot.ts";
import { TelegramDemoBot } from "./TelegramDemoBot.ts";

export class Server {
  broadcastService: BroadcastService;
  mqttService: MqttService;
  gateManager: GateManager;
  telegramAdminBot: TelegramAdminBot;
  gateIntersectionDetector: GateIntersectionDetector;
  telegramEventBot: TelegramRaceEventBot;
  dbManager: DbManager;
  raceEventManager: RaceEventManager;
  imageReceiver: ImageReceiver;
  telegramDemoBot: TelegramDemoBot;

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
    this.telegramDemoBot = new TelegramDemoBot(
      this.gateManager,
      this.mqttService,
      this.gateIntersectionDetector,
      this.raceEventManager
    );
    this.imageReceiver = new ImageReceiver();
  }

  start() {
    // this.telegramAdminBot.connect();
    // this.telegramEventBot.connect();
    this.telegramDemoBot.connect();
    this.broadcastService.listen();
    this.mqttService.connect();
    this.imageReceiver.start();
  }

  stop() {
    this.telegramEventBot.destroy();
    this.telegramAdminBot.destroy();
    this.telegramDemoBot.destroy();
    this.broadcastService.destroy();
    this.mqttService.destroy();
    this.imageReceiver.destroy();
  }
}
