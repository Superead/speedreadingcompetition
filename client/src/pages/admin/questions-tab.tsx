import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Loader2, Edit, BookOpen, HelpCircle } from "lucide-react";
import type { Category, CompetitionBook, CompetitionQuestion } from "@shared/schema";
import { SUPPORTED_LANGUAGES } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATEGORIES: Category[] = ["kid", "teen", "adult"];

function getCategoryTitle(category: string) {
  switch (category) {
    case "kid": return "Kids";
    case "teen": return "Teens";
    case "adult": return "Adults";
    default: return category;
  }
}

function QuestionsTab() {
  const { toast } = useToast();
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("tr");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CompetitionQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    type: "MCQ" as "MCQ" | "TEXT",
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
  });

  const { data: competitions, isLoading: competitionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/competitions"],
  });

  useEffect(() => {
    if (competitions && competitions.length > 0 && !selectedCompetitionId) {
      setSelectedCompetitionId(competitions[0].id);
    }
  }, [competitions, selectedCompetitionId]);

  const selectedCompetition = competitions?.find((c) => c.id === selectedCompetitionId);
  const competitionLanguages = selectedCompetition
    ? ((selectedCompetition as any).supportedLanguages || "tr").split(",")
    : ["tr"];

  const { data: book } = useQuery<CompetitionBook | null>({
    queryKey: ["/api/admin/competitions", selectedCompetitionId, "book"],
    queryFn: async () => {
      if (!selectedCompetitionId) return null;
      const res = await fetch(`/api/admin/competitions/${selectedCompetitionId}/book`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedCompetitionId,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<CompetitionQuestion[]>({
    queryKey: ["/api/admin/competitions", selectedCompetitionId, "questions", selectedLanguage],
    queryFn: async () => {
      if (!selectedCompetitionId) return [];
      const langParam = competitionLanguages.length > 1 ? `?language=${selectedLanguage}` : "";
      const res = await fetch(`/api/admin/competitions/${selectedCompetitionId}/questions${langParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCompetitionId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const options = data.type === "MCQ" ? JSON.stringify({
        A: data.optionA,
        B: data.optionB,
        C: data.optionC,
        D: data.optionD,
      }) : null;

      const payload = {
        type: data.type,
        prompt: data.prompt,
        optionsJson: options,
        correctAnswer: data.type === "MCQ" ? data.correctAnswer : null,
        language: selectedLanguage,
      };

      if (editingQuestion) {
        const res = await apiRequest("PUT", `/api/admin/competitions/${selectedCompetitionId}/questions/${editingQuestion.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/admin/competitions/${selectedCompetitionId}/questions`, payload);
        return res.json();
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "questions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: editingQuestion ? "Question updated" : "Question added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/competitions/${selectedCompetitionId}/questions/${id}`, {});
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "questions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      toast({ title: "Question deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setQuestionForm({
      type: "MCQ",
      prompt: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "",
    });
    setEditingQuestion(null);
  };

  const handleEdit = (question: CompetitionQuestion) => {
    const options = question.optionsJson ? JSON.parse(question.optionsJson) : {};
    setEditingQuestion(question);
    setQuestionForm({
      type: question.type as "MCQ" | "TEXT",
      prompt: question.prompt,
      optionA: options.A || "",
      optionB: options.B || "",
      optionC: options.C || "",
      optionD: options.D || "",
      correctAnswer: question.correctAnswer || "",
    });
    setIsDialogOpen(true);
  };

  if (competitionsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No competitions found. Create a competition first in the Competitions tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <Label>Competition</Label>
          <Select value={selectedCompetitionId} onValueChange={(v) => { setSelectedCompetitionId(v); setSelectedLanguage("tr"); }}>
            <SelectTrigger className="w-72" data-testid="select-questions-competition">
              <SelectValue placeholder="Select a competition" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => {
                const catCompetitions = competitions.filter((c) => c.category === cat);
                if (catCompetitions.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{getCategoryTitle(cat)}</div>
                    {catCompetitions.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.title}
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
          {competitionLanguages.length > 1 && (
            <div className="flex items-center gap-2">
              <Label>Language</Label>
              <div className="flex gap-1">
                {competitionLanguages.map((code: string) => {
                  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                  if (!lang) return null;
                  return (
                    <Button
                      key={code}
                      size="sm"
                      variant={selectedLanguage === code ? "default" : "outline"}
                      onClick={() => setSelectedLanguage(code)}
                      data-testid={`question-lang-${code}`}
                    >
                      {lang.flag} {lang.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!selectedCompetitionId} data-testid="button-add-question">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
              <DialogDescription>
                {selectedCompetition ? `Question for "${selectedCompetition.title}"` : "Select a competition first"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionForm.type} onValueChange={(v) => setQuestionForm({ ...questionForm, type: v as "MCQ" | "TEXT" })}>
                  <SelectTrigger data-testid="select-question-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice</SelectItem>
                    <SelectItem value="TEXT">Text Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  placeholder="Enter your question..."
                  data-testid="textarea-question-prompt"
                />
              </div>
              {questionForm.type === "MCQ" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Option A</Label>
                      <Input value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} data-testid="input-option-a" />
                    </div>
                    <div className="space-y-2">
                      <Label>Option B</Label>
                      <Input value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} data-testid="input-option-b" />
                    </div>
                    <div className="space-y-2">
                      <Label>Option C</Label>
                      <Input value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} data-testid="input-option-c" />
                    </div>
                    <div className="space-y-2">
                      <Label>Option D</Label>
                      <Input value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} data-testid="input-option-d" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Select value={questionForm.correctAnswer} onValueChange={(v) => setQuestionForm({ ...questionForm, correctAnswer: v })}>
                      <SelectTrigger data-testid="select-correct-answer">
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            {!questionForm.prompt && (
              <p className="text-sm text-destructive" data-testid="text-error-question-prompt">Question text is required</p>
            )}
            {questionForm.type === "MCQ" && (!questionForm.optionA || !questionForm.optionB) && questionForm.prompt && (
              <p className="text-sm text-destructive" data-testid="text-error-question-options">At least options A and B are required for multiple choice</p>
            )}
            {questionForm.type === "MCQ" && !questionForm.correctAnswer && questionForm.prompt && (
              <p className="text-sm text-destructive" data-testid="text-error-question-answer">Please select the correct answer</p>
            )}
            <DialogFooter>
              <Button
                onClick={() => saveMutation.mutate(questionForm)}
                disabled={saveMutation.isPending || !questionForm.prompt || (questionForm.type === "MCQ" && (!questionForm.optionA || !questionForm.optionB || !questionForm.correctAnswer))}
                data-testid="button-save-question"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingQuestion ? "Update" : "Add"} Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {selectedCompetition && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Book / Reading Material
              </CardTitle>
              <CardDescription>
                {getCategoryTitle(selectedCompetition.category)} &middot; {selectedCompetition.status}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {book ? (
              <div className="space-y-2">
                <p className="font-medium" data-testid="text-competition-book-title">{book.title}</p>
                {book.content && (
                  <ScrollArea className="h-40 border rounded-md p-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-competition-book-content">{book.content}</p>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-book">No book assigned to this competition yet. Add one in the Books tab or Competitions tab.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Questions ({questions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questionsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !questions || questions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No questions yet. Add your first question above.</p>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const options = question.optionsJson ? JSON.parse(question.optionsJson) : null;
                return (
                  <div key={question.id} className="border rounded-md p-4 space-y-2" data-testid={`question-item-${index}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Badge variant="secondary">{question.type}</Badge>
                        </div>
                        <p className="font-medium">{question.prompt}</p>
                        {options && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            {Object.entries(options).map(([key, value]) => (
                              <span key={key} className={question.correctAnswer === key ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                                {key}. {value as string}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(question)} data-testid={`button-edit-question-${index}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-question-${index}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(question.id)} data-testid="button-confirm-delete-question">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default QuestionsTab;
