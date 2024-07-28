import { Bot } from "grammy";
import { TELEGRAM_ADMIN_ID, TELEGRAM_ADMIN_TOKEN } from "./constants.ts";
import { GateManager } from "./GateManager.ts";
import { MqttService } from "./MqttService.ts";
import { Menu, MenuRange } from "@grammyjs/menu";
import { markdownEscape } from "./util/markdownEscape.ts";
import { markdownTable } from "markdown-table";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { RaceEventManager } from "./RaceEventManager.ts";
import { prisma } from "./prisma.ts";

function formatTable(data: [title: string, value: string][]) {
  return markdownEscape(
    "```\n" + markdownTable([["Property", "Value"], ...data]) + "```\n"
  );
}

export class TelegramAdminBot {
  bot: Bot;

  constructor(
    private gateManager: GateManager,
    private mqttService: MqttService,
    private gateIntersectionDetector: GateIntersectionDetector,
    private raceEventManager: RaceEventManager
  ) {
    this.bot = new Bot(TELEGRAM_ADMIN_TOKEN);
  }

  connect() {
    this.bot.start();
    this.setupBot();
    this.setupListeners();
    console.log("TelegramAdminBot bot started");
  }

  setupBot() {
    this.bot.api.setMyCommands([
      { command: "gates", description: "List all gates" },
      { command: "start_race", description: "Start race" },
      { command: "stop_active_race", description: "Stop active race" },
    ]);

    const gatesMenu = new Menu("gates-menu").dynamic((ctx, range) => {
      for (const gate of this.gateManager.getAllGates()) {
        range.submenu(
          {
            text: gate.deviceId,
            payload: gate.deviceId,
          },
          "gate-edit-menu"
        );
      }
      return range;
    });

    gatesMenu.register(
      new Menu("gate-edit-menu")
        .submenu(
          {
            text: "Set position",
            payload: (ctx) => ctx.match as string,
          },
          "gate-position-menu"
        )
        .submenu(
          {
            text: "Set countdown mode",
            payload: (ctx) => ctx.match as string,
          },
          "gate-countdown-menu"
        )
    );

    gatesMenu.register(
      new Menu("gate-position-menu")
        .text(
          {
            text: "Start",
            payload: (ctx) => ctx.match as string,
          },
          (ctx) => {
            const deviceId = ctx.match;
            const gate = this.gateManager.getGate(deviceId);
            gate.setPosition("start");
            ctx.reply(`Gate ${deviceId} position set to "start"`);
            ctx.menu.close();
          }
        )
        .text(
          {
            text: "Finish",
            payload: (ctx) => ctx.match as string,
          },
          (ctx) => {
            const deviceId = ctx.match;
            const gate = this.gateManager.getGate(deviceId);
            gate.setPosition("finish");
            ctx.reply(`Gate ${deviceId} position set to "finish"`);
            ctx.menu.close();
          }
        )
    );

    gatesMenu.register(
      new Menu("gate-countdown-menu")
        .text(
          {
            text: "On entry",
            payload: (ctx) => ctx.match as string,
          },
          (ctx) => {
            const deviceId = ctx.match;
            const gate = this.gateManager.getGate(deviceId);
            gate.setCountdownMode("on-entry");
            ctx.reply(`Gate ${deviceId} countdown mode set to "on-entry"`);
            ctx.menu.close();
          }
        )
        .text(
          {
            text: "On exit",
            payload: (ctx) => ctx.match as string,
          },
          (ctx) => {
            const deviceId = ctx.match;
            const gate = this.gateManager.getGate(deviceId);
            gate.setCountdownMode("on-exit");
            ctx.reply(`Gate ${deviceId} countdown mode set to "on-exit"`);
            ctx.menu.close();
          }
        )
    );

    this.bot.use(gatesMenu);

    this.bot.command("start_race", async (ctx) => {
      const activeRace = await this.raceEventManager.getActiveRace();
      if (activeRace) {
        await ctx.reply(
          `Найдена активная гонка: "${activeRace.name}". Создать новую невозможно.`
        );
        return;
      }
      const newRace = await this.raceEventManager.createNewRace();
      await ctx.reply(`Создана новая гонка: "${newRace.name}"`);
    });

    this.bot.command("stop_active_race", async (ctx) => {
      const activeRace = await this.raceEventManager.getActiveRace();
      if (!activeRace) {
        await ctx.reply(
          `Активная гонка не найдена. Создать новую можно с помощью команды /start_race`
        );
        return;
      }
      prisma.raceEvent.update({
        where: { id: activeRace.id },
        data: { isActive: false },
      });
      await ctx.reply(
        `Гонка "${activeRace.name}" завершена. Создать новую можно с помощью команды /start_race`
      );
    });

    this.bot.command("gates", async (ctx) => {
      const count = this.gateManager.getGatesCount();
      if (count === 0) {
        await ctx.reply("No gates found");
        return;
      }

      await ctx.reply(`Found gates: ${count}`);

      for (const gate of this.gateManager.getAllGates()) {
        const message = formatTable([
          ["Gate ID", gate.deviceId],
          ["Connection status", gate.connectionStatus],
          ["Circuit status", gate.circuitStatus],
          [
            "Last circuit status change",
            gate.lastCircuitStatusChangeTimestamp.toISOString(),
          ],
          ["Countdown mode", gate.countdownMode],
          ["Position", gate.position],
        ]);

        await ctx.reply(message, {
          parse_mode: "MarkdownV2",
        });
      }

      await ctx.reply("Choose gate to set position", {
        reply_markup: gatesMenu,
      });
    });
  }

  setupListeners() {
    this.gateManager.on("gate-connection-status-change", (gate) => {
      this.log(`Gate ${gate.deviceId} is ${gate.connectionStatus}`);
    });

    this.gateIntersectionDetector.on("gate-intersection", (entry) => {
      this.log(
        "*Gate intersection detected*\n" +
          formatTable([
            ["Gate ID", entry.gate.deviceId],
            ["Gate position", entry.gate.position],
            ["Gate countdown mode", entry.gate.countdownMode],
            ["Entry time", entry.entryTime.toISOString()],
            ["Exit time", entry.exitTime.toISOString()],
            ["Duration", `${entry.duration} ms`],
          ]),
        {
          parse_mode: "MarkdownV2",
        }
      );
    });
  }

  destroy() {
    this.bot.stop();
    console.log("TelegramAdminBot stopped");
  }

  log(
    message: string,
    options: Parameters<typeof this.bot.api.sendMessage>["2"] = {}
  ) {
    this.bot.api.sendMessage(TELEGRAM_ADMIN_ID, message, options);
  }
}
