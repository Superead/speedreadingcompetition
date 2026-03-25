import { db } from '../server/db';
import { submissions, answers, competitionQuestions, competitionBooks, users } from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

async function recalcAll() {
  const subs = await db.select().from(submissions).orderBy(desc(submissions.createdAt));

  for (const sub of subs) {
    if (!sub.competitionId) continue;

    const subAnswers = await db.select().from(answers).where(eq(answers.submissionId, sub.id));
    if (subAnswers.length === 0) {
      console.log('Skip (no answers):', sub.id.slice(0, 8));
      continue;
    }

    // Detect ACTUAL language from the questions the student answered
    let actualLang = 'tr';
    for (const a of subAnswers) {
      if (a.competitionQuestionId) {
        const [q] = await db.select().from(competitionQuestions).where(eq(competitionQuestions.id, a.competitionQuestionId));
        if (q && q.language) {
          actualLang = q.language;
          break;
        }
      }
    }

    // Fix submission language to match actual answered questions
    await db.update(submissions).set({ language: actualLang } as any).where(eq(submissions.id, sub.id));

    // Get questions in the ACTUAL language
    const questions = await db.select().from(competitionQuestions).where(
      and(eq(competitionQuestions.competitionId, sub.competitionId), eq(competitionQuestions.language, actualLang))
    );

    let correctCount = 0;
    let wrongCount = 0;
    const mcqQuestions = questions.filter(q => q.type === 'MCQ');

    for (const ans of subAnswers) {
      if (ans.type === 'MCQ') {
        const q = mcqQuestions.find(mq => mq.id === ans.competitionQuestionId || mq.id === (ans as any).questionId);
        if (q) {
          const isCorrect = ans.value?.trim().toUpperCase() === q.correctAnswer?.trim().toUpperCase();
          if (isCorrect) {
            correctCount++;
            await db.update(answers).set({ isCorrect: true }).where(eq(answers.id, ans.id));
          } else {
            wrongCount++;
            await db.update(answers).set({ isCorrect: false }).where(eq(answers.id, ans.id));
          }
        }
      }
    }

    const total = mcqQuestions.length;

    // Get book word count in the actual language for WPM calculation
    let bookWordCount = 0;
    const [book] = await db.select().from(competitionBooks).where(
      and(eq(competitionBooks.competitionId, sub.competitionId), eq(competitionBooks.language, actualLang))
    );
    if (book) bookWordCount = book.wordCount || 0;

    // Calculate WPM
    let readingSpeedWPM = 0;
    if (bookWordCount > 0 && sub.readingSeconds && sub.readingSeconds > 0) {
      const totalMinutes = Math.floor(sub.readingSeconds / 60);
      const totalSecondsRemainder = sub.readingSeconds % 60;
      const timeInMinutes = totalMinutes + (totalSecondsRemainder * 0.01666667);
      if (timeInMinutes > 0) {
        readingSpeedWPM = bookWordCount / timeInMinutes;
      }
    }

    const ratio = total > 0 ? correctCount / total : 0;
    const comprehensionScore = ratio >= 0.4 ? ratio * 10 : 0;
    const finalScore = comprehensionScore * readingSpeedWPM;

    await db.update(submissions).set({
      mcqCorrectCount: correctCount,
      mcqWrongCount: wrongCount,
      mcqTotalCount: total,
      autoScore: correctCount,
      readingSpeedWPM: Math.round(readingSpeedWPM * 100) / 100,
      comprehensionScore: Math.round(comprehensionScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
    } as any).where(eq(submissions.id, sub.id));

    const [user] = await db.select().from(users).where(eq(users.id, sub.userId));
    console.log('Recalc:', user?.name, user?.surname, '| actualLang:', actualLang, '|', correctCount + '/' + total, '| WPM:', Math.round(readingSpeedWPM), '| score:', Math.round(finalScore));
  }

  console.log('\nDone! All scores recalculated.');
  process.exit(0);
}
recalcAll();
