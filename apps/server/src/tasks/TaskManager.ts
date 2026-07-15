import { MemoryStore } from '../memory/MemoryStore';

export class TaskManager {
  private memoryStore: MemoryStore;

  constructor(memoryStore: MemoryStore) {
    this.memoryStore = memoryStore;
  }

  async createTask(title: string, assignedTo: string): Promise<number> {
    return this.memoryStore.createTask(title, assignedTo);
  }

  async getTaskList(): Promise<any[]> {
    return this.memoryStore.getTasks();
  }

  async completeTask(taskId: number, outputPath?: string): Promise<void> {
    await this.memoryStore.completeTask(taskId, outputPath);
  }

  async markTaskFailed(taskId: number): Promise<void> {
    await this.memoryStore.markTaskFailed(taskId);
  }

  async getRecentTasks(limit: number = 50): Promise<any[]> {
    return this.memoryStore.getRecentTasks(limit);
  }
}