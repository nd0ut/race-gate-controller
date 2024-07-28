import { Bot, Context, session } from "grammy";
import { TELEGRAM_EVENT_MANAGER_TOKEN } from "./constants.ts";
import { GateIntersectionDetector } from "./GateIntersectionDetector.ts";
import { GateManager } from "./GateManager.ts";
import { MqttService } from "./MqttService.ts";
import {
  Conversation,
  ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { prisma } from "./prisma.ts";
import { RaceEventManager } from "./RaceEventManager.ts";
import { Menu } from "@grammyjs/menu";

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

export class TelegramRaceEventBot {
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
    this.bot.start();
    this.setupBot();
    this.setupListeners();
    console.log("TelegramEventManagerBot bot started");
  }

  setupBot() {
    this.bot.api.setMyCommands([{ command: "start", description: "Старт" }]);
    const registerConversation = async (
      conversation: MyConversation,
      ctx: MyContext
    ) => {
      const activeRace = await this.raceEventManager.getActiveRace();
      if (!activeRace) {
        await ctx.reply("К сожалению, сейчас нет активных гонок.");
        return;
      }
      const userId = (await ctx.getAuthor()).user.id;
      const user = await prisma.user.findUnique({
        where: { telegramUserId: userId },
      });
      if (user) {
        await prisma.user.update({
          where: { telegramUserId: userId },
          data: { events: { connect: { id: activeRace.id } } },
        });
        await ctx.reply(
          `Я тебя уже знаю, ${user.name}, ты успешно зарегистрирован.`
        );
        return;
      }
      await ctx.reply("Как тебя идентифицировать?");
      const { message } = await conversation.wait();
      if (!message?.text) return;
      await prisma.user.create({
        data: {
          telegramUserId: (await ctx.getAuthor()).user.id,
          name: message.text,
          events: { connect: { id: activeRace.id } },
        },
      });
      await ctx.reply("Приятно познакомиться! Ты успешно зарегистрирован.");
    };

    this.bot.use(createConversation(registerConversation));

    const registerConfirmMenu = new Menu<MyContext>("want-register-menu")
      .text("Да", async (ctx) => {
        await ctx.conversation.enter("registerConversation");
        await ctx.menu.close();
      })
      .text("Нет", async (ctx) => {
        await ctx.reply("Хорошо, если передумаешь, напиши /start");
        await ctx.menu.close();
      });

    this.bot.use(registerConfirmMenu);

    this.bot.command("start", async (ctx) => {
      {
        const activeRace = await this.raceEventManager.getActiveRace();
        if (!activeRace) {
          await ctx.reply("Привет! К сожалению, сейчас нет активных гонок.");
          return;
        }
        const userId = (await ctx.getAuthor()).user.id;
        if (activeRace.users.find((u) => u.telegramUserId === userId)) {
          await ctx.reply("Ты уже зарегистрирован.");
          return;
        }
        await ctx.reply(
          `Привет! Сейчас идет гонка "${activeRace.name}". Хочешь зарегистрироваться?`,
          {
            reply_markup: registerConfirmMenu,
          }
        );
      }
    });
  }

  setupListeners() {}

  destroy() {
    this.bot.stop();
    console.log("TelegramEventManagerBot bot stopped");
  }
}
