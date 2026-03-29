import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, RefreshCw } from "lucide-react";
import type { Question, User, Submission, Category, Competition } from "@shared/schema";
import { SUPPORTED_LANGUAGES } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES: Category[] = ["kid", "teen", "adult"];

function getCategoryTitle(category: string) {
  switch (category) {
    case "kid": return "Kids";
    case "teen": return "Teens";
    case "adult": return "Adults";
    default: return category;
  }
}

interface AnswerWithQuestion {
  id: string;
  submissionId: string;
  questionId: string;
  type: "MCQ" | "TEXT";
  value: string | null;
  isCorrect: boolean | null;
  question: Question;
}

interface SubmissionDetails extends Submission {
  user: User;
  referrer?: User;
  answers: AnswerWithQuestion[];
}

interface AnswerWithPoints extends AnswerWithQuestion {
  points?: number | null;
}

function TextAnswersSection({
  textAnswers,
  submissionId,
  currentManualScore,
  onScoreUpdated,
  answerScores,
  setAnswerScores,
  apiPrefix = "/api/admin",
}: {
  textAnswers: AnswerWithPoints[];
  submissionId: string;
  currentManualScore: number;
  onScoreUpdated: () => void;
  answerScores: Record<string, number>;
  setAnswerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  apiPrefix?: string;
}) {
  const { toast } = useToast();
  const [savedScores, setSavedScores] = useState<Record<string, number>>({});
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, number> = {};
    textAnswers.forEach((a) => {
      initial[a.id] = a.points || 0;
    });
    setSavedScores(initial);
  }, [textAnswers]);

  const totalTextScore = Object.values(answerScores).reduce((sum, score) => sum + score, 0);

  const savePointsMutation = useMutation({
    mutationFn: async ({ answerId, points }: { answerId: string; points: number }) => {
      setSavingAnswerId(answerId);
      const res = await apiRequest("PUT", `${apiPrefix}/answers/${answerId}/points`, { points });
      return res.json();
    },
    onSuccess: (_, variables) => {
      setSavedScores((prev) => ({
        ...prev,
        [variables.answerId]: variables.points,
      }));
      onScoreUpdated();
      toast({ title: "Score saved" });
      setSavingAnswerId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      setSavingAnswerId(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Text Answers ({textAnswers.length})</CardTitle>
        <CardDescription>
          Review written answers and assign points for each response. Scores are saved when you leave each field.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {textAnswers.map((answer, index) => (
          <div
            key={answer.id}
            className="p-4 border rounded-md space-y-3"
            data-testid={`text-answer-${answer.id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">Q{index + 1}: {answer.question.prompt}</p>
                <p className="text-xs text-muted-foreground">
                  Max Points: {answer.question.maxPoints || 1}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Score:</Label>
                <Input
                  type="number"
                  className="w-20"
                  min={0}
                  max={answer.question.maxPoints || 10}
                  value={answerScores[answer.id] ?? 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const clampedValue = Math.max(0, Math.min(value, answer.question.maxPoints || 10));
                    setAnswerScores((prev) => ({
                      ...prev,
                      [answer.id]: clampedValue,
                    }));
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const clampedValue = Math.max(0, Math.min(value, answer.question.maxPoints || 10));
                    if (clampedValue !== savedScores[answer.id]) {
                      savePointsMutation.mutate({ answerId: answer.id, points: clampedValue });
                    }
                  }}
                  data-testid={`input-text-score-${answer.id}`}
                />
                <span className="text-xs text-muted-foreground">
                  / {answer.question.maxPoints || 1}
                </span>
                {savingAnswerId === answer.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm whitespace-pre-wrap">
                {answer.value || <span className="text-muted-foreground italic">No answer provided</span>}
              </p>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Text Score:</span>{" "}
            <span className="font-bold text-lg">{totalTextScore}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmissionDetailDialog({ submissionId, onClose, apiPrefix = "/api/admin" }: { submissionId: string; onClose: () => void; apiPrefix?: string }) {
  const { toast } = useToast();
  const [answerScores, setAnswerScores] = useState<Record<string, number>>({});

  const { data: details, isLoading, refetch } = useQuery<SubmissionDetails>({
    queryKey: [`${apiPrefix}/submissions`, submissionId],
    enabled: !!submissionId,
  });

  // Initialize answer scores when details load
  useEffect(() => {
    if (details) {
      const initial: Record<string, number> = {};
      details.answers
        .filter((a) => a.type === "TEXT")
        .forEach((a: any) => {
          initial[a.id] = a.points || 0;
        });
      setAnswerScores(initial);
    }
  }, [details]);

  // Compute live scores using the same unified formula as the server:
  // comprehensionScore = (totalScored / totalMax) * 10 if ratio >= 0.4
  // finalScore = comprehensionScore × readingSpeedWPM
  const liveManualScore = Object.values(answerScores).reduce((sum, score) => sum + score, 0);

  const liveComprehension = (() => {
    if (!details) return 0;
    const mcqCorrect = details.mcqCorrectCount || 0;
    const mcqTotal = details.mcqTotalCount || 0;
    const textAnswers = details.answers.filter((a) => a.type === "TEXT");
    const textMax = textAnswers.reduce((sum, a: any) => sum + (a.question?.maxPoints || 1), 0);
    const totalScored = mcqCorrect + liveManualScore;
    const totalMax = mcqTotal + textMax;
    if (totalMax === 0) return 0;
    const ratio = totalScored / totalMax;
    return ratio >= 0.4 ? ratio * 10 : 0;
  })();
  const wpm = details?.readingSpeedWPM || 0;
  const liveFinalScore = Math.round(liveComprehension * wpm * 100) / 100;

  const scoreMutation = useMutation({
    mutationFn: async (manualScore: number) => {
      const res = await apiRequest("PUT", `${apiPrefix}/submissions/${submissionId}/manual-score`, { manualScore });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/submissions`] });
      refetch();
      toast({ title: "Score updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `${apiPrefix}/submissions/${submissionId}/recalculate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/submissions`] });
      refetch();
      toast({ title: "Scores recalculated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to recalculate", description: error.message, variant: "destructive" });
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <Skeleton className="h-96 w-full" />
      </DialogContent>
    );
  }

  if (!details) {
    return (
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Submission Not Found</DialogTitle>
        </DialogHeader>
      </DialogContent>
    );
  }

  const mcqAnswers = details.answers.filter((a) => a.type === "MCQ");
  const textAnswers = details.answers.filter((a) => a.type === "TEXT");

  const normalizeOptions = (options: any): string[] => {
    if (Array.isArray(options)) return options.filter((x) => typeof x === "string");

    if (typeof options === "string") {
      try {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
        if (parsed && typeof parsed === "object") return Object.values(parsed).filter((x) => typeof x === "string");
      } catch {
        return [];
      }
    }

    if (options && typeof options === "object") {
      if (Array.isArray((options as any).options)) return (options as any).options.filter((x: any) => typeof x === "string");
      return Object.values(options).filter((x) => typeof x === "string");
    }

    return [];
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Answer Analysis</DialogTitle>
        <DialogDescription>
          Review submission details and score answers
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{details.user.name} {details.user.surname}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{details.user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p><Badge variant="outline">{getCategoryTitle(details.category)}</Badge></p>
              </div>
              <div>
                <span className="text-muted-foreground">City:</span>
                <p className="font-medium">{details.user.city || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Country:</span>
                <p className="font-medium">{details.user.country || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Referred By:</span>
                <p className="font-medium">
                  {details.referrer ? `${details.referrer.name} ${details.referrer.surname}` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">Reading Time</p>
                <p className="text-xl font-bold">{formatDuration(details.readingSeconds)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">Answer Time</p>
                <p className="text-xl font-bold">{formatDuration(details.answerSeconds)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">MCQ Score</p>
                <p className="text-xl font-bold text-green-600">{details.mcqCorrectCount || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {details.mcqCorrectCount || 0} correct / {(details.mcqWrongCount as number) || 0} wrong / {details.mcqTotalCount || 0} total
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">Text Score</p>
                <p className="text-xl font-bold text-blue-600">{liveManualScore}</p>
                <p className="text-xs text-muted-foreground">
                  Points assigned by reviewer
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4">
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">Reading Speed</p>
                <p className="text-xl font-bold">{Math.round(wpm)} WPM</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">Comprehension</p>
                <p className="text-xl font-bold">{Math.round(liveComprehension * 100) / 100}</p>
                <p className="text-xs text-muted-foreground">
                  (scored / max) × 10
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <p className="text-muted-foreground">Final Score</p>
                <p className="text-xl font-bold text-primary">{liveFinalScore}</p>
                <p className="text-xs text-muted-foreground">
                  comprehension × WPM
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Manual Score:</Label>
                <span className="text-lg font-bold w-24 text-center">{liveManualScore}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isPending}
                data-testid="button-recalculate-submission"
              >
                {recalculateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recalculate
              </Button>
            </div>
          </CardContent>
        </Card>

        {mcqAnswers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">MCQ Answers ({mcqAnswers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mcqAnswers.map((answer, index) => {
                const optionsArr = normalizeOptions(answer.question.optionsJson);
                const isCorrect = answer.isCorrect === true;
                const studentAnswer = answer.value;
                const correctAnswer = answer.question.correctAnswer;

                return (
                  <div
                    key={answer.id}
                    className="p-4 border rounded-md space-y-3"
                    data-testid={`mcq-answer-${answer.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">Q{index + 1}: {answer.question.prompt}</p>
                      </div>
                      {isCorrect ? (
                        <Badge className="bg-green-600">Correct</Badge>
                      ) : (
                        <Badge variant="destructive">Wrong</Badge>
                      )}
                    </div>
                    {optionsArr.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No options found for this MCQ (data format mismatch).
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {optionsArr.map((opt, optIndex) => {
                          const optionLetter = String.fromCharCode(65 + optIndex);
                          const isStudentChoice = studentAnswer === optionLetter;
                          const isCorrectChoice = correctAnswer === optionLetter;

                          return (
                            <div
                              key={optIndex}
                              className={`p-2 rounded border ${
                                isCorrectChoice
                                  ? "bg-green-100 dark:bg-green-900/30 border-green-500"
                                  : isStudentChoice
                                  ? "bg-red-100 dark:bg-red-900/30 border-red-500"
                                  : "bg-muted"
                              }`}
                            >
                              <span className="font-medium">{optionLetter}.</span> {opt}
                              {isCorrectChoice && <span className="ml-2 text-green-600">(Correct)</span>}
                              {isStudentChoice && !isCorrectChoice && <span className="ml-2 text-red-600">(Student)</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {textAnswers.length > 0 && (
          <TextAnswersSection
            textAnswers={textAnswers}
            submissionId={submissionId}
            currentManualScore={liveManualScore}
            onScoreUpdated={() => {
              queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/submissions`] });
              refetch();
            }}
            answerScores={answerScores}
            setAnswerScores={setAnswerScores}
            apiPrefix={apiPrefix}
          />
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-testid="button-close-details">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SubmissionsTab({
  apiPrefix = "/api/admin",
  showReviewerColumn = false,
  showLanguageFilter = false,
}: {
  apiPrefix?: string;
  showReviewerColumn?: boolean;
  showLanguageFilter?: boolean;
} = {}) {
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCompetition, setFilterCompetition] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { data: submissions, isLoading } = useQuery<(Submission & { user?: User; competitionId?: string })[]>({
    queryKey: [`${apiPrefix}/submissions`],
  });

  const { data: competitions } = useQuery<Competition[]>({
    queryKey: [`${apiPrefix}/competitions`],
  });

  const filteredSubmissions = submissions?.filter((s) => {
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterCompetition !== "all" && s.competitionId !== filterCompetition) return false;
    if (filterLanguage !== "all" && (s as any).language !== filterLanguage) return false;
    return true;
  });

  const scoreMutation = useMutation({
    mutationFn: async ({ id, manualScore }: { id: string; manualScore: number }) => {
      const res = await apiRequest("PUT", `${apiPrefix}/submissions/${id}/manual-score`, { manualScore });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${apiPrefix}/submissions`] });
      toast({ title: "Score updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Category</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32" data-testid="select-submissions-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label>Competition</Label>
          <Select value={filterCompetition} onValueChange={setFilterCompetition}>
            <SelectTrigger className="w-48" data-testid="select-submissions-competition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitions</SelectItem>
              {competitions
                ?.filter(c => filterCategory === "all" || c.category === filterCategory)
                .map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>{comp.title}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {showLanguageFilter && (
          <div className="flex items-center gap-2">
            <Label>Language</Label>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.flag} {lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Badge variant="secondary">{filteredSubmissions?.length || 0} submissions</Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Competition</TableHead>
                  {showLanguageFilter && <TableHead>Lang</TableHead>}
                  <TableHead>Reading</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>MCQ</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Manual</TableHead>
                  <TableHead>Final</TableHead>
                  {showReviewerColumn && <TableHead>Reviewed By</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions?.map((submission) => (
                  <TableRow key={submission.id} data-testid={`row-submission-${submission.id}`}>
                    <TableCell className="font-medium">
                      {(submission as any).userName || "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(submission as any).userEmail || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {competitions?.find(c => c.id === submission.competitionId)?.title ||
                        <Badge variant="outline">{getCategoryTitle(submission.category)}</Badge>}
                    </TableCell>
                    {showLanguageFilter && (
                      <TableCell className="text-sm">
                        {(() => {
                          const lang = SUPPORTED_LANGUAGES.find(l => l.code === (submission as any).language);
                          return lang ? `${lang.flag} ${lang.code.toUpperCase()}` : (submission as any).language || "-";
                        })()}
                      </TableCell>
                    )}
                    <TableCell>{formatDuration(submission.readingSeconds)}</TableCell>
                    <TableCell>{formatDuration(submission.answerSeconds)}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{submission.mcqCorrectCount || 0}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600">{(submission as any).mcqWrongCount || 0}</span>
                      <span className="text-muted-foreground">/</span>
                      <span>{submission.mcqTotalCount || 0}</span>
                    </TableCell>
                    <TableCell>{submission.autoScore ?? "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-16"
                        placeholder="-"
                        defaultValue={submission.manualScore ?? ""}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value)) {
                            scoreMutation.mutate({ id: submission.id, manualScore: value });
                          }
                        }}
                        data-testid={`input-manual-score-${submission.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-bold">{submission.finalScore ?? "-"}</TableCell>
                    {showReviewerColumn && (
                      <TableCell className="text-xs">
                        {(submission as any).reviewedByName ? (
                          <Badge variant="outline" className="text-xs">
                            {(submission as any).reviewedByName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {submission.answerEndAt ? (
                        <Badge variant="default" className="bg-green-600">Completed</Badge>
                      ) : submission.readingEndAt ? (
                        <Badge variant="secondary">Answering</Badge>
                      ) : submission.readingStartAt ? (
                        <Badge variant="secondary">Reading</Badge>
                      ) : (
                        <Badge variant="outline">Not Started</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSubmissionId(submission.id)}
                        data-testid={`button-view-details-${submission.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubmissionId} onOpenChange={(open) => !open && setSelectedSubmissionId(null)}>
        {selectedSubmissionId && (
          <SubmissionDetailDialog
            submissionId={selectedSubmissionId}
            onClose={() => setSelectedSubmissionId(null)}
            apiPrefix={apiPrefix}
          />
        )}
      </Dialog>
    </div>
  );
}

export default SubmissionsTab;
