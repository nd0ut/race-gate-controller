import { Bot, Context, InlineKeyboard, Keyboard, session } from "grammy";
import { TELEGRAM_EVENT_MANAGER_TOKEN } from "./constants.ts";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { GateManager } from "./GateManager.ts";
import { MqttService } from "./MqttService.ts";
import { Conversation, ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { prisma } from "./prisma.ts";
import { RaceEventManager } from "./RaceEventManager.ts";
import { Menu, MenuRange } from "@grammyjs/menu";
import { markdownEscape } from "./util/markdownEscape.ts";
import { markdownTable } from "markdown-table";
import fs from "fs/promises";
import { format } from "date-fns";
import { groupBy } from "rambda";

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

function formatTable(data: [title: string, value: string][]) {
  return markdownEscape("```\n" + markdownTable([["Property", "Value"], ...data]) + "```\n");
}

function formatCustomTable(data: [title: string, value: string][]) {
  return markdownEscape("```\n" + markdownTable(data) + "```\n");
}

function formatTime(time: Date) {
  return format(time, "HH:mm:ss:SSS");
}

function formatLapTime(lapTime: number) {
  return format(lapTime, "mm:ss:SSS");
}

type ActiveLap = {
  pilot: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
};

type Result = {
  pilot: string;
  finished: boolean;
  startTime: Date;
  endTime: Date | undefined;
  lapTime: number | undefined;
};

const DEMO_FILE_PATH = "./demo.json";
const INITIAL_DEMO_RACE = {
  gates: {
    "GATE-2": {
      type: "start",
      passDetectionMode: "entry",
    },
    "GATE-1": {
      type: "finish",
      passDetectionMode: "exit",
    },
  } as Record<string, { type: "start" | "finish"; passDetectionMode: "entry" | "exit" }>,
  currentLap: undefined as ActiveLap | undefined,
  pilots: [] as string[],
  durationThreshold: 0,
  results: [] as Result[],
  minLapTime: 20000
};

let DEMO_RACE = INITIAL_DEMO_RACE;

const ADMINS = [
  // 441056477,
  194726853,
];

if (
  await fs
    .lstat(DEMO_FILE_PATH)
    .then(() => true)
    .catch(() => false)
) {
  const data = await fs.readFile(DEMO_FILE_PATH, "utf-8");
  try {
    const json = JSON.parse(data);
    DEMO_RACE = json;
    DEMO_RACE.results = DEMO_RACE.results.map((result) => {
      result.startTime = new Date(result.startTime);
      result.endTime = result.endTime ? new Date(result.endTime) : undefined;
      return result;
    });
    DEMO_RACE.currentLap = DEMO_RACE.currentLap
      ? {
          ...DEMO_RACE.currentLap,
          startTime: DEMO_RACE.currentLap.startTime ? new Date(DEMO_RACE.currentLap.startTime) : undefined,
          endTime: DEMO_RACE.currentLap.endTime ? new Date(DEMO_RACE.currentLap.endTime) : undefined,
        }
      : undefined;
  } catch (e) {
    console.error("Error parsing demo file");
  }
}

setInterval(async () => {
  await fs.writeFile(DEMO_FILE_PATH, JSON.stringify(DEMO_RACE));
}, 1000);

export class TelegramDemoBot {
  bot: Bot<MyContext>;

  constructor(
    private gateManager: GateManager,
    private mqttService: MqttService,
    private gateIntersectionDetector: GateIntersectionDetector,
    private raceEventManager: RaceEventManager
  ) {
    this.bot = new Bot(TELEGRAM_EVENT_MANAGER_TOKEN);
  }

  connect() {
    this.bot.use(
      session({
        initial() {
          return {};
        },
      })
    );
    this.bot.use(conversations());
    this.bot.start({});
    this.setupBot();
    this.setupListeners();
    console.log("TelegramDemoBot bot started");
  }

  setupBot() {
    this.bot.api.setMyCommands([
      { command: "start", description: "Старт" },
      { command: "results", description: "Результаты" },
      { command: "all_laps", description: "Все заезды" },
      { command: "last_10_laps", description: "Последние 10 заездов" },
      { command: "add_pilot", description: "Добавить пилота в систему" },
      { command: "remove_pilot", description: "Удалить пилота из системы" },
      { command: "list_pilots", description: "Список пилотов" },
      { command: "set_duration_threshold", description: "Установить порог длительности" },
      { command: "get_duration_threshold", description: "Посмотреть порог длительности" },
    ]);

    const controlKeyboard = new Keyboard().text("Старт").text("Сброс").persistent();

    this.bot.command("start", async (ctx) => {
      await ctx.reply("Привет!", {
        reply_markup: controlKeyboard,
      });
    });

    this.bot.command("results", async (ctx) => {
      const grouped = groupBy((result) => result.pilot, DEMO_RACE.results);
      const result = Object.entries(grouped).map(([pilot, results]) => {
        const finished = results.filter((result) => result.finished);
        const totalLaps = finished.length;
        const bestLap = finished.reduce((acc, result) => {
          if (!acc || result.lapTime! < acc) {
            return result.lapTime!;
          }
          return acc;
        }, 0);
        return [pilot, totalLaps, formatLapTime(bestLap)];
      });
      const table = [["Пилот", "Кругов", "Лучший круг"], ...result];
      const message = formatCustomTable(table as any);
      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
      });
    });

    this.bot.command("all_laps", async (ctx) => {
      const table = [
        ["Пилот", "Старт", "Финиш", "Время круга"],
        ...DEMO_RACE.results
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          .map((result) => [
            result.pilot,
            formatTime(result.startTime),
            result.endTime ? formatTime(result.endTime) : "Не финишировал",
            result.lapTime ? formatLapTime(result.lapTime) : "-",
          ]),
      ];
      const message = formatCustomTable(table as any);
      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
      });
    });

    this.bot.command("last_10_laps", async (ctx) => {
      const table = [
        ["Пилот", "Старт", "Финиш", "Время круга"],
        ...DEMO_RACE.results
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          .slice(-10)
          .map((result) => [
            result.pilot,
            formatTime(result.startTime),
            result.endTime ? formatTime(result.endTime) : "Не финишировал",
            result.lapTime ? formatLapTime(result.lapTime) : "-",
          ]),
      ];
      const message = formatCustomTable(table as any);
      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
      });
    });

    this.bot.command("list_pilots", async (ctx) => {
      const message = formatTable(DEMO_RACE.pilots.map((pilot) => ["Идентификатор", pilot]));

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
      });
    });

    const addPilotConversation = async (conversation: MyConversation, ctx: MyContext) => {
      await ctx.reply("Введите идентификатор пилота");
      const { message } = await conversation.wait();
      if (!message?.text) return;
      const pilotId = message.text;
      if (DEMO_RACE.pilots.includes(pilotId)) {
        await ctx.reply("Пилот уже есть в системе");
        return;
      }
      DEMO_RACE.pilots.push(pilotId);
      await ctx.reply(`Пилот "${pilotId}" добавлен в систему`);
    };

    const setDurationThresholdConversation = async (conversation: MyConversation, ctx: MyContext) => {
      await ctx.reply("Введите порог длительности в миллисекундах");
      const { message } = await conversation.wait();
      if (!message?.text) return;
      const durationThreshold = parseInt(message.text);
      if (isNaN(durationThreshold)) {
        await ctx.reply("Неверное значение порога длительности");
        return;
      }
      DEMO_RACE.durationThreshold = durationThreshold;
      await ctx.reply(`Порог длительности установлен на ${durationThreshold} мc`);
    };

    this.bot.use(createConversation(addPilotConversation));
    this.bot.use(createConversation(setDurationThresholdConversation));

    this.bot.command("add_pilot", async (ctx) => {
      await ctx.conversation.enter("addPilotConversation");
    });

    const removePilotMenu = new Menu("remove-pilot-menu").dynamic(() => {
      const range = new MenuRange();
      DEMO_RACE.pilots.forEach((pilot) => {
        range
          .text(pilot, async (ctx) => {
            DEMO_RACE.pilots = DEMO_RACE.pilots.filter((pilot) => pilot !== pilot);
            await ctx.reply(`Пилот "${pilot}" удален из системы`);
            await ctx.menu.close();
          })
          .row();
      });
      return range;
    });

    this.bot.use(removePilotMenu);

    this.bot.command("remove_pilot", async (ctx) => {
      await ctx.reply("Выберите пилота", {
        reply_markup: removePilotMenu,
      });
    });

    this.bot.command("set_duration_threshold", async (ctx) => {
      await ctx.conversation.enter("setDurationThresholdConversation");
    });

    this.bot.command("get_duration_threshold", async (ctx) => {
      await ctx.reply(`Порог длительности: ${DEMO_RACE.durationThreshold} мс`);
    });

    const startPilotsMenu = new Menu("start-pilots-menu").dynamic(() => {
      const range = new MenuRange();
      DEMO_RACE.pilots.forEach((pilot) => {
        range
          .text(pilot, async (ctx) => {
            DEMO_RACE.currentLap = {
              pilot,
              startTime: undefined,
              endTime: undefined,
            };
            await ctx.reply(`Пилот"${pilot}" готов к старту`);
          })
          .row();
      });
      return range;
    });

    this.bot.use(startPilotsMenu);

    this.bot.hears("Старт", async (ctx) => {
      if (DEMO_RACE.currentLap) {
        await ctx.reply("На дистанции уже есть пилот");
        return;
      }
      if (DEMO_RACE.pilots.length === 0) {
        await ctx.reply("В системе нет пилотов");
        return;
      }
      await ctx.reply("Выберите пилота", {
        reply_markup: startPilotsMenu,
      });
    });
    this.bot.hears("Сброс", async (ctx) => {
      if (!DEMO_RACE.currentLap) {
        await ctx.reply("На дистанции нет пилота");
        return;
      }
      const currentLap = DEMO_RACE.currentLap;
      if (currentLap.startTime) {
        const result: Result = {
          pilot: currentLap.pilot,
          finished: false,
          startTime: currentLap.startTime,
          endTime: undefined,
          lapTime: undefined,
        };
        DEMO_RACE.results.push(result);
      }
      DEMO_RACE.currentLap = undefined;
      await ctx.reply("Дистанция сброшена");
    });

    this.bot.command("reset", async (ctx) => {
      DEMO_RACE = INITIAL_DEMO_RACE;
      await ctx.reply("Состояние демо гонки сброшено");
    });
  }

  setupListeners() {
    this.gateIntersectionDetector.on("gate-intersection", async (entry) => {
      if (!DEMO_RACE.currentLap) {
        return;
      }
      const currentLap = DEMO_RACE.currentLap;
      const gateSettings = DEMO_RACE.gates[entry.gate.deviceId];

      if (entry.duration < DEMO_RACE.durationThreshold) {
        return;
      }

      if (gateSettings.type === "start") {
        if (currentLap.startTime || currentLap.endTime) {
          return;
        }
        currentLap.startTime = gateSettings.passDetectionMode === "entry" ? entry.entryTime : entry.exitTime;
        for (const id of ADMINS) {
          await this.bot.api.sendMessage(
            id,
            `
Пилот "${currentLap.pilot}" стартовал.
Время старта ${formatTime(currentLap.startTime!)}`
          );
        }
      }
      if (gateSettings.type === "finish") {
        if (!currentLap.startTime || currentLap.endTime) {
          return;
        }
        const endTime = gateSettings.passDetectionMode === "entry" ? entry.entryTime : entry.exitTime;
        const lapTime = endTime.getTime() - currentLap.startTime.getTime();
        if (lapTime < DEMO_RACE.minLapTime) {
          return;
        }

        currentLap.endTime = gateSettings.passDetectionMode === "entry" ? entry.entryTime : entry.exitTime;
        console.log(currentLap);
        for (const id of ADMINS) {
          await this.bot.api.sendMessage(
            id,
            `
Пилот "${currentLap.pilot}" финишировал. 
Время финиша: ${formatTime(currentLap.endTime)}.
Время круга: ${formatLapTime(currentLap.endTime.getTime() - currentLap.startTime!.getTime())}
          `
          );
        }
      }
      if (currentLap.startTime && currentLap.endTime) {
        const lapTime = currentLap.endTime.getTime() - currentLap.startTime.getTime();
        const result: Result = {
          pilot: currentLap.pilot,
          finished: true,
          startTime: currentLap.startTime,
          endTime: currentLap.endTime,
          lapTime,
        };
        DEMO_RACE.results.push(result);
        DEMO_RACE.currentLap = undefined;
        for (const id of ADMINS) {
          this.bot.api.sendMessage(id, `Результат зафиксирован.`);
        }
      }
    });
  }

  destroy() {
    this.bot.stop();
    console.log("TelegramDemoBot bot stopped");
  }
}
