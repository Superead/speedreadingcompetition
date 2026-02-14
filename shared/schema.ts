import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, uniqueIndex, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["STUDENT", "ADMIN"]);
export const categoryEnum = pgEnum("category", ["kid", "teen", "adult"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const questionTypeEnum = pgEnum("question_type", ["MCQ", "TEXT"]);
export const submissionStatusEnum = pgEnum("submission_status", ["SUBMITTED", "REVIEWED", "FINALIZED"]);
export const competitionStatusEnum = pgEnum("competition_status", ["DRAFT", "ACTIVE", "CLOSED"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STUDENT"),
  name: text("name").notNull(),
  surname: text("surname").notNull(),
  gender: genderEnum("gender"),
  birthdate: text("birthdate"),
  phone: text("phone"),
  city: text("city"),
  country: text("country"),
  category: categoryEnum("category"),
  affiliateCode: text("affiliate_code").unique(),
  referrerId: varchar("referrer_id"),
  referralPoints: integer("referral_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionSettings = pgTable("competition_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: categoryEnum("category").notNull().unique(),
  registrationStartTime: timestamp("registration_start_time"),
  registrationEndTime: timestamp("registration_end_time"),
  competitionStartTime: timestamp("competition_start_time"),
  competitionEndTime: timestamp("competition_end_time"),
  readingDurationMinutes: integer("reading_duration_minutes").default(30),
  answeringDurationMinutes: integer("answering_duration_minutes").default(15),
  resultsPublishedAt: timestamp("results_published_at"),
});

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: categoryEnum("category").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: categoryEnum("category").notNull(),
  type: questionTypeEnum("type").notNull(),
  prompt: text("prompt").notNull(),
  optionsJson: text("options_json"),
  correctAnswer: text("correct_answer"),
  maxPoints: integer("max_points").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: categoryEnum("category").notNull(),
  description: text("description"),
  registrationStartTime: timestamp("registration_start_time"),
  registrationEndTime: timestamp("registration_end_time"),
  competitionStartTime: timestamp("competition_start_time"),
  competitionEndTime: timestamp("competition_end_time"),
  readingDurationMinutes: integer("reading_duration_minutes").default(30),
  answeringDurationMinutes: integer("answering_duration_minutes").default(15),
  status: competitionStatusEnum("status").notNull().default("DRAFT"),
  resultsPublishedAt: timestamp("results_published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionBooks = pgTable("competition_books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  content: text("content"),
  wordCount: integer("word_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionQuestions = pgTable("competition_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  type: questionTypeEnum("type").notNull(),
  prompt: text("prompt").notNull(),
  optionsJson: text("options_json"),
  correctAnswer: text("correct_answer"),
  maxPoints: integer("max_points").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionRegistrations = pgTable("competition_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  registeredAt: timestamp("registered_at").defaultNow(),
}, (table) => [
  uniqueIndex("competition_user_unique").on(table.competitionId, table.userId),
]);

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  competitionId: varchar("competition_id").references(() => competitions.id),
  category: categoryEnum("category").notNull(),
  readingStartAt: timestamp("reading_start_at"),
  readingEndAt: timestamp("reading_end_at"),
  answerStartAt: timestamp("answer_start_at"),
  answerEndAt: timestamp("answer_end_at"),
  readingSeconds: integer("reading_seconds"),
  answerSeconds: integer("answer_seconds"),
  mcqCorrectCount: integer("mcq_correct_count").default(0),
  mcqWrongCount: integer("mcq_wrong_count").default(0),
  mcqTotalCount: integer("mcq_total_count").default(0),
  autoScore: integer("auto_score").default(0),
  manualScore: integer("manual_score").default(0),
  finalScore: real("final_score").default(0),
  readingSpeedWPM: real("reading_speed_wpm").default(0),
  comprehensionScore: real("comprehension_score").default(0),
  status: submissionStatusEnum("status").default("SUBMITTED"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id),
  questionId: varchar("question_id").references(() => questions.id),
  competitionQuestionId: varchar("competition_question_id").references(() => competitionQuestions.id),
  type: questionTypeEnum("type").notNull(),
  value: text("value"),
  isCorrect: boolean("is_correct"),
  points: integer("points").default(0),
});

export const prizes = pgTable("prizes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: categoryEnum("category").notNull().unique(),
  content: text("content"),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  referrer: one(users, {
    fields: [users.referrerId],
    references: [users.id],
    relationName: "referrals",
  }),
  referrals: many(users, { relationName: "referrals" }),
  submissions: many(submissions),
  registrations: many(competitionRegistrations),
}));

export const competitionsRelations = relations(competitions, ({ many }) => ({
  books: many(competitionBooks),
  questions: many(competitionQuestions),
  registrations: many(competitionRegistrations),
  submissions: many(submissions),
}));

export const competitionBooksRelations = relations(competitionBooks, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionBooks.competitionId],
    references: [competitions.id],
  }),
}));

export const competitionQuestionsRelations = relations(competitionQuestions, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionQuestions.competitionId],
    references: [competitions.id],
  }),
}));

export const competitionRegistrationsRelations = relations(competitionRegistrations, ({ one }) => ({
  competition: one(competitions, {
    fields: [competitionRegistrations.competitionId],
    references: [competitions.id],
  }),
  user: one(users, {
    fields: [competitionRegistrations.userId],
    references: [users.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  competition: one(competitions, {
    fields: [submissions.competitionId],
    references: [competitions.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  submission: one(submissions, {
    fields: [answers.submissionId],
    references: [submissions.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  competitionQuestion: one(competitionQuestions, {
    fields: [answers.competitionQuestionId],
    references: [competitionQuestions.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  referralPoints: true,
  createdAt: true,
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  gender: z.enum(["male", "female", "other"]).optional(),
  birthdate: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  referralCode: z.string().optional(),
  category: z.enum(["kid", "teen", "adult"]),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export const insertCompetitionSettingsSchema = createInsertSchema(competitionSettings).omit({
  id: true,
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionBookSchema = createInsertSchema(competitionBooks).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionQuestionSchema = createInsertSchema(competitionQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionRegistrationSchema = createInsertSchema(competitionRegistrations).omit({
  id: true,
  registeredAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
});

export const insertPrizeSchema = createInsertSchema(prizes).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export type CompetitionSettings = typeof competitionSettings.$inferSelect;
export type InsertCompetitionSettings = z.infer<typeof insertCompetitionSettingsSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;

export type CompetitionBook = typeof competitionBooks.$inferSelect;
export type InsertCompetitionBook = z.infer<typeof insertCompetitionBookSchema>;

export type CompetitionQuestion = typeof competitionQuestions.$inferSelect;
export type InsertCompetitionQuestion = z.infer<typeof insertCompetitionQuestionSchema>;

export type CompetitionRegistration = typeof competitionRegistrations.$inferSelect;
export type InsertCompetitionRegistration = z.infer<typeof insertCompetitionRegistrationSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type Prize = typeof prizes.$inferSelect;
export type InsertPrize = z.infer<typeof insertPrizeSchema>;

export type Category = "kid" | "teen" | "adult";
export type Role = "STUDENT" | "ADMIN";
export type Gender = "male" | "female" | "other";
export type QuestionType = "MCQ" | "TEXT";
export type SubmissionStatus = "SUBMITTED" | "REVIEWED" | "FINALIZED";
export type CompetitionStatus = "DRAFT" | "ACTIVE" | "CLOSED";
