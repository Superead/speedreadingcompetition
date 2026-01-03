import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  registerSchema, loginSchema, adminLoginSchema, 
  type Category, type User 
} from "@shared/schema";
import { z } from "zod";

const categorySchema = z.enum(["kid", "teen", "adult"]);

const settingsUpdateSchema = z.object({
  registrationStartTime: z.string().nullable().optional(),
  registrationEndTime: z.string().nullable().optional(),
  competitionStartTime: z.string().nullable().optional(),
  readingDurationMinutes: z.number().min(1).optional(),
  answeringDurationMinutes: z.number().min(1).optional(),
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

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const settings = await storage.getCompetitionSettings(data.category);
      if (settings) {
        const now = new Date();
        const start = settings.registrationStartTime ? new Date(settings.registrationStartTime) : null;
        const end = settings.registrationEndTime ? new Date(settings.registrationEndTime) : null;
        
        if (start && now < start) {
          return res.status(400).json({ error: "Registration has not started yet" });
        }
        if (end && now > end) {
          return res.status(400).json({ error: "Registration has ended" });
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

      const [settings, book, prize, referrals, submission] = await Promise.all([
        storage.getCompetitionSettings(category),
        storage.getBook(category),
        storage.getPrize(category),
        storage.getReferrals(user.id),
        storage.getSubmission(user.id, category),
      ]);

      res.json({ settings, book, prize, referrals, submission });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get("/api/student/reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const [book, submission, settings] = await Promise.all([
        storage.getBook(category),
        storage.getSubmission(user.id, category),
        storage.getCompetitionSettings(category),
      ]);

      res.json({ book, submission, settings });
    } catch (error) {
      res.status(500).json({ error: "Failed to load reading data" });
    }
  });

  app.post("/api/student/start-reading", authMiddleware, studentMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const category = user.category as Category;

      const settings = await storage.getCompetitionSettings(category);
      if (settings?.competitionStartTime) {
        const now = new Date();
        const start = new Date(settings.competitionStartTime);
        if (now < start) {
          return res.status(400).json({ error: "Competition has not started yet" });
        }
      }

      let submission = await storage.getSubmission(user.id, category);
      
      if (submission?.readingStartAt) {
        return res.status(400).json({ error: "Reading already started" });
      }

      const readingStartAt = new Date();
      
      if (submission) {
        submission = await storage.updateSubmission(submission.id, { readingStartAt });
      } else {
        submission = await storage.createSubmission({
          userId: user.id,
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

      const submission = await storage.getSubmission(user.id, category);
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

      const [questions, submission, settings] = await Promise.all([
        storage.getQuestions(category),
        storage.getSubmission(user.id, category),
        storage.getCompetitionSettings(category),
      ]);

      let userAnswers: any[] = [];
      if (submission) {
        userAnswers = await storage.getAnswers(submission.id);
      }

      res.json({ questions, submission, settings, answers: userAnswers });
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

      const answerValue = value !== undefined ? String(value) : "";

      const submission = await storage.getSubmission(user.id, category);
      if (!submission?.readingEndAt) {
        return res.status(400).json({ error: "Reading not completed" });
      }
      if (submission.answerEndAt) {
        return res.status(400).json({ error: "Competition already finished" });
      }

      const question = await storage.getQuestion(questionId);
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

      const submission = await storage.getSubmission(user.id, category);
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

  return httpServer;
}
