CREATE TYPE "public"."category" AS ENUM('kid', 'teen', 'adult');--> statement-breakpoint
CREATE TYPE "public"."competition_status" AS ENUM('DRAFT', 'ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('MCQ', 'TEXT');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('STUDENT', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('SUBMITTED', 'REVIEWED', 'FINALIZED');--> statement-breakpoint
CREATE TABLE "answers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar NOT NULL,
	"question_id" varchar,
	"competition_question_id" varchar,
	"type" "question_type" NOT NULL,
	"value" text,
	"is_correct" boolean,
	"points" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"link_url" text,
	"link_text" text,
	"bg_color" text DEFAULT '#3b82f6',
	"text_color" text DEFAULT '#ffffff',
	"is_active" boolean DEFAULT false,
	"position" text DEFAULT 'top',
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"title" text NOT NULL,
	"file_url" text,
	"content" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competition_books" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" varchar NOT NULL,
	"title" text NOT NULL,
	"file_url" text,
	"content" text,
	"word_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competition_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" varchar NOT NULL,
	"type" "question_type" NOT NULL,
	"prompt" text NOT NULL,
	"options_json" text,
	"correct_answer" text,
	"max_points" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competition_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"registered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competition_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"registration_start_time" timestamp,
	"registration_end_time" timestamp,
	"competition_start_time" timestamp,
	"competition_end_time" timestamp,
	"reading_duration_minutes" integer DEFAULT 30,
	"answering_duration_minutes" integer DEFAULT 15,
	"results_published_at" timestamp,
	CONSTRAINT "competition_settings_category_unique" UNIQUE("category")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" "category" NOT NULL,
	"description" text,
	"registration_start_time" timestamp,
	"registration_end_time" timestamp,
	"competition_start_time" timestamp,
	"competition_end_time" timestamp,
	"reading_duration_minutes" integer DEFAULT 30,
	"answering_duration_minutes" integer DEFAULT 15,
	"status" "competition_status" DEFAULT 'DRAFT' NOT NULL,
	"prize_content" text,
	"results_published_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prizes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"content" text,
	CONSTRAINT "prizes_category_unique" UNIQUE("category")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"type" "question_type" NOT NULL,
	"prompt" text NOT NULL,
	"options_json" text,
	"correct_answer" text,
	"max_points" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_stats_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "social_shares" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"platform" text NOT NULL,
	"share_type" text NOT NULL,
	"reference_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"competition_id" varchar,
	"category" "category" NOT NULL,
	"reading_start_at" timestamp,
	"reading_end_at" timestamp,
	"answer_start_at" timestamp,
	"answer_end_at" timestamp,
	"reading_seconds" integer,
	"answer_seconds" integer,
	"mcq_correct_count" integer DEFAULT 0,
	"mcq_wrong_count" integer DEFAULT 0,
	"mcq_total_count" integer DEFAULT 0,
	"auto_score" integer DEFAULT 0,
	"manual_score" integer DEFAULT 0,
	"final_score" real DEFAULT 0,
	"reading_speed_wpm" real DEFAULT 0,
	"comprehension_score" real DEFAULT 0,
	"status" "submission_status" DEFAULT 'SUBMITTED',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"source" text DEFAULT 'website',
	"is_active" boolean DEFAULT true,
	"subscribed_at" timestamp DEFAULT now(),
	"unsubscribed_at" timestamp,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "category",
	"quote" text NOT NULL,
	"role" text,
	"avatar_url" text,
	"rating" integer DEFAULT 5,
	"is_published" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'STUDENT' NOT NULL,
	"name" text NOT NULL,
	"surname" text NOT NULL,
	"gender" "gender",
	"birthdate" text,
	"phone" text,
	"city" text,
	"country" text,
	"category" "category",
	"affiliate_code" text,
	"referrer_id" varchar,
	"referral_points" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_affiliate_code_unique" UNIQUE("affiliate_code")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_competition_question_id_competition_questions_id_fk" FOREIGN KEY ("competition_question_id") REFERENCES "public"."competition_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_books" ADD CONSTRAINT "competition_books_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_questions" ADD CONSTRAINT "competition_questions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_registrations" ADD CONSTRAINT "competition_registrations_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_registrations" ADD CONSTRAINT "competition_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_submission_idx" ON "answers" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "competition_user_unique" ON "competition_registrations" USING btree ("competition_id","user_id");--> statement-breakpoint
CREATE INDEX "competitions_category_idx" ON "competitions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "competitions_status_idx" ON "competitions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "social_shares_user_idx" ON "social_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_competition_idx" ON "submissions" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "submissions_category_idx" ON "submissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "submissions_final_score_idx" ON "submissions" USING btree ("final_score");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_category_idx" ON "users" USING btree ("category");--> statement-breakpoint
CREATE INDEX "users_affiliate_code_idx" ON "users" USING btree ("affiliate_code");--> statement-breakpoint
CREATE INDEX "users_referrer_id_idx" ON "users" USING btree ("referrer_id");