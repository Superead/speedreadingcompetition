import { 
  users, competitionSettings, books, questions, submissions, answers, prizes,
  type User, type InsertUser, type CompetitionSettings, type InsertCompetitionSettings,
  type Book, type InsertBook, type Question, type InsertQuestion,
  type Submission, type InsertSubmission, type Answer, type InsertAnswer,
  type Prize, type InsertPrize, type Category
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByAffiliateCode(code: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, "id">): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByCategory(category: Category): Promise<User[]>;
  getReferrals(userId: string): Promise<User[]>;

  getCompetitionSettings(category: Category): Promise<CompetitionSettings | undefined>;
  getAllCompetitionSettings(): Promise<CompetitionSettings[]>;
  upsertCompetitionSettings(category: Category, data: Partial<InsertCompetitionSettings>): Promise<CompetitionSettings>;

  getBook(category: Category): Promise<Book | undefined>;
  getAllBooks(): Promise<Book[]>;
  upsertBook(category: Category, data: Partial<InsertBook>): Promise<Book>;
  deleteBook(category: Category): Promise<void>;

  getQuestions(category: Category): Promise<Question[]>;
  getAllQuestions(): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  createQuestion(data: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<void>;

  getPrize(category: Category): Promise<Prize | undefined>;
  getAllPrizes(): Promise<Prize[]>;
  upsertPrize(category: Category, content: string): Promise<Prize>;

  getSubmission(userId: string, category: Category): Promise<Submission | undefined>;
  getSubmissionById(id: string): Promise<Submission | undefined>;
  createSubmission(data: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, data: Partial<Submission>): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<(Submission & { userName: string })[]>;

  getAnswers(submissionId: string): Promise<Answer[]>;
  upsertAnswer(submissionId: string, questionId: string, type: "MCQ" | "TEXT", value: string): Promise<Answer>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByAffiliateCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.affiliateCode, code));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: Omit<InsertUser, "id">): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "STUDENT"));
  }

  async getUsersByCategory(category: Category): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.role, "STUDENT"), eq(users.category, category)));
  }

  async getReferrals(userId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.referrerId, userId));
  }

  async getCompetitionSettings(category: Category): Promise<CompetitionSettings | undefined> {
    const [settings] = await db.select().from(competitionSettings).where(eq(competitionSettings.category, category));
    return settings || undefined;
  }

  async getAllCompetitionSettings(): Promise<CompetitionSettings[]> {
    return db.select().from(competitionSettings);
  }

  async upsertCompetitionSettings(category: Category, data: Partial<InsertCompetitionSettings>): Promise<CompetitionSettings> {
    const existing = await this.getCompetitionSettings(category);
    if (existing) {
      const [updated] = await db.update(competitionSettings)
        .set(data)
        .where(eq(competitionSettings.category, category))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(competitionSettings)
        .values({ ...data, category })
        .returning();
      return created;
    }
  }

  async getBook(category: Category): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.category, category));
    return book || undefined;
  }

  async getAllBooks(): Promise<Book[]> {
    return db.select().from(books);
  }

  async upsertBook(category: Category, data: Partial<InsertBook>): Promise<Book> {
    const existing = await this.getBook(category);
    if (existing) {
      const [updated] = await db.update(books)
        .set(data)
        .where(eq(books.category, category))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(books)
        .values({ ...data, category } as InsertBook)
        .returning();
      return created;
    }
  }

  async deleteBook(category: Category): Promise<void> {
    await db.delete(books).where(eq(books.category, category));
  }

  async getQuestions(category: Category): Promise<Question[]> {
    return db.select().from(questions).where(eq(questions.category, category));
  }

  async getAllQuestions(): Promise<Question[]> {
    return db.select().from(questions);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question || undefined;
  }

  async createQuestion(data: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(data).returning();
    return question;
  }

  async updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [question] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return question || undefined;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async getPrize(category: Category): Promise<Prize | undefined> {
    const [prize] = await db.select().from(prizes).where(eq(prizes.category, category));
    return prize || undefined;
  }

  async getAllPrizes(): Promise<Prize[]> {
    return db.select().from(prizes);
  }

  async upsertPrize(category: Category, content: string): Promise<Prize> {
    const existing = await this.getPrize(category);
    if (existing) {
      const [updated] = await db.update(prizes)
        .set({ content })
        .where(eq(prizes.category, category))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(prizes)
        .values({ category, content })
        .returning();
      return created;
    }
  }

  async getSubmission(userId: string, category: Category): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.category, category)));
    return submission || undefined;
  }

  async getSubmissionById(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission || undefined;
  }

  async createSubmission(data: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(data).returning();
    return submission;
  }

  async updateSubmission(id: string, data: Partial<Submission>): Promise<Submission | undefined> {
    const [submission] = await db.update(submissions).set(data).where(eq(submissions.id, id)).returning();
    return submission || undefined;
  }

  async getAllSubmissions(): Promise<(Submission & { userName: string })[]> {
    const allSubmissions = await db.select().from(submissions);
    const result: (Submission & { userName: string })[] = [];
    
    for (const sub of allSubmissions) {
      const user = await this.getUser(sub.userId);
      result.push({
        ...sub,
        userName: user ? `${user.name} ${user.surname}` : "Unknown",
      });
    }
    
    return result;
  }

  async getAnswers(submissionId: string): Promise<Answer[]> {
    return db.select().from(answers).where(eq(answers.submissionId, submissionId));
  }

  async upsertAnswer(submissionId: string, questionId: string, type: "MCQ" | "TEXT", value: string): Promise<Answer> {
    const [existing] = await db.select().from(answers)
      .where(and(eq(answers.submissionId, submissionId), eq(answers.questionId, questionId)));
    
    if (existing) {
      const [updated] = await db.update(answers)
        .set({ value })
        .where(eq(answers.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(answers)
        .values({ submissionId, questionId, type, value })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
