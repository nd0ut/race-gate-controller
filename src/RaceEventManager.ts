import { RaceEvent } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EventEmitter } from "events";
import { prisma } from "./prisma.ts";

type EventMap = {
  "race-created": [RaceEvent];
  "race-finished": [RaceEvent];
};

export class RaceEventManager extends EventEmitter<EventMap> {
  constructor() {
    super();
  }

  async getActiveRace() {
    const activeRace = await prisma.raceEvent.findFirst({
      where: {
        isActive: true,
      },
      include: {
        users: true,
      }
    });
    return activeRace;
  }

  async createNewRace() {
    const activeRace = await this.getActiveRace();
    if (activeRace) {
      throw new Error(
        `Impossible to create new race while there is an active one: ${activeRace.name}`
      );
    }
    const newRace = await prisma.raceEvent.create({
      data: {
        name: `Трек день ${format(new Date(), "dd.MM.yyyy", { locale: ru })}`,
        isActive: true,
      },
    });

    this.emit("race-created", newRace);
    return newRace;
  }

  async finishActiveRace() {
    const activeRace = await this.getActiveRace();
    if (!activeRace) {
      throw new Error("There is no active race to finish");
    }
    const finishedRace = await prisma.raceEvent.update({
      where: {
        id: activeRace.id,
      },
      data: {
        isActive: false,
      },
    });

    this.emit("race-finished", finishedRace);
    return finishedRace;
  }
}
