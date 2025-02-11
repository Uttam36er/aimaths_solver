import { problems, type Problem, type InsertProblem } from "@shared/schema";

export interface IStorage {
  createProblem(problem: InsertProblem): Promise<Problem>;
  getProblem(id: number): Promise<Problem | undefined>;
}

export class MemStorage implements IStorage {
  private problems: Map<number, Problem>;
  currentId: number;

  constructor() {
    this.problems = new Map();
    this.currentId = 1;
  }

  async getProblem(id: number): Promise<Problem | undefined> {
    return this.problems.get(id);
  }

  async createProblem(insertProblem: InsertProblem): Promise<Problem> {
    const id = this.currentId++;
    const problem: Problem = {
      ...insertProblem,
      id,
      imageUrl: insertProblem.imageUrl ?? null,
      solution: null,
    };
    this.problems.set(id, problem);
    return problem;
  }
}

export const storage = new MemStorage();