import {
  users, competitionSettings, books, questions, submissions, answers, prizes,
  competitions, competitionBooks, competitionQuestions, competitionRegistrations,
  testimonials, banners, subscribers, socialShares, siteStats,
  type User, type InsertUser, type CompetitionSettings, type InsertCompetitionSettings,
  type Book, type InsertBook, type Question, type InsertQuestion,
  type Submission, type InsertSubmission, type Answer, type InsertAnswer,
  type Prize, type InsertPrize, type Category, type SubmissionStatus,
  type Competition, type InsertCompetition, type CompetitionBook, type InsertCompetitionBook,
  type CompetitionQuestion, type InsertCompetitionQuestion,
  type CompetitionRegistration, type InsertCompetitionRegistration, type CompetitionStatus,
  type Testimonial, type InsertTestimonial,
  type Banner, type InsertBanner,
  type Subscriber, type InsertSubscriber,
  type SocialShare, type InsertSocialShare,
  type SiteStat, type InsertSiteStat
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, ne, gte, lte, notInArray, inArray, count, avg, isNull } from "drizzle-orm";

export interface SubmissionWithUser extends Submission {
  userName: string;
  userEmail: string | null;
  userCity: string | null;
  userCountry: string | null;
}

export interface SubmissionWithDetails extends Submission {
  user: User;
  referrer?: User;
  answers: (Answer & { question: any })[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  city: string | null;
  country: string | null;
  finalScore: number;
  readingSpeedWPM: number | null;
  comprehensionScore: number | null;
  readingSeconds: number | null;
  answerSeconds: number | null;
  userId: string;
}

export interface CompetitionWithDetails extends Competition {
  book?: CompetitionBook;
  questionCount: number;
  registrationCount: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalSubmissions: number;
  avgWPM: number;
  registrationsByDay: { date: string; count: number }[];
}

export interface ShareStats {
  platform: string;
  count: number;
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
  getAdminLeaderboard(category: Category): Promise<LeaderboardEntry[]>;
  recalculateSubmissionScores(submissionId: string): Promise<Submission | undefined>;

  getAnswers(submissionId: string): Promise<Answer[]>;
  upsertAnswer(submissionId: string, questionId: string, type: "MCQ" | "TEXT", value: string): Promise<Answer>;
  updateAnswerCorrectness(answerId: string, isCorrect: boolean): Promise<Answer | undefined>;
  updateAnswerPoints(answerId: string, points: number): Promise<Answer | undefined>;
  recalculateManualScore(submissionId: string): Promise<Submission | undefined>;

  publishResults(category: Category): Promise<CompetitionSettings>;
  unpublishResults(category: Category): Promise<CompetitionSettings>;

  // Competition management
  getCompetition(id: string): Promise<Competition | undefined>;
  getCompetitionWithDetails(id: string): Promise<CompetitionWithDetails | undefined>;
  getAllCompetitions(): Promise<Competition[]>;
  getCompetitionsByCategory(category: Category): Promise<Competition[]>;
  getActiveCompetitions(category: Category): Promise<Competition[]>;
  createCompetition(data: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined>;
  deleteCompetition(id: string): Promise<void>;
  publishCompetition(id: string): Promise<Competition | undefined>;
  closeCompetition(id: string): Promise<Competition | undefined>;
  publishCompetitionResults(id: string): Promise<Competition | undefined>;
  unpublishCompetitionResults(id: string): Promise<Competition | undefined>;

  // Competition Books
  getCompetitionBook(competitionId: string, language?: string): Promise<CompetitionBook | undefined>;
  getCompetitionBooks(competitionId: string): Promise<CompetitionBook[]>;
  upsertCompetitionBook(competitionId: string, data: Partial<InsertCompetitionBook>, language?: string): Promise<CompetitionBook>;
  deleteCompetitionBook(competitionId: string, language?: string): Promise<void>;

  // Competition Questions
  getCompetitionQuestions(competitionId: string, language?: string): Promise<CompetitionQuestion[]>;
  getCompetitionQuestion(id: string): Promise<CompetitionQuestion | undefined>;
  createCompetitionQuestion(data: InsertCompetitionQuestion): Promise<CompetitionQuestion>;
  updateCompetitionQuestion(id: string, data: Partial<InsertCompetitionQuestion>): Promise<CompetitionQuestion | undefined>;
  deleteCompetitionQuestion(id: string): Promise<void>;

  // Competition Registrations
  getRegistration(competitionId: string, userId: string): Promise<CompetitionRegistration | undefined>;
  getUserRegistrations(userId: string): Promise<CompetitionRegistration[]>;
  getCompetitionRegistrations(competitionId: string): Promise<CompetitionRegistration[]>;
  registerForCompetition(competitionId: string, userId: string, language?: string): Promise<CompetitionRegistration>;

  // Competition Submissions
  getCompetitionSubmission(competitionId: string, userId: string): Promise<Submission | undefined>;
  getCompetitionSubmissions(competitionId: string): Promise<SubmissionWithUser[]>;
  getCompetitionLeaderboard(competitionId: string): Promise<LeaderboardEntry[]>;
  getAdminCompetitionLeaderboard(competitionId: string): Promise<LeaderboardEntry[]>;

  // Testimonials
  getPublishedTestimonials(): Promise<Testimonial[]>;
  getAllTestimonials(): Promise<Testimonial[]>;
  createTestimonial(data: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: string, data: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: string): Promise<void>;

  // Banners
  getActiveBanners(position?: string): Promise<Banner[]>;
  getAllBanners(): Promise<Banner[]>;
  createBanner(data: InsertBanner): Promise<Banner>;
  updateBanner(id: string, data: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<void>;

  // Subscribers
  subscribe(email: string, name?: string, source?: string): Promise<Subscriber>;
  unsubscribe(email: string): Promise<Subscriber | undefined>;
  getAllSubscribers(): Promise<Subscriber[]>;
  getSubscriberCount(): Promise<number>;

  // Social Shares
  createSocialShare(data: InsertSocialShare): Promise<SocialShare>;
  getSharesByUser(userId: string): Promise<SocialShare[]>;
  getShareStats(): Promise<ShareStats[]>;

  // Site Stats
  getSiteStats(): Promise<SiteStat[]>;
  upsertSiteStat(key: string, value: string, label: string, icon?: string, sortOrder?: number): Promise<SiteStat>;

  // Analytics
  getAdminAnalytics(): Promise<AdminAnalytics>;
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

  // @ts-ignore - drizzle dual-module type resolution issue
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
    const answersWithQuestions: (Answer & { question: any })[] = [];

    for (const ans of submissionAnswers) {
      let question: Question | CompetitionQuestion | undefined;
      if (ans.competitionQuestionId) {
        question = await this.getCompetitionQuestion(ans.competitionQuestionId);
      } else if (ans.questionId) {
        question = await this.getQuestion(ans.questionId);
      }
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
          readingSpeedWPM: sub.readingSpeedWPM,
          comprehensionScore: sub.comprehensionScore,
          readingSeconds: sub.readingSeconds,
          answerSeconds: sub.answerSeconds,
          userId: user.id,
        });
        rank++;
      }
    }

    return entries;
  }

  async getAdminLeaderboard(category: Category): Promise<LeaderboardEntry[]> {
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
        const fullName = `${user.name} ${user.surname}`;
        entries.push({
          rank,
          name: fullName,
          city: user.city,
          country: user.country,
          finalScore: sub.finalScore || 0,
          readingSpeedWPM: sub.readingSpeedWPM,
          comprehensionScore: sub.comprehensionScore,
          readingSeconds: sub.readingSeconds,
          answerSeconds: sub.answerSeconds,
          userId: user.id,
        });
        rank++;
      }
    }

    return entries;
  }

  async getCompetitionAdminLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    const allSubmissions = await db.select().from(submissions)
      .where(eq(submissions.competitionId, competitionId))
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
        const fullName = `${user.name} ${user.surname}`;
        entries.push({
          rank,
          name: fullName,
          city: user.city,
          country: user.country,
          finalScore: sub.finalScore || 0,
          readingSpeedWPM: sub.readingSpeedWPM,
          comprehensionScore: sub.comprehensionScore,
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

    // Resolve language: detect from actual answered questions > submission.language > user.preferredLanguage > "tr"
    let submissionLang = (submission as any).language;
    if (!submissionLang && submissionAnswers.length > 0) {
      // Detect from the actual questions the student answered
      for (const ans of submissionAnswers) {
        if (ans.competitionQuestionId) {
          const q = await this.getCompetitionQuestion(ans.competitionQuestionId);
          if (q?.language) {
            submissionLang = q.language;
            break;
          }
        }
      }
    }
    if (!submissionLang) {
      const user = await this.getUser(submission.userId);
      submissionLang = (user as any)?.preferredLanguage;
      if (!submissionLang && submission.competitionId) {
        const reg = await this.getRegistration(submission.competitionId, submission.userId);
        submissionLang = reg?.language;
      }
    }
    submissionLang = submissionLang || "tr";

    let allQuestions: any[] = [];
    if (submission.competitionId) {
      allQuestions = await this.getCompetitionQuestions(submission.competitionId, submissionLang);
    } else {
      allQuestions = await this.getQuestions(submission.category);
    }

    const mcqQuestions = allQuestions.filter(q => q.type === "MCQ");
    const mcqTotalCount = mcqQuestions.length;
    let mcqCorrectCount = 0;
    let mcqWrongCount = 0;

    for (const ans of submissionAnswers) {
      if (ans.type === "MCQ") {
        const question = mcqQuestions.find(q => q.id === ans.competitionQuestionId || q.id === ans.questionId);
        if (question && ans.value === question.correctAnswer) {
          mcqCorrectCount++;
          await db.update(answers).set({ isCorrect: true }).where(eq(answers.id, ans.id));
        } else if (question) {
          mcqWrongCount++;
          await db.update(answers).set({ isCorrect: false }).where(eq(answers.id, ans.id));
        }
      }
    }

    const autoScore = mcqCorrectCount;

    let readingSpeedWPM = 0;
    let comprehensionScore = 0;
    let calculatedFinalScore = 0;

    let bookWordCount = 0;
    if (submission.competitionId) {
      const book = await this.getCompetitionBook(submission.competitionId, submissionLang);
      bookWordCount = book?.wordCount || 0;
    }

    if (bookWordCount > 0 && submission.readingSeconds && submission.readingSeconds > 0) {
      const totalMinutes = Math.floor(submission.readingSeconds / 60);
      const totalSecondsRemainder = submission.readingSeconds % 60;
      const timeInMinutes = totalMinutes + (totalSecondsRemainder * 0.01666667);

      if (timeInMinutes > 0) {
        readingSpeedWPM = bookWordCount / timeInMinutes;
      }
    }

    // Combine MCQ + TEXT into a unified comprehension ratio
    const textQuestions = allQuestions.filter(q => q.type === "TEXT");
    const textTotalCount = textQuestions.length;
    let textCorrectPoints = 0;
    let textMaxPoints = 0;

    for (const tq of textQuestions) {
      textMaxPoints += (tq.maxPoints || 1);
      const ans = submissionAnswers.find(a => a.competitionQuestionId === tq.id || a.questionId === tq.id);
      if (ans) {
        textCorrectPoints += (ans.points || 0);
      }
    }

    const totalQuestionCount = mcqTotalCount + textTotalCount;
    if (totalQuestionCount > 0) {
      // MCQ: each correct = 1 out of 1 max point
      // TEXT: points scored out of maxPoints
      const totalScored = mcqCorrectCount + textCorrectPoints;
      const totalMax = mcqTotalCount + textMaxPoints;
      const ratio = totalMax > 0 ? totalScored / totalMax : 0;
      if (ratio >= 0.4) {
        comprehensionScore = ratio * 10;
      } else {
        comprehensionScore = 0;
      }
    }

    calculatedFinalScore = comprehensionScore * readingSpeedWPM;

    const manualScore = textCorrectPoints;

    return this.updateSubmission(submissionId, {
      mcqTotalCount,
      mcqCorrectCount,
      mcqWrongCount,
      autoScore,
      manualScore,
      readingSpeedWPM: Math.round(readingSpeedWPM * 100) / 100,
      comprehensionScore: Math.round(comprehensionScore * 100) / 100,
      finalScore: Math.round(calculatedFinalScore * 100) / 100,
      updatedAt: new Date(),
    });
  }

  async getAnswers(submissionId: string): Promise<Answer[]> {
    return db.select().from(answers).where(eq(answers.submissionId, submissionId));
  }

  async upsertAnswer(submissionId: string, questionId: string, type: "MCQ" | "TEXT", value: string): Promise<Answer> {
    const [existing] = await db.select().from(answers)
      .where(and(eq(answers.submissionId, submissionId), eq(answers.competitionQuestionId, questionId)));

    if (existing) {
      const [updated] = await db.update(answers)
        .set({ value })
        .where(eq(answers.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(answers)
        .values({ submissionId, competitionQuestionId: questionId, type, value })
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

  async updateAnswerPoints(answerId: string, points: number): Promise<Answer | undefined> {
    const [updated] = await db.update(answers)
      .set({ points })
      .where(eq(answers.id, answerId))
      .returning();
    return updated || undefined;
  }

  async recalculateManualScore(submissionId: string): Promise<Submission | undefined> {
    // Use full recalculation so TEXT answers are included in the unified
    // comprehensionScore × WPM formula (same as MCQ answers).
    return this.recalculateSubmissionScores(submissionId);
  }

  async publishResults(category: Category): Promise<CompetitionSettings> {
    // Also update all competitions in this category so per-competition resultsPublishedAt is set
    await db.update(competitions)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(competitions.category, category));
    return this.upsertCompetitionSettings(category, { resultsPublishedAt: new Date() });
  }

  async unpublishResults(category: Category): Promise<CompetitionSettings> {
    // Also clear per-competition resultsPublishedAt for this category
    await db.update(competitions)
      .set({ resultsPublishedAt: null })
      .where(eq(competitions.category, category));
    const [updated] = await db.update(competitionSettings)
      .set({ resultsPublishedAt: null })
      .where(eq(competitionSettings.category, category))
      .returning();
    return updated;
  }

  // Competition management
  async getCompetition(id: string): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    return competition || undefined;
  }

  async getCompetitionWithDetails(id: string): Promise<CompetitionWithDetails | undefined> {
    const competition = await this.getCompetition(id);
    if (!competition) return undefined;

    // Get first available book (default language)
    const book = await this.getCompetitionBook(id);
    const questionsResult = await db.select().from(competitionQuestions).where(eq(competitionQuestions.competitionId, id));
    const registrationsResult = await db.select().from(competitionRegistrations).where(eq(competitionRegistrations.competitionId, id));

    return {
      ...competition,
      book,
      questionCount: questionsResult.length,
      registrationCount: registrationsResult.length,
    };
  }

  async getAllCompetitions(): Promise<Competition[]> {
    return db.select().from(competitions).orderBy(desc(competitions.createdAt));
  }

  async getCompetitionsByCategory(category: Category): Promise<Competition[]> {
    return db.select().from(competitions)
      .where(eq(competitions.category, category))
      .orderBy(desc(competitions.createdAt));
  }

  async getActiveCompetitions(category: Category): Promise<Competition[]> {
    return db.select().from(competitions)
      .where(and(
        eq(competitions.category, category),
        eq(competitions.status, "ACTIVE")
      ))
      .orderBy(desc(competitions.createdAt));
  }

  async createCompetition(data: InsertCompetition): Promise<Competition> {
    const [competition] = await db.insert(competitions).values(data).returning();
    return competition;
  }

  async updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined> {
    const [competition] = await db.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return competition || undefined;
  }

  async deleteCompetition(id: string): Promise<void> {
    await db.delete(competitions).where(eq(competitions.id, id));
  }

  async publishCompetition(id: string): Promise<Competition | undefined> {
    return this.updateCompetition(id, { status: "ACTIVE" });
  }

  async closeCompetition(id: string): Promise<Competition | undefined> {
    return this.updateCompetition(id, { status: "CLOSED" });
  }

  async publishCompetitionResults(id: string): Promise<Competition | undefined> {
    const [updated] = await db.update(competitions)
      .set({ resultsPublishedAt: new Date() })
      .where(eq(competitions.id, id))
      .returning();
    return updated || undefined;
  }

  async unpublishCompetitionResults(id: string): Promise<Competition | undefined> {
    const [updated] = await db.update(competitions)
      .set({ resultsPublishedAt: null })
      .where(eq(competitions.id, id))
      .returning();
    return updated || undefined;
  }

  // Competition Books
  async getCompetitionBook(competitionId: string, language?: string): Promise<CompetitionBook | undefined> {
    const lang = language || "tr";
    const [book] = await db.select().from(competitionBooks).where(
      and(eq(competitionBooks.competitionId, competitionId), eq(competitionBooks.language, lang))
    );
    return book || undefined;
  }

  async getCompetitionBooks(competitionId: string): Promise<CompetitionBook[]> {
    return db.select().from(competitionBooks).where(eq(competitionBooks.competitionId, competitionId));
  }

  async upsertCompetitionBook(competitionId: string, data: Partial<InsertCompetitionBook>, language?: string): Promise<CompetitionBook> {
    const lang = language || data.language || "tr";
    if (data.content) {
      data.wordCount = data.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
    data.language = lang;
    const existing = await this.getCompetitionBook(competitionId, lang);
    if (existing && existing.language === lang) {
      const [updated] = await db.update(competitionBooks)
        .set(data)
        .where(and(eq(competitionBooks.competitionId, competitionId), eq(competitionBooks.language, lang)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(competitionBooks)
        .values({ ...data, competitionId, language: lang } as InsertCompetitionBook)
        .returning();
      return created;
    }
  }

  async deleteCompetitionBook(competitionId: string, language?: string): Promise<void> {
    if (language) {
      await db.delete(competitionBooks).where(
        and(eq(competitionBooks.competitionId, competitionId), eq(competitionBooks.language, language))
      );
    } else {
      await db.delete(competitionBooks).where(eq(competitionBooks.competitionId, competitionId));
    }
  }

  // Competition Questions
  async getCompetitionQuestions(competitionId: string, language?: string): Promise<CompetitionQuestion[]> {
    if (language) {
      return db.select().from(competitionQuestions).where(
        and(eq(competitionQuestions.competitionId, competitionId), eq(competitionQuestions.language, language))
      );
    }
    return db.select().from(competitionQuestions).where(eq(competitionQuestions.competitionId, competitionId));
  }

  async getCompetitionQuestion(id: string): Promise<CompetitionQuestion | undefined> {
    const [question] = await db.select().from(competitionQuestions).where(eq(competitionQuestions.id, id));
    return question || undefined;
  }

  async createCompetitionQuestion(data: InsertCompetitionQuestion): Promise<CompetitionQuestion> {
    const [question] = await db.insert(competitionQuestions).values(data).returning();
    return question;
  }

  async updateCompetitionQuestion(id: string, data: Partial<InsertCompetitionQuestion>): Promise<CompetitionQuestion | undefined> {
    const [question] = await db.update(competitionQuestions).set(data).where(eq(competitionQuestions.id, id)).returning();
    return question || undefined;
  }

  async deleteCompetitionQuestion(id: string): Promise<void> {
    await db.delete(competitionQuestions).where(eq(competitionQuestions.id, id));
  }

  // Competition Registrations
  async getRegistration(competitionId: string, userId: string): Promise<CompetitionRegistration | undefined> {
    const [registration] = await db.select().from(competitionRegistrations)
      .where(and(
        eq(competitionRegistrations.competitionId, competitionId),
        eq(competitionRegistrations.userId, userId)
      ));
    return registration || undefined;
  }

  async getUserRegistrations(userId: string): Promise<CompetitionRegistration[]> {
    return db.select().from(competitionRegistrations).where(eq(competitionRegistrations.userId, userId));
  }

  async getCompetitionRegistrations(competitionId: string): Promise<CompetitionRegistration[]> {
    return db.select().from(competitionRegistrations).where(eq(competitionRegistrations.competitionId, competitionId));
  }

  async registerForCompetition(competitionId: string, userId: string, language?: string): Promise<CompetitionRegistration> {
    const lang = language || "tr";
    const [registration] = await db.insert(competitionRegistrations)
      .values({ competitionId, userId, language: lang })
      .returning();
    return registration;
  }

  // Competition Submissions
  async getCompetitionSubmission(competitionId: string, userId: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions)
      .where(and(
        eq(submissions.competitionId, competitionId),
        eq(submissions.userId, userId)
      ));
    return submission || undefined;
  }

  async getCompetitionSubmissions(competitionId: string): Promise<SubmissionWithUser[]> {
    const allSubmissions = await db.select().from(submissions)
      .where(eq(submissions.competitionId, competitionId));

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

  async getCompetitionLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    const allSubmissions = await db.select().from(submissions)
      .where(eq(submissions.competitionId, competitionId))
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
          readingSpeedWPM: sub.readingSpeedWPM,
          comprehensionScore: sub.comprehensionScore,
          readingSeconds: sub.readingSeconds,
          answerSeconds: sub.answerSeconds,
          userId: user.id,
        });
        rank++;
      }
    }

    return entries;
  }

  async getAdminCompetitionLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    const allSubmissions = await db.select().from(submissions)
      .where(eq(submissions.competitionId, competitionId))
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
        const fullName = `${user.name} ${user.surname}`;
        entries.push({
          rank,
          name: fullName,
          city: user.city,
          country: user.country,
          finalScore: sub.finalScore || 0,
          readingSpeedWPM: sub.readingSpeedWPM,
          comprehensionScore: sub.comprehensionScore,
          readingSeconds: sub.readingSeconds,
          answerSeconds: sub.answerSeconds,
          userId: user.id,
        });
        rank++;
      }
    }

    return entries;
  }

  // ─── Testimonials ───────────────────────────────────────────────────────────

  async getPublishedTestimonials(): Promise<Testimonial[]> {
    return db.select().from(testimonials)
      .where(eq(testimonials.isPublished, true))
      .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    return db.select().from(testimonials)
      .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
  }

  async createTestimonial(data: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(data).returning();
    return testimonial;
  }

  async updateTestimonial(id: string, data: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const [updated] = await db.update(testimonials)
      .set(data)
      .where(eq(testimonials.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTestimonial(id: string): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  // ─── Banners ────────────────────────────────────────────────────────────────

  async getActiveBanners(position?: string): Promise<Banner[]> {
    const now = new Date();
    if (position) {
      const results = await db.select().from(banners)
        .where(and(
          eq(banners.isActive, true),
          eq(banners.position, position)
        ))
        .orderBy(desc(banners.createdAt));
      // Filter by date range in JS to handle nullable start/end dates
      return results.filter(b => {
        if (b.startDate && b.startDate > now) return false;
        if (b.endDate && b.endDate < now) return false;
        return true;
      });
    } else {
      const results = await db.select().from(banners)
        .where(eq(banners.isActive, true))
        .orderBy(desc(banners.createdAt));
      return results.filter(b => {
        if (b.startDate && b.startDate > now) return false;
        if (b.endDate && b.endDate < now) return false;
        return true;
      });
    }
  }

  async getAllBanners(): Promise<Banner[]> {
    return db.select().from(banners).orderBy(desc(banners.createdAt));
  }

  async createBanner(data: InsertBanner): Promise<Banner> {
    const [banner] = await db.insert(banners).values(data).returning();
    return banner;
  }

  async updateBanner(id: string, data: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [updated] = await db.update(banners)
      .set(data)
      .where(eq(banners.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBanner(id: string): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }

  // ─── Subscribers ────────────────────────────────────────────────────────────

  async subscribe(email: string, name?: string, source?: string): Promise<Subscriber> {
    // Check if already exists
    const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    if (existing) {
      // Re-activate if previously unsubscribed
      const [updated] = await db.update(subscribers)
        .set({ isActive: true, name: name || existing.name, source: source || existing.source, unsubscribedAt: null })
        .where(eq(subscribers.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(subscribers)
      .values({ email, name: name || null, source: source || "website" })
      .returning();
    return created;
  }

  async unsubscribe(email: string): Promise<Subscriber | undefined> {
    const [updated] = await db.update(subscribers)
      .set({ isActive: false, unsubscribedAt: new Date() })
      .where(eq(subscribers.email, email))
      .returning();
    return updated || undefined;
  }

  async getAllSubscribers(): Promise<Subscriber[]> {
    return db.select().from(subscribers).orderBy(desc(subscribers.subscribedAt));
  }

  async getSubscriberCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(subscribers).where(eq(subscribers.isActive, true));
    return result?.count || 0;
  }

  // ─── Social Shares ──────────────────────────────────────────────────────────

  async createSocialShare(data: InsertSocialShare): Promise<SocialShare> {
    const [share] = await db.insert(socialShares).values(data).returning();
    return share;
  }

  async getSharesByUser(userId: string): Promise<SocialShare[]> {
    return db.select().from(socialShares)
      .where(eq(socialShares.userId, userId))
      .orderBy(desc(socialShares.createdAt));
  }

  async getShareStats(): Promise<ShareStats[]> {
    const results = await db
      .select({
        platform: socialShares.platform,
        count: count(),
      })
      .from(socialShares)
      .groupBy(socialShares.platform);
    return results.map(r => ({ platform: r.platform, count: r.count }));
  }

  // ─── Site Stats ─────────────────────────────────────────────────────────────

  async getSiteStats(): Promise<SiteStat[]> {
    return db.select().from(siteStats).orderBy(asc(siteStats.sortOrder));
  }

  async upsertSiteStat(key: string, value: string, label: string, icon?: string, sortOrder?: number): Promise<SiteStat> {
    const [existing] = await db.select().from(siteStats).where(eq(siteStats.key, key));
    if (existing) {
      const updateData: Record<string, any> = { value, label, updatedAt: new Date() };
      if (icon !== undefined) updateData.icon = icon;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      const [updated] = await db.update(siteStats)
        .set(updateData)
        .where(eq(siteStats.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(siteStats)
        .values({
          key,
          value,
          label,
          icon: icon || null,
          sortOrder: sortOrder || 0,
        })
        .returning();
      return created;
    }
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    // Total users (students only)
    const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "STUDENT"));
    const totalUsers = userCount?.count || 0;

    // Total submissions
    const [subCount] = await db.select({ count: count() }).from(submissions);
    const totalSubmissions = subCount?.count || 0;

    // Average WPM
    const [wpmResult] = await db.select({ avg: avg(submissions.readingSpeedWPM) }).from(submissions);
    const avgWPM = wpmResult?.avg ? Math.round(parseFloat(String(wpmResult.avg)) * 100) / 100 : 0;

    // Registrations by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await db.select({
      createdAt: users.createdAt,
    }).from(users)
      .where(and(
        eq(users.role, "STUDENT"),
        gte(users.createdAt, thirtyDaysAgo)
      ));

    // Group by date in JS
    const dayMap = new Map<string, number>();
    for (const u of recentUsers) {
      if (u.createdAt) {
        const dateStr = u.createdAt.toISOString().split("T")[0];
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }
    }

    const registrationsByDay: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      registrationsByDay.push({ date: dateStr, count: dayMap.get(dateStr) || 0 });
    }

    return {
      totalUsers,
      totalSubmissions,
      avgWPM,
      registrationsByDay,
    };
  }
}

export const storage = new DatabaseStorage();
