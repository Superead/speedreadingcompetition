# Speed Reading Competition

A full-stack web application for hosting speed reading competitions across different age categories.

## Overview

This is a competitive speed reading platform where students can:
- Register for competitions in their age category (Kids, Teens, Adults)
- Complete timed reading challenges
- Answer comprehension questions
- Track their scores and referral points

Admins can:
- Configure competition schedules and durations
- Manage reading materials (books)
- Create and manage questions (MCQ and Text)
- Set up prizes for each category
- View all users and submissions
- Assign manual scores for text answers
- Export user data to CSV

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens

## Project Structure

```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       ├── lib/            # Utilities (auth, queryClient)
│       └── hooks/          # Custom hooks
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   └── db.ts               # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle models + Zod schemas
└── design_guidelines.md    # Frontend design guidelines
```

## Key Features

### Student Features
- Category-based registration (Kid/Teen/Adult)
- Affiliate/referral system with unique codes
- Competition countdown timers
- Timed reading sessions (server-controlled)
- Timed question answering
- Score tracking

### Admin Features
- Competition schedule management per category
- Book/content management
- Question CRUD (MCQ + Text)
- Prize configuration
- User management with CSV export
- Submission review with manual scoring

## Database Models

- **users**: Student and admin accounts
- **competitionSettings**: Schedule and durations per category
- **books**: Reading materials per category
- **questions**: MCQ and text questions per category
- **submissions**: User competition attempts
- **answers**: User answers to questions
- **prizes**: Prize descriptions per category

## API Endpoints

### Public
- `GET /api/settings` - Get all competition settings
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - Student login (affiliate code)
- `POST /api/auth/admin-login` - Admin login (email/password)

### Student (authenticated)
- `GET /api/student/dashboard` - Dashboard data
- `GET /api/student/reading` - Reading session data
- `POST /api/student/start-reading` - Start reading timer
- `POST /api/student/finish-reading` - End reading, start questions
- `GET /api/student/questions` - Get questions
- `POST /api/student/answers` - Submit answer
- `POST /api/student/finish-competition` - Complete competition

### Admin (authenticated)
- `GET/PUT /api/admin/settings/:category` - Manage settings
- `GET/POST/DELETE /api/admin/book/:category` - Manage books
- `GET/POST/PUT/DELETE /api/admin/questions/:category` - Manage questions
- `GET/PUT /api/admin/prizes/:category` - Manage prizes
- `GET /api/admin/users` - List users
- `GET /api/admin/submissions` - List submissions
- `PUT /api/admin/submissions/:id/manual-score` - Set manual score
- `GET /api/admin/export/users.csv` - Export users

## Default Admin Credentials

- Email: `admin@demo.com`
- Password: `Admin123!`

(Can be changed via ADMIN_EMAIL and ADMIN_PASSWORD environment variables)

## Running the Project

```bash
npm run dev          # Start development server
npm run db:push      # Push schema to database
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT signing secret

Optional:
- `ADMIN_EMAIL` - Admin email (default: admin@demo.com)
- `ADMIN_PASSWORD` - Admin password (default: Admin123!)
