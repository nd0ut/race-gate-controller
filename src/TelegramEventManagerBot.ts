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

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

export class TelegramEventManagerBot {
  bot: Bot<MyContext>;
  gateManager: GateManager;
  mqttService: MqttService;
  gateIntersectionDetector: GateIntersectionDetector;

  constructor({
    gateManager,
    mqttService,
    gateIntersectionDetector,
  }: {
    gateManager: GateManager;
    mqttService: MqttService;
    gateIntersectionDetector: GateIntersectionDetector;
  }) {
    this.bot = new Bot(TELEGRAM_EVENT_MANAGER_TOKEN);
    this.gateManager = gateManager;
    this.mqttService = mqttService;
    this.gateIntersectionDetector = gateIntersectionDetector;
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
    async function greeting(conversation: MyConversation, ctx: MyContext) {
      const userId = (await ctx.getAuthor()).user.id;
      const user = await prisma.user.findUnique({
        where: { telegramUserId: userId },
      });
      if (user) {
        await ctx.reply(`Привет! Я тебя уже знаю, ${user.name}!`);
        return;
      }
      await ctx.reply("Привет! Как тебя идентифицировать?");
      const { message } = await conversation.wait();
      if (!message?.text) return;
      await prisma.user.create({
        data: {
          telegramUserId: (await ctx.getAuthor()).user.id,
          name: message.text,
        },
      });
      await ctx.reply("Приятно познакомиться! Ты успешно зарегистрирован.");
    }

    this.bot.use(createConversation(greeting));

    this.bot.command("start", async (ctx) => {
      await ctx.conversation.enter("greeting");
    });
  }

  setupListeners() {}

  destroy() {
    this.bot.stop();
    console.log("TelegramEventManagerBot bot stopped");
  }
}
