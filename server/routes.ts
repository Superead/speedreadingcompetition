import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  registerSchema, loginSchema, adminLoginSchema, answers,
  type Category, type User 
} from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const categorySchema = z.enum(["kid", "teen", "adult"]);

const settingsUpdateSchema = z.object({
  registrationStartTime: z.string().nullable().optional(),
  registrationEndTime: z.string().nullable().optional(),
  competitionStartTime: z.string().nullable().optional(),
  competitionEndTime: z.string().nullable().optional(),
  readingDurationMinutes: z.number().min(1).optional(),
  answeringDurationMinutes: z.number().min(1).optional(),
}).refine((data) => {
  const regStart = data.registrationStartTime ? new Date(data.registrationStartTime) : null;
  const regEnd = data.registrationEndTime ? new Date(data.registrationEndTime) : null;
  const compStart = data.competitionStartTime ? new Date(data.competitionStartTime) : null;
  const compEnd = data.competitionEndTime ? new Date(data.competitionEndTime) : null;

  if (regStart && regEnd && regStart >= regEnd) {
    return false;
  }
  if (regEnd && compStart && regEnd > compStart) {
    return false;
  }
  if (compStart && compEnd && compStart >= compEnd) {
    return false;
  }
  return true;
}, {
  message: "Invalid time sequence. Registration must start before it ends, registration must end before/at competition start, and competition must start before it ends."
});

const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
});

const questionCreateSchema = z.object({
  type: z.enum(["MCQ", "TEXT"]),
  prompt: z.string().min(1, "Prompt is required"),
  optionsJson: z.string().nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
});

const questionUpdateSchema = z.object({
  type: z.enum(["MCQ", "TEXT"]),
  prompt: z.string().min(1, "Prompt is required"),
  optionsJson: z.string().nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  category: categorySchema,
});

const prizeSchema = z.object({
  content: z.string().optional(),
});

const JWT_SECRET = process.env.SESSION_SECRET || "speed-reading-secret-key-change-in-production";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@demo.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";

function generateAffiliateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface AuthRequest extends Request {
  user?: User;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function studentMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "STUDENT") {
    return res.status(403).json({ error: "Student access required" });
  }
  next();
}

async function seedAdmin() {
  const existing = await storage.getUserByEmail(ADMIN_EMAIL);
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await storage.createUser({
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      name: "Admin",
      surname: "User",
      affiliateCode: "ADMIN001",
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedAdmin();

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllCompetitionSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/competitions/public", async (req, res) => {
    try {
      const allCompetitions = await storage.getAllCompetitions();
      const activeCompetitions = allCompetitions.filter(c => c.status === "ACTIVE");
      res.json(activeCompetitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  app.get("/api/public/results", async (_req, res) => {
    try {
      const allCompetitions = await storage.getAllCompetitions();
      const results: Record<string, { competition: { id: string; title: string; category: string; resultsPublished: boolean }; leaderboard: any[] }[]> = {
        kid: [],
        teen: [],
        adult: [],
      };

      for (const comp of allCompetitions) {
        if (comp.status !== "ACTIVE" && comp.status !== "CLOSED") continue;
        const published = !!comp.resultsPublishedAt;
        const entry: any = {
          competition: {
            id: comp.id,
            title: comp.title,
            category: comp.category,
            resultsPublished: published,
          },
          leaderboard: [],
        };

        if (published) {
          const leaderboard = await storage.getAdminCompetitionLeaderboard(comp.id);
          entry.leaderboard = leaderboard.map((e: any) => ({
            rank: e.rank,
            name: e.name,
            city: e.city,
            country: e.country,
            finalScore: e.finalScore,
            readingSpeedWPM: e.readingSpeedWPM,
            comprehensionScore: e.comprehensionScore,
          }));
        }

        if (comp.category && results[comp.category]) {
          results[comp.category].push(entry);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Public results error:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const categoryCompetitions = await storage.getActiveCompetitions(data.category);
      const now = new Date();
      const hasOpenRegistration = categoryCompetitions.some(c => {
        if (!c.registrationStartTime && !c.registrationEndTime) return true;
        if (!c.registrationStartTime || !c.registrationEndTime) return false;
        const start = new Date(c.registrationStartTime);
        const end = new Date(c.registrationEndTime);
        return now >= start && now <= end;
      });

      if (!hasOpenRegistration) {
        return res.status(400).json({ error: "Registration is currently closed for this category" });
      }

      if (!data.birthdate) {
        return res.status(400).json({ error: "Date of birth is required" });
      }

      const birth = new Date(data.birthdate);
      if (isNaN(birth.getTime())) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }

      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
      }

      const ageRanges: Record<string, { min: number; max: number | null }> = {
        kid: { min: 6, max: 12 },
        teen: { min: 13, max: 17 },
        adult: { min: 18, max: null },
      };
      const range = ageRanges[data.category];
      if (range) {
        if (age < range.min) {
          return res.status(400).json({ error: `You must be at least ${range.min} years old for the ${data.category} category` });
        }
        if (range.max && age > range.max) {
          return res.status(400).json({ error: `You must be ${range.max} years old or younger for the ${data.category} category` });
        }
      }

      // Check if email is already registered
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email is already registered" });
      }

      let referrerId: string | undefined;
      if (data.referralCode) {
        const referrer = await storage.getUserByAffiliateCode(data.referralCode);
        if (referrer) {
          referrerId = referrer.id;
          await storage.updateUser(referrer.id, {
            referralPoints: (referrer.referralPoints || 0) + 1,
          });
        }
      }

      let affiliateCode = generateAffiliateCode();
      while (await storage.getUserByAffiliateCode(affiliateCode)) {
        affiliateCode = generateAffiliateCode();
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        name: data.name,
        surname: data.surname,
        email: data.email,
        gender: data.gender,
        birthdate: data.birthdate,
        phone: data.phone,
        city: data.city,
        country: data.country,
        category: data.category,
        affiliateCode,
        referrerId,
        passwordHash,
        role: "STUDENT",
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.json({ token, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user || user.role !== "STUDENT") {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const data = adminLoginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user || user.role !== "ADMIN") {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/me", authMiddleware, async (req: AuthRequest, res) => {
    res.json(req.user);
  });

  app.get("/api/student/dashboard", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0] || null;

      let book = null;
      let submission = null;

      if (competition) {
        book = await storage.getCompetitionBook(competition.id);
        submission = await storage.getCompetitionSubmission(competition.id, user.id);
      }

      const [prize, referrals] = await Promise.all([
        storage.getPrize(category),
        storage.getReferrals(user.id),
      ]);

      const settings = competition ? {
        id: competition.id,
        category: competition.category,
        registrationStartTime: competition.registrationStartTime,
        registrationEndTime: competition.registrationEndTime,
        competitionStartTime: competition.competitionStartTime,
        competitionEndTime: competition.competitionEndTime,
        readingDurationMinutes: competition.readingDurationMinutes,
        answeringDurationMinutes: competition.answeringDurationMinutes,
        resultsPublishedAt: competition.resultsPublishedAt,
      } : null;

      res.json({ settings, book, prize, referrals, submission, competition });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get("/api/student/reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0] || null;

      let book = null;
      let submission = null;

      if (competition) {
        book = await storage.getCompetitionBook(competition.id);
        submission = await storage.getCompetitionSubmission(competition.id, user.id);
      }

      const settings = competition ? {
        competitionStartTime: competition.competitionStartTime,
        competitionEndTime: competition.competitionEndTime,
        readingDurationMinutes: competition.readingDurationMinutes,
        answeringDurationMinutes: competition.answeringDurationMinutes,
      } : null;

      res.json({ book, submission, settings, competition });
    } catch (error) {
      res.status(500).json({ error: "Failed to load reading data" });
    }
  });

  app.post("/api/student/start-reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0];
      
      if (!competition) {
        return res.status(400).json({ error: "No active competition found" });
      }

      const now = new Date();
      
      if (competition.competitionStartTime) {
        const start = new Date(competition.competitionStartTime);
        if (now < start) {
          return res.status(400).json({ error: "Competition has not started yet" });
        }
      }
      
      if (competition.competitionEndTime) {
        const end = new Date(competition.competitionEndTime);
        if (now > end) {
          return res.status(400).json({ error: "Competition has ended" });
        }
      }

      let submission = await storage.getCompetitionSubmission(competition.id, user.id);
      
      if (submission?.readingStartAt) {
        return res.status(400).json({ error: "Reading already started" });
      }

      const readingStartAt = new Date();
      
      if (submission) {
        submission = await storage.updateSubmission(submission.id, { readingStartAt });
      } else {
        submission = await storage.createSubmission({
          userId: user.id,
          competitionId: competition.id,
          category,
          readingStartAt,
        });
      }

      res.json({ submission });
    } catch (error) {
      console.error("Start reading error:", error);
      res.status(500).json({ error: "Failed to start reading" });
    }
  });

  app.post("/api/student/finish-reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0];
      if (!competition) {
        return res.status(400).json({ error: "No active competition found" });
      }

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission?.readingStartAt) {
        return res.status(400).json({ error: "Reading not started" });
      }
      if (submission.readingEndAt) {
        return res.status(400).json({ error: "Reading already finished" });
      }

      const readingEndAt = new Date();
      const readingSeconds = Math.floor((readingEndAt.getTime() - new Date(submission.readingStartAt).getTime()) / 1000);

      const updated = await storage.updateSubmission(submission.id, {
        readingEndAt,
        answerStartAt: readingEndAt,
        readingSeconds,
      });

      res.json({ submission: updated });
    } catch (error) {
      console.error("Finish reading error:", error);
      res.status(500).json({ error: "Failed to finish reading" });
    }
  });

  app.get("/api/student/questions", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0];
      if (!competition) {
        return res.status(400).json({ error: "No active competition found" });
      }

      const [questions, submission] = await Promise.all([
        storage.getCompetitionQuestions(competition.id),
        storage.getCompetitionSubmission(competition.id, user.id),
      ]);

      let userAnswers: any[] = [];
      if (submission) {
        userAnswers = await storage.getAnswers(submission.id);
      }

      const settings = {
        competitionStartTime: competition.competitionStartTime,
        competitionEndTime: competition.competitionEndTime,
        readingDurationMinutes: competition.readingDurationMinutes,
        answeringDurationMinutes: competition.answeringDurationMinutes,
      };

      res.json({ questions, submission, settings, answers: userAnswers, competition });
    } catch (error) {
      res.status(500).json({ error: "Failed to load questions" });
    }
  });

  app.post("/api/student/answers", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;
      const { questionId, value } = req.body;

      if (!questionId) {
        return res.status(400).json({ error: "Question ID is required" });
      }

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0];
      if (!competition) {
        return res.status(400).json({ error: "No active competition found" });
      }

      if (competition.competitionEndTime) {
        const now = new Date();
        const end = new Date(competition.competitionEndTime);
        if (now > end) {
          return res.status(400).json({ error: "Competition has ended. Cannot submit new answers." });
        }
      }

      const answerValue = value !== undefined ? String(value) : "";

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission?.readingEndAt) {
        return res.status(400).json({ error: "Reading not completed" });
      }
      if (submission.answerEndAt) {
        return res.status(400).json({ error: "Competition already finished" });
      }

      const question = await storage.getCompetitionQuestion(questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const answer = await storage.upsertAnswer(submission.id, questionId, question.type as "MCQ" | "TEXT", answerValue);

      res.json({ answer });
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  app.post("/api/student/finish-competition", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const activeCompetitions = await storage.getActiveCompetitions(category);
      const competition = activeCompetitions[0];
      if (!competition) {
        return res.status(400).json({ error: "No active competition found" });
      }

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission?.readingEndAt) {
        return res.status(400).json({ error: "Reading not completed" });
      }
      if (submission.answerEndAt) {
        return res.status(400).json({ error: "Competition already finished" });
      }

      const answerEndAt = new Date();
      const answerStartAt = submission.answerStartAt || submission.readingEndAt;
      const answerSeconds = answerStartAt 
        ? Math.floor((answerEndAt.getTime() - new Date(answerStartAt).getTime()) / 1000)
        : 0;

      await storage.updateSubmission(submission.id, {
        answerEndAt,
        answerSeconds,
        status: "SUBMITTED",
      });

      const updated = await storage.recalculateSubmissionScores(submission.id);

      res.json({ 
        success: true,
        submission: updated,
        readingSeconds: updated?.readingSeconds || 0,
        answerSeconds: updated?.answerSeconds || 0,
      });
    } catch (error) {
      console.error("Finish competition error:", error);
      res.status(500).json({ error: "Failed to finish competition" });
    }
  });

  app.get("/api/admin/settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const settings = await storage.getAllCompetitionSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const category = categoryResult.data;

      const dataResult = settingsUpdateSchema.safeParse(req.body);
      if (!dataResult.success) {
        return res.status(400).json({ error: dataResult.error.errors[0].message });
      }
      const data = dataResult.data;

      const settings = await storage.upsertCompetitionSettings(category, {
        registrationStartTime: data.registrationStartTime ? new Date(data.registrationStartTime) : null,
        registrationEndTime: data.registrationEndTime ? new Date(data.registrationEndTime) : null,
        competitionStartTime: data.competitionStartTime ? new Date(data.competitionStartTime) : null,
        readingDurationMinutes: data.readingDurationMinutes || 30,
        answeringDurationMinutes: data.answeringDurationMinutes || 15,
      });

      res.json(settings);
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/admin/books", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allBooks = await storage.getAllBooks();
      res.json(allBooks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  app.post("/api/admin/book/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const category = categoryResult.data;

      const dataResult = bookSchema.safeParse(req.body);
      if (!dataResult.success) {
        return res.status(400).json({ error: dataResult.error.errors[0].message });
      }
      const data = dataResult.data;

      const book = await storage.upsertBook(category, data);
      res.json(book);
    } catch (error) {
      console.error("Save book error:", error);
      res.status(500).json({ error: "Failed to save book" });
    }
  });

  app.delete("/api/admin/book/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const category = req.params.category as Category;
      await storage.deleteBook(category);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  app.get("/api/admin/questions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const questions = await storage.getAllQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.post("/api/admin/questions/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const category = categoryResult.data;

      const dataResult = questionCreateSchema.safeParse(req.body);
      if (!dataResult.success) {
        return res.status(400).json({ error: dataResult.error.errors[0].message });
      }
      const data = dataResult.data;

      const question = await storage.createQuestion({
        category,
        type: data.type,
        prompt: data.prompt,
        optionsJson: data.optionsJson ?? null,
        correctAnswer: data.correctAnswer ?? null,
      });

      res.json(question);
    } catch (error) {
      console.error("Create question error:", error);
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.put("/api/admin/questions/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      const dataResult = questionUpdateSchema.safeParse(req.body);
      if (!dataResult.success) {
        return res.status(400).json({ error: dataResult.error.errors[0].message });
      }
      const data = dataResult.data;

      const question = await storage.updateQuestion(id, {
        category: data.category,
        type: data.type,
        prompt: data.prompt,
        optionsJson: data.optionsJson ?? null,
        correctAnswer: data.correctAnswer ?? null,
      });

      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  app.delete("/api/admin/questions/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuestion(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  app.get("/api/admin/prizes", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const prizes = await storage.getAllPrizes();
      res.json(prizes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prizes" });
    }
  });

  app.put("/api/admin/prizes/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const category = categoryResult.data;

      const dataResult = prizeSchema.safeParse(req.body);
      if (!dataResult.success) {
        return res.status(400).json({ error: dataResult.error.errors[0].message });
      }
      const data = dataResult.data;

      const prize = await storage.upsertPrize(category, data.content || "");
      res.json(prize);
    } catch (error) {
      res.status(500).json({ error: "Failed to update prizes" });
    }
  });

  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/submissions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.put("/api/admin/submissions/:id/manual-score", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { manualScore } = req.body;

      const submission = await storage.updateSubmission(id, { manualScore });
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to update score" });
    }
  });

  app.get("/api/admin/export/users.csv", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      const headers = ["Name", "Surname", "Category", "City", "Country", "Phone", "Affiliate Code", "Referral Points", "Created At"];
      const rows = users.map((u) => [
        u.name,
        u.surname,
        u.category || "",
        u.city || "",
        u.country || "",
        u.phone || "",
        u.affiliateCode || "",
        String(u.referralPoints || 0),
        u.createdAt ? new Date(u.createdAt).toISOString() : "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=users.csv");
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export users" });
    }
  });

  app.get("/api/student/leaderboard/:category", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const category = categoryResult.data;

      const settings = await storage.getCompetitionSettings(category);
      if (!settings?.resultsPublishedAt) {
        return res.status(403).json({ error: "Leaderboard is not available yet." });
      }

      const leaderboard = await storage.getLeaderboard(category);
      res.json(leaderboard.slice(0, 100));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/student/my-rank", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const settings = await storage.getCompetitionSettings(category);
      if (!settings?.resultsPublishedAt) {
        return res.status(403).json({ error: "Results not published yet" });
      }

      const leaderboard = await storage.getLeaderboard(category);
      const myEntry = leaderboard.find(e => e.userId === user.id);

      res.json({ 
        rank: myEntry?.rank || null,
        totalParticipants: leaderboard.length,
        topTen: leaderboard.slice(0, 10),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rank" });
    }
  });

  app.get("/api/admin/submissions/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getSubmissionWithDetails(id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission details" });
    }
  });

  app.put("/api/admin/submissions/:id/status", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["SUBMITTED", "REVIEWED", "FINALIZED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const submission = await storage.updateSubmission(id, { status, updatedAt: new Date() });
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.post("/api/admin/submissions/:id/recalculate", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.recalculateSubmissionScores(id);
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to recalculate submission" });
    }
  });

  app.put("/api/admin/answers/:answerId/points", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { answerId } = req.params;
      const { points } = req.body;

      if (typeof points !== "number" || points < 0) {
        return res.status(400).json({ error: "Invalid points value" });
      }

      const answer = await storage.updateAnswerPoints(answerId, points);
      if (!answer) {
        return res.status(404).json({ error: "Answer not found" });
      }

      const updatedSubmission = await storage.recalculateManualScore(answer.submissionId);

      res.json({ 
        success: true, 
        answer,
        manualScore: updatedSubmission?.manualScore,
        finalScore: updatedSubmission?.finalScore
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update answer points" });
    }
  });

  app.post("/api/admin/leaderboard/recalculate", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { category } = req.query;
      const categoryResult = categorySchema.safeParse(category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const submissions = await storage.getSubmissionsByCategory(categoryResult.data);
      
      for (const sub of submissions) {
        await storage.recalculateSubmissionScores(sub.id);
      }

      const leaderboard = await storage.getLeaderboard(categoryResult.data);
      res.json({ success: true, count: submissions.length, leaderboard });
    } catch (error) {
      res.status(500).json({ error: "Failed to recalculate leaderboard" });
    }
  });

  app.put("/api/admin/results/publish/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const currentSettings = await storage.getCompetitionSettings(categoryResult.data);
      if (currentSettings?.competitionEndTime) {
        const now = new Date();
        const end = new Date(currentSettings.competitionEndTime);
        if (now < end) {
          return res.status(400).json({ error: "Cannot publish results before competition ends" });
        }
      }

      const settings = await storage.publishResults(categoryResult.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to publish results" });
    }
  });

  app.put("/api/admin/results/unpublish/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const settings = await storage.unpublishResults(categoryResult.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to unpublish results" });
    }
  });

  app.get("/api/admin/leaderboard/:category", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.params.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const leaderboard = await storage.getAdminLeaderboard(categoryResult.data);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/admin/export/leaderboard.csv", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const categoryResult = categorySchema.safeParse(req.query.category);
      if (!categoryResult.success) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const leaderboard = await storage.getAdminLeaderboard(categoryResult.data);
      
      const headers = ["Rank", "Name", "City", "Country", "Final Score", "Reading Time (s)", "Answer Time (s)"];
      const rows = leaderboard.map((e) => [
        String(e.rank),
        e.name,
        e.city || "",
        e.country || "",
        String(e.finalScore),
        String(e.readingSeconds || 0),
        String(e.answerSeconds || 0),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=leaderboard-${categoryResult.data}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export leaderboard" });
    }
  });

  // ==================== COMPETITION MANAGEMENT ROUTES ====================

  const competitionCreateSchema = z.object({
    title: z.string().min(1, "Title is required"),
    category: categorySchema,
    description: z.string().optional(),
    registrationStartTime: z.string().nullable().optional(),
    registrationEndTime: z.string().nullable().optional(),
    competitionStartTime: z.string().nullable().optional(),
    competitionEndTime: z.string().nullable().optional(),
    readingDurationMinutes: z.number().min(1).optional(),
    answeringDurationMinutes: z.number().min(1).optional(),
  });

  const competitionUpdateSchema = competitionCreateSchema.partial();

  // Get all competitions (admin)
  app.get("/api/admin/competitions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allCompetitions = await storage.getAllCompetitions();
      const competitionsWithDetails = await Promise.all(
        allCompetitions.map(async (comp) => {
          const details = await storage.getCompetitionWithDetails(comp.id);
          return details || comp;
        })
      );
      res.json(competitionsWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  // Get single competition (admin)
  app.get("/api/admin/competitions/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const competition = await storage.getCompetitionWithDetails(req.params.id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competition" });
    }
  });

  // Create competition
  app.post("/api/admin/competitions", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = competitionCreateSchema.parse(req.body);
      const competition = await storage.createCompetition({
        title: data.title,
        category: data.category,
        description: data.description || null,
        registrationStartTime: data.registrationStartTime ? new Date(data.registrationStartTime) : null,
        registrationEndTime: data.registrationEndTime ? new Date(data.registrationEndTime) : null,
        competitionStartTime: data.competitionStartTime ? new Date(data.competitionStartTime) : null,
        competitionEndTime: data.competitionEndTime ? new Date(data.competitionEndTime) : null,
        readingDurationMinutes: data.readingDurationMinutes || 30,
        answeringDurationMinutes: data.answeringDurationMinutes || 15,
        status: "DRAFT",
      });
      res.json(competition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create competition" });
    }
  });

  // Update competition
  app.put("/api/admin/competitions/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = competitionUpdateSchema.parse(req.body);
      const updateData: any = { ...data };
      
      if (data.registrationStartTime !== undefined) {
        updateData.registrationStartTime = data.registrationStartTime ? new Date(data.registrationStartTime) : null;
      }
      if (data.registrationEndTime !== undefined) {
        updateData.registrationEndTime = data.registrationEndTime ? new Date(data.registrationEndTime) : null;
      }
      if (data.competitionStartTime !== undefined) {
        updateData.competitionStartTime = data.competitionStartTime ? new Date(data.competitionStartTime) : null;
      }
      if (data.competitionEndTime !== undefined) {
        updateData.competitionEndTime = data.competitionEndTime ? new Date(data.competitionEndTime) : null;
      }

      const competition = await storage.updateCompetition(req.params.id, updateData);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to update competition" });
    }
  });

  // Delete competition
  app.delete("/api/admin/competitions/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteCompetition(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete competition" });
    }
  });

  // Publish competition (make active)
  app.put("/api/admin/competitions/:id/publish", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const details = await storage.getCompetitionWithDetails(req.params.id);
      if (!details) {
        return res.status(404).json({ error: "Competition not found" });
      }
      const issues: string[] = [];
      if (!details.competitionStartTime) issues.push("Set a competition start time");
      if (!details.competitionEndTime) issues.push("Set a competition end time");
      if ((details.questionCount || 0) === 0) issues.push("Add at least one question");
      if (!details.book) issues.push("Add a book/reading material");
      if (issues.length > 0) {
        return res.status(400).json({ error: "Cannot publish: " + issues.join(". ") + "." });
      }
      const competition = await storage.publishCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to publish competition" });
    }
  });

  // Close competition
  app.put("/api/admin/competitions/:id/close", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const competition = await storage.closeCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to close competition" });
    }
  });

  // Publish competition results
  app.put("/api/admin/competitions/:id/results/publish", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getCompetition(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Competition not found" });
      }
      if (existing.competitionEndTime) {
        const now = new Date();
        const end = new Date(existing.competitionEndTime);
        if (now < end) {
          return res.status(400).json({ error: "Cannot publish results before competition ends" });
        }
      }
      const competition = await storage.publishCompetitionResults(req.params.id);
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to publish results" });
    }
  });

  // Unpublish competition results
  app.put("/api/admin/competitions/:id/results/unpublish", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const competition = await storage.unpublishCompetitionResults(req.params.id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to unpublish results" });
    }
  });

  // Competition book management
  app.get("/api/admin/competitions/:id/book", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const book = await storage.getCompetitionBook(req.params.id);
      res.json(book || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  app.post("/api/admin/competitions/:id/book", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = bookSchema.parse(req.body);
      const book = await storage.upsertCompetitionBook(req.params.id, data);
      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to save book" });
    }
  });

  app.delete("/api/admin/competitions/:id/book", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteCompetitionBook(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // Competition questions management
  app.get("/api/admin/competitions/:id/questions", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const questions = await storage.getCompetitionQuestions(req.params.id);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.post("/api/admin/competitions/:id/questions", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = questionCreateSchema.parse(req.body);
      const question = await storage.createCompetitionQuestion({
        competitionId: req.params.id,
        type: data.type,
        prompt: data.prompt,
        optionsJson: data.optionsJson || null,
        correctAnswer: data.correctAnswer || null,
      });
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.put("/api/admin/competitions/:id/questions/:questionId", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = questionCreateSchema.parse(req.body);
      const question = await storage.updateCompetitionQuestion(req.params.questionId, {
        type: data.type,
        prompt: data.prompt,
        optionsJson: data.optionsJson || null,
        correctAnswer: data.correctAnswer || null,
      });
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  app.delete("/api/admin/competitions/:id/questions/:questionId", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteCompetitionQuestion(req.params.questionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Competition submissions and leaderboard
  app.get("/api/admin/competitions/:id/submissions", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const submissions = await storage.getCompetitionSubmissions(req.params.id);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/admin/competitions/:id/leaderboard", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const leaderboard = await storage.getAdminCompetitionLeaderboard(req.params.id);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // ==================== STUDENT COMPETITION ROUTES ====================

  // Get available competitions for student's category
  app.get("/api/student/competitions", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      if (!user.category) {
        return res.status(400).json({ error: "User category not set" });
      }

      const now = new Date();
      const activeCompetitions = await storage.getActiveCompetitions(user.category);
      
      const availableCompetitions = [];
      const registeredIds = new Set<string>();
      
      const userRegistrations = await storage.getUserRegistrations(user.id);
      for (const reg of userRegistrations) {
        registeredIds.add(reg.competitionId);
      }

      for (const comp of activeCompetitions) {
        const isRegistered = registeredIds.has(comp.id);
        const canRegister = comp.registrationStartTime && comp.registrationEndTime
          ? now >= new Date(comp.registrationStartTime) && now <= new Date(comp.registrationEndTime)
          : false;

        availableCompetitions.push({
          ...comp,
          isRegistered,
          canRegister: !isRegistered && canRegister,
        });
      }

      res.json(availableCompetitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  // Get student's registered competitions
  app.get("/api/student/my-competitions", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const registrations = await storage.getUserRegistrations(user.id);
      
      const competitionsWithStatus = await Promise.all(
        registrations.map(async (reg) => {
          const competition = await storage.getCompetition(reg.competitionId);
          if (!competition) return null;

          const submission = await storage.getCompetitionSubmission(reg.competitionId, user.id);
          
          let status = "registered";
          if (submission?.answerEndAt) {
            status = "submitted";
          } else if (submission?.readingEndAt) {
            status = "answering";
          } else if (submission?.readingStartAt) {
            status = "reading";
          }

          if (competition.status === "CLOSED") {
            status = "closed";
          }

          return {
            ...competition,
            registeredAt: reg.registeredAt,
            submissionStatus: status,
            submission,
          };
        })
      );

      res.json(competitionsWithStatus.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch my competitions" });
    }
  });

  // Get single competition details for student
  app.get("/api/student/competitions/:id", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const competition = await storage.getCompetition(req.params.id);
      
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      if (competition.category !== user.category) {
        return res.status(403).json({ error: "Competition not in your category" });
      }

      const registration = await storage.getRegistration(competition.id, user.id);
      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      const book = await storage.getCompetitionBook(competition.id);

      res.json({
        ...competition,
        isRegistered: !!registration,
        submission,
        book,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competition" });
    }
  });

  // Register for competition
  app.post("/api/student/competitions/:id/register", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const competition = await storage.getCompetition(req.params.id);

      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      if (competition.category !== user.category) {
        return res.status(403).json({ error: "Competition not in your category" });
      }

      if (competition.status !== "ACTIVE") {
        return res.status(400).json({ error: "Competition is not active" });
      }

      const now = new Date();
      if (competition.registrationStartTime && now < new Date(competition.registrationStartTime)) {
        return res.status(400).json({ error: "Registration has not started yet" });
      }
      if (competition.registrationEndTime && now > new Date(competition.registrationEndTime)) {
        return res.status(400).json({ error: "Registration has ended" });
      }

      const existing = await storage.getRegistration(competition.id, user.id);
      if (existing) {
        return res.status(400).json({ error: "Already registered for this competition" });
      }

      const registration = await storage.registerForCompetition(competition.id, user.id);
      res.json(registration);
    } catch (error) {
      res.status(500).json({ error: "Failed to register for competition" });
    }
  });

  // Start reading for competition
  app.post("/api/student/competitions/:id/start-reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const competition = await storage.getCompetition(req.params.id);

      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      const registration = await storage.getRegistration(competition.id, user.id);
      if (!registration) {
        return res.status(400).json({ error: "Not registered for this competition" });
      }

      const now = new Date();
      if (competition.competitionStartTime && now < new Date(competition.competitionStartTime)) {
        return res.status(400).json({ error: "Competition has not started yet" });
      }
      if (competition.competitionEndTime && now > new Date(competition.competitionEndTime)) {
        return res.status(400).json({ error: "Competition has ended" });
      }

      let submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (submission?.readingStartAt) {
        return res.status(400).json({ error: "Reading already started" });
      }

      submission = await storage.createSubmission({
        userId: user.id,
        competitionId: competition.id,
        category: competition.category,
        readingStartAt: now,
      });

      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to start reading" });
    }
  });

  // Finish reading for competition
  app.post("/api/student/competitions/:id/finish-reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const competition = await storage.getCompetition(req.params.id);

      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission) {
        return res.status(400).json({ error: "No submission found" });
      }
      if (submission.readingEndAt) {
        return res.status(400).json({ error: "Reading already finished" });
      }

      const now = new Date();
      const readingSeconds = submission.readingStartAt 
        ? Math.floor((now.getTime() - new Date(submission.readingStartAt).getTime()) / 1000)
        : 0;

      const updated = await storage.updateSubmission(submission.id, {
        readingEndAt: now,
        answerStartAt: now,
        readingSeconds,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to finish reading" });
    }
  });

  // Get competition questions for student
  app.get("/api/student/competitions/:id/questions", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const competition = await storage.getCompetition(req.params.id);

      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission?.readingEndAt) {
        return res.status(400).json({ error: "Must finish reading first" });
      }

      const questions = await storage.getCompetitionQuestions(competition.id);
      const existingAnswers = await storage.getAnswers(submission.id);

      const questionsWithAnswers = questions.map((q) => {
        const answer = existingAnswers.find((a) => a.competitionQuestionId === q.id);
        return {
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          optionsJson: q.optionsJson,
          currentAnswer: answer?.value || null,
        };
      });

      res.json({
        questions: questionsWithAnswers,
        submission,
        competition,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Submit answer for competition question
  app.post("/api/student/competitions/:id/answer", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const { questionId, value } = req.body;

      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      if (competition.competitionEndTime) {
        const now = new Date();
        const end = new Date(competition.competitionEndTime);
        if (now > end) {
          return res.status(400).json({ error: "Competition has ended" });
        }
      }

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission || submission.answerEndAt) {
        return res.status(400).json({ error: "Cannot submit answers" });
      }

      const question = await storage.getCompetitionQuestion(questionId);
      if (!question || question.competitionId !== competition.id) {
        return res.status(400).json({ error: "Invalid question" });
      }

      // Find or create answer - we need to handle competitionQuestionId differently
      const existingAnswers = await storage.getAnswers(submission.id);
      const existingAnswer = existingAnswers.find((a) => a.competitionQuestionId === questionId);

      if (existingAnswer) {
        await db.update(answers).set({ value }).where(eq(answers.id, existingAnswer.id));
      } else {
        await db.insert(answers).values({
          submissionId: submission.id,
          questionId: questionId, // Using questionId for legacy compatibility
          competitionQuestionId: questionId,
          type: question.type,
          value,
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Finish competition
  app.post("/api/student/competitions/:id/finish", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const competition = await storage.getCompetition(req.params.id);

      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      const submission = await storage.getCompetitionSubmission(competition.id, user.id);
      if (!submission) {
        return res.status(400).json({ error: "No submission found" });
      }
      if (submission.answerEndAt) {
        return res.status(400).json({ error: "Competition already finished" });
      }

      const now = new Date();
      const answerSeconds = submission.answerStartAt
        ? Math.floor((now.getTime() - new Date(submission.answerStartAt).getTime()) / 1000)
        : 0;

      // Calculate scores
      const questions = await storage.getCompetitionQuestions(competition.id);
      const submissionAnswers = await storage.getAnswers(submission.id);

      const mcqQuestions = questions.filter((q) => q.type === "MCQ");
      let mcqCorrectCount = 0;
      let mcqWrongCount = 0;

      for (const q of mcqQuestions) {
        const answer = submissionAnswers.find((a) => a.competitionQuestionId === q.id);
        if (answer?.value === q.correctAnswer) {
          mcqCorrectCount++;
        } else if (answer?.value) {
          mcqWrongCount++;
        }
      }

      const autoScore = mcqCorrectCount;
      const finalScore = autoScore;

      const updated = await storage.updateSubmission(submission.id, {
        answerEndAt: now,
        answerSeconds,
        mcqTotalCount: mcqQuestions.length,
        mcqCorrectCount,
        mcqWrongCount,
        autoScore,
        finalScore,
        status: "SUBMITTED",
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to finish competition" });
    }
  });

  // Get competition leaderboard (public if results published)
  app.get("/api/competitions/:id/leaderboard", async (req: Request, res) => {
    try {
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      if (!competition.resultsPublishedAt) {
        return res.status(403).json({ error: "Results not yet published" });
      }

      const leaderboard = await storage.getCompetitionLeaderboard(req.params.id);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  return httpServer;
}
