import { 
  users, competitionSettings, books, questions, submissions, answers, prizes,
  type User, type InsertUser, type CompetitionSettings, type InsertCompetitionSettings,
  type Book, type InsertBook, type Question, type InsertQuestion,
  type Submission, type InsertSubmission, type Answer, type InsertAnswer,
  type Prize, type InsertPrize, type Category, type SubmissionStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface SubmissionWithUser extends Submission {
  userName: string;
  userEmail: string | null;
  userCity: string | null;
  userCountry: string | null;
}

export interface SubmissionWithDetails extends Submission {
  user: User;
  referrer?: User;
  answers: (Answer & { question: Question })[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  city: string | null;
  country: string | null;
  finalScore: number;
  readingSeconds: number | null;
  answerSeconds: number | null;
  userId: string;
}

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
  getSubmissionWithDetails(id: string): Promise<SubmissionWithDetails | undefined>;
  createSubmission(data: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, data: Partial<Submission>): Promise<Submission | undefined>;
  getAllSubmissions(): Promise<SubmissionWithUser[]>;
  getSubmissionsByCategory(category: Category, status?: SubmissionStatus): Promise<SubmissionWithUser[]>;
  getLeaderboard(category: Category): Promise<LeaderboardEntry[]>;
  recalculateSubmissionScores(submissionId: string): Promise<Submission | undefined>;

  getAnswers(submissionId: string): Promise<Answer[]>;
  upsertAnswer(submissionId: string, questionId: string, type: "MCQ" | "TEXT", value: string): Promise<Answer>;
  updateAnswerCorrectness(answerId: string, isCorrect: boolean): Promise<Answer | undefined>;

  publishResults(category: Category): Promise<CompetitionSettings>;
  unpublishResults(category: Category): Promise<CompetitionSettings>;
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

  async getAllSubmissions(): Promise<SubmissionWithUser[]> {
    const allSubmissions = await db.select().from(submissions);
    const result: SubmissionWithUser[] = [];
    
    for (const sub of allSubmissions) {
      const user = await this.getUser(sub.userId);
      result.push({
        ...sub,
        userName: user ? `${user.name} ${user.surname}` : "Unknown",
        userEmail: user?.email || null,
        userCity: user?.city || null,
        userCountry: user?.country || null,
      });
    }
    
    return result;
  }

  async getSubmissionsByCategory(category: Category, status?: SubmissionStatus): Promise<SubmissionWithUser[]> {
    let query = db.select().from(submissions).where(eq(submissions.category, category));
    const allSubmissions = status 
      ? await db.select().from(submissions).where(and(eq(submissions.category, category), eq(submissions.status, status)))
      : await db.select().from(submissions).where(eq(submissions.category, category));
    
    const result: SubmissionWithUser[] = [];
    for (const sub of allSubmissions) {
      const user = await this.getUser(sub.userId);
      result.push({
        ...sub,
        userName: user ? `${user.name} ${user.surname}` : "Unknown",
        userEmail: user?.email || null,
        userCity: user?.city || null,
        userCountry: user?.country || null,
      });
    }
    return result;
  }

  async getSubmissionWithDetails(id: string): Promise<SubmissionWithDetails | undefined> {
    const submission = await this.getSubmissionById(id);
    if (!submission) return undefined;

    const user = await this.getUser(submission.userId);
    if (!user) return undefined;

    let referrer: User | undefined;
    if (user.referrerId) {
      referrer = await this.getUser(user.referrerId);
    }

    const submissionAnswers = await this.getAnswers(id);
    const answersWithQuestions: (Answer & { question: Question })[] = [];
    
    for (const ans of submissionAnswers) {
      const question = await this.getQuestion(ans.questionId);
      if (question) {
        answersWithQuestions.push({ ...ans, question });
      }
    }

    return {
      ...submission,
      user,
      referrer,
      answers: answersWithQuestions,
    };
  }

  async getLeaderboard(category: Category): Promise<LeaderboardEntry[]> {
    const allSubmissions = await db.select().from(submissions)
      .where(eq(submissions.category, category))
      .orderBy(
        desc(submissions.finalScore),
        asc(submissions.readingSeconds),
        asc(submissions.answerSeconds),
        asc(submissions.createdAt)
      );
    
    const entries: LeaderboardEntry[] = [];
    let rank = 1;
    
    for (const sub of allSubmissions) {
      const user = await this.getUser(sub.userId);
      if (user) {
        const maskedName = `${user.name} ${user.surname.charAt(0)}.`;
        entries.push({
          rank,
          name: maskedName,
          city: user.city,
          country: user.country,
          finalScore: sub.finalScore || 0,
          readingSeconds: sub.readingSeconds,
          answerSeconds: sub.answerSeconds,
          userId: user.id,
        });
        rank++;
      }
    }
    
    return entries;
  }

  async recalculateSubmissionScores(submissionId: string): Promise<Submission | undefined> {
    const submission = await this.getSubmissionById(submissionId);
    if (!submission) return undefined;

    const submissionAnswers = await this.getAnswers(submissionId);
    const categoryQuestions = await this.getQuestions(submission.category);
    
    const mcqQuestions = categoryQuestions.filter(q => q.type === "MCQ");
    const mcqTotalCount = mcqQuestions.length;
    let mcqCorrectCount = 0;

    for (const ans of submissionAnswers) {
      if (ans.type === "MCQ") {
        const question = mcqQuestions.find(q => q.id === ans.questionId);
        if (question && ans.value === question.correctAnswer) {
          mcqCorrectCount++;
          await db.update(answers).set({ isCorrect: true }).where(eq(answers.id, ans.id));
        } else if (question) {
          await db.update(answers).set({ isCorrect: false }).where(eq(answers.id, ans.id));
        }
      }
    }

    const autoScore = mcqCorrectCount;
    const finalScore = autoScore + (submission.manualScore || 0);

    return this.updateSubmission(submissionId, {
      mcqTotalCount,
      mcqCorrectCount,
      autoScore,
      finalScore,
      updatedAt: new Date(),
    });
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

  async updateAnswerCorrectness(answerId: string, isCorrect: boolean): Promise<Answer | undefined> {
    const [updated] = await db.update(answers)
      .set({ isCorrect })
      .where(eq(answers.id, answerId))
      .returning();
    return updated || undefined;
  }

  async publishResults(category: Category): Promise<CompetitionSettings> {
    return this.upsertCompetitionSettings(category, { resultsPublishedAt: new Date() });
  }

  async unpublishResults(category: Category): Promise<CompetitionSettings> {
    const [updated] = await db.update(competitionSettings)
      .set({ resultsPublishedAt: null })
      .where(eq(competitionSettings.category, category))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
