import taskModel, { Task } from "#utility/schemas/task.model";
import type { Awaitable } from "src/typescript/types/Awaitable";
import getFutureTimestamp from "#utility/functions/helper/getFutureTimestamp";
import type { Types } from "mongoose";

/**
 * The Scheduler class provides a custom implementation of task scheduling, similar to Agenda.
 * It is designed to work in environments where Agenda is not compatible, such as Statson.
 * This class manages the scheduling and execution of tasks, ensuring that they are persisted
 * in the database to avoid missing any scheduled tasks. Note that the Scheduler will not
 * execute tasks when running in development mode.
 */
export default class Scheduler {
  /**
   * A map of task presets that can be scheduled and executed by the Scheduler.
   */
  private taskPresets: Map<string, SchedulerTaskPreset>;
  private timeouts: Map<Types.ObjectId, NodeJS.Timeout> = new Map();
  /**
   * Weather the tasks have been loaded yet.
   */
  private loadedTasks = false;

  /**
   * Initializes a new instance of the Scheduler class with the specified options.
   * @param options The configuration options for the Scheduler, including task presets.
   */
  constructor(options: SchedulerOptions) {
    this.taskPresets = new Map(options.taskPresets);
  }

  /**
   * Loads all tasks from the database into memory and schedules them for execution.
   * Tasks that are overdue will be executed immediately.
   */
  public async loadTasks() {
    if (this.loadedTasks) {
      return;
    } else {
      this.loadedTasks = true;
    }

    const tasks = await taskModel.find();

    for (const task of tasks) {
      const taskPreset = this.taskPresets.get(task.name);

      if (!taskPreset) {
        throw new Error(`Task preset '${task.name}' does not exist.`);
      }

      if (task.runAt < Date.now()) {
        await this.runTask(task, taskPreset);
      } else {
        setTimeout(
          () => this.runTask(task, taskPreset),
          task.runAt - Date.now()
        );
      }
    }
  }

  /**
   * Schedules a new task to be executed at a specified time.
   * @param when The time in seconds from now when the task should be executed, or a specific timestamp.
   * @param name The name of the task preset to use for this task.
   * @param args Additional arguments to be passed to the task preset function.
   */
  public async newTask(when: number, name: string, ...args: any[]) {
    const whenTimestamp = getFutureTimestamp(when);
    const taskPreset = this.taskPresets.get(name);

    if (!taskPreset) {
      throw new Error(`Task preset '${name}' does not exist.`);
    }

    // Creating task and saving in db.
    const task = new taskModel({
      name,
      arguments: args,
      runAt: whenTimestamp.getTime(),
    });

    await task.save();

    // Running task in a timeout.
    const timeout = setTimeout(() => this.runTask(task, taskPreset), when * 1000);

    // Storing the task timeout.
    this.timeouts.set(task._id, timeout);
  }

  public async runTaskNow(name: string, ...args: any[]) {
    const task = await taskModel.findOne({ name, arguments: args });

    if (!task) {
      throw new Error(`Task with name ${name} and arguments ${args} does not exist.`);
    }

    const timeout = this.timeouts.get(task._id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(task._id);
    }

    const taskPreset = this.taskPresets.get(name);
    if (!taskPreset) {
      throw new Error(`Task preset '${name}' does not exist.`);
    }

    await this.runTask(task, taskPreset);
  }

  /**
   * Executes a task and removes it from the database.
   * @param task The task to be executed.
   * @param taskPreset The preset function associated with the task.
   */
  private async runTask(task: Task, taskPreset: SchedulerTaskPreset) {
    await taskPreset(...task.arguments);
    await taskModel.deleteOne({ _id: '' });
  }
}

/**
 * Defines the options for configuring a Scheduler instance.
 */
export interface SchedulerOptions {
  taskPresets: Array<[name: string, taskPreset: SchedulerTaskPreset]>;
}

/**
 * Represents a function that can be scheduled as a task by the Scheduler.
 */
export type SchedulerTaskPreset = (...args: any[]) => Awaitable<any>;
