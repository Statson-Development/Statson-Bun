import { wait } from "#utility/functions/other/wait";

/**
 * Queuer is a utility class for rate limiting and queuing asynchronous functions.
 * It ensures that a specified number of requests can be processed within a given time frame.
 *
 * @example
 * const queue = new Queuer(5, 100); // allows 5 requests per 100 milliseconds
 * for (let i = 0; i < 10; i++) {
 *   queue.addToQueue(() => someAsyncFunction(`Request ${i + 1}`));
 * }
 */
export default class Queuer {
    /** The queue of functions to be processed. */
    private queue: (() => Promise<void>)[];
  
    /** The maximum number of requests that can be processed in the given time frame. */
    private maxRequests?: number;
  
    /** The time frame in milliseconds in which maxRequests can be processed. */
    private timeFrame?: number;
  
    /** Flag to indicate whether the queue is currently being processed. */
    private isProcessing: boolean;
  
    /**
     * Creates an instance of QueueHelper.
     * @param maxRequests - The maximum number of requests per time frame.
     * @param timeFrame - The time frame in milliseconds for maxRequests.
     */
    constructor(maxRequests?: number, timeFrame?: number) {
      this.queue = [];
      this.maxRequests = maxRequests;
      this.timeFrame = timeFrame;
      this.isProcessing = false;
    }
  
    /**
     * Adds an asynchronous function to the queue.
     * If the queue is not currently processing, it starts processing the queue.
     *
     * @param func - The asynchronous function to add to the queue.
     */
    public addToQueue(func: () => Promise<void>): void {
      this.queue.push(func);
      if (!this.isProcessing) {
        this.processQueue();
      }
    }
  
    /**
     * Processes functions in the queue sequentially.
     * If maxRequests and timeFrame are set, it ensures that only maxRequests are processed per timeFrame.
     */
    private async processQueue(): Promise<void> {
      this.isProcessing = true;
  
      while (this.queue.length > 0) {
        const func = this.queue.shift();
        if (func) {
          await func();
        }
  
        if (this.maxRequests && this.timeFrame) {
          await wait(this.timeFrame / this.maxRequests);
        }
      }
  
      this.isProcessing = false;
    }
  }
  