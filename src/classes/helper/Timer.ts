import { formatNanosecondsToHumanTime } from "#utility/functions/formatting/time";

/**
 * This class allows us to see how long it takes something to happen.
 *
 * The class will measure the time in nano seconds and then round.
 */
export class Timer {
  private startTime: bigint | undefined;
  private endTime: bigint | undefined;

  constructor(start?: boolean) {
    if (start) {
      this.start();
    }
  }

  public start() {
    this.startTime = process.hrtime.bigint();
  }

  public end() {
    this.endTime = process.hrtime.bigint();

    if (!this.startTime) {
      throw new Error("Timer has not been started yet!");
    }

    return formatNanosecondsToHumanTime(this.endTime - this.startTime);
  }
}
