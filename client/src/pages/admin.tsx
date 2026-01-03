import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Settings,
  BookOpen,
  HelpCircle,
  Gift,
  Users,
  FileText,
  LogOut,
  Plus,
  Trash2,
  Save,
  Download,
  Loader2,
  Shield,
  Edit,
  Trophy,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import type { CompetitionSettings, Book, Question, Prize, User, Submission, Category } from "@shared/schema";
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

function SettingsTab() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>("kid");

  const { data: settings, isLoading } = useQuery<CompetitionSettings[]>({
    queryKey: ["/api/admin/settings"],
  });

  const currentSettings = settings?.find((s) => s.category === selectedCategory);

  const [formData, setFormData] = useState({
    registrationStartTime: "",
    registrationEndTime: "",
    competitionStartTime: "",
    competitionEndTime: "",
    readingDurationMinutes: 30,
    answeringDurationMinutes: 15,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PUT", `/api/admin/settings/${selectedCategory}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved", description: `${getCategoryTitle(selectedCategory)} settings updated.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const formatDateForInput = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        registrationStartTime: formatDateForInput(currentSettings.registrationStartTime),
        registrationEndTime: formatDateForInput(currentSettings.registrationEndTime),
        competitionStartTime: formatDateForInput(currentSettings.competitionStartTime),
        competitionEndTime: formatDateForInput(currentSettings.competitionEndTime),
        readingDurationMinutes: currentSettings.readingDurationMinutes || 30,
        answeringDurationMinutes: currentSettings.answeringDurationMinutes || 15,
      });
    }
  }, [currentSettings]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label>Category</Label>
        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as Category)}>
          <SelectTrigger className="w-40" data-testid="select-settings-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{getCategoryTitle(selectedCategory)} Competition Settings</CardTitle>
          <CardDescription>Configure registration and competition times</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regStart">Registration Start</Label>
              <Input
                id="regStart"
                type="datetime-local"
                value={formData.registrationStartTime}
                onChange={(e) => setFormData({ ...formData, registrationStartTime: e.target.value })}
                data-testid="input-registration-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEnd">Registration End</Label>
              <Input
                id="regEnd"
                type="datetime-local"
                value={formData.registrationEndTime}
                onChange={(e) => setFormData({ ...formData, registrationEndTime: e.target.value })}
                data-testid="input-registration-end"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compStart">Competition Start</Label>
              <Input
                id="compStart"
                type="datetime-local"
                value={formData.competitionStartTime}
                onChange={(e) => setFormData({ ...formData, competitionStartTime: e.target.value })}
                data-testid="input-competition-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compEnd">Competition End</Label>
              <Input
                id="compEnd"
                type="datetime-local"
                value={formData.competitionEndTime}
                onChange={(e) => setFormData({ ...formData, competitionEndTime: e.target.value })}
                data-testid="input-competition-end"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="readingDuration">Reading Duration (minutes)</Label>
              <Input
                id="readingDuration"
                type="number"
                min={1}
                value={formData.readingDurationMinutes}
                onChange={(e) => setFormData({ ...formData, readingDurationMinutes: parseInt(e.target.value) || 30 })}
                data-testid="input-reading-duration"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answeringDuration">Answering Duration (minutes)</Label>
              <Input
                id="answeringDuration"
                type="number"
                min={1}
                value={formData.answeringDurationMinutes}
                onChange={(e) => setFormData({ ...formData, answeringDurationMinutes: parseInt(e.target.value) || 15 })}
                data-testid="input-answering-duration"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2" data-testid="button-save-settings">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BooksTab() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>("kid");
  const [bookTitle, setBookTitle] = useState("");
  const [bookContent, setBookContent] = useState("");

  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ["/api/admin/books"],
  });

  const currentBook = books?.find((b) => b.category === selectedCategory);

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await apiRequest("POST", `/api/admin/book/${selectedCategory}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/books"] });
      toast({ title: "Book saved", description: `Book for ${getCategoryTitle(selectedCategory)} updated.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/admin/book/${selectedCategory}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/books"] });
      setBookTitle("");
      setBookContent("");
      toast({ title: "Book deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  useState(() => {
    if (currentBook) {
      setBookTitle(currentBook.title);
      setBookContent(currentBook.content || "");
    }
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label>Category</Label>
        <Select value={selectedCategory} onValueChange={(v) => {
          setSelectedCategory(v as Category);
          const book = books?.find((b) => b.category === v);
          setBookTitle(book?.title || "");
          setBookContent(book?.content || "");
        }}>
          <SelectTrigger className="w-40" data-testid="select-book-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{getCategoryTitle(selectedCategory)} Book</CardTitle>
          <CardDescription>Manage the reading material for this category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bookTitle">Book Title</Label>
            <Input
              id="bookTitle"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="Enter book title"
              data-testid="input-book-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookContent">Book Content</Label>
            <Textarea
              id="bookContent"
              value={bookContent}
              onChange={(e) => setBookContent(e.target.value)}
              placeholder="Paste or type the book content here..."
              className="min-h-64"
              data-testid="textarea-book-content"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => saveMutation.mutate({ title: bookTitle, content: bookContent })} 
              disabled={saveMutation.isPending || !bookTitle}
              className="gap-2"
              data-testid="button-save-book"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Book
            </Button>
            {currentBook && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" data-testid="button-delete-book">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Book?</AlertDialogTitle>
                    <AlertDialogDescription>This will remove the book for {getCategoryTitle(selectedCategory)}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionsTab() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>("kid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    type: "MCQ" as "MCQ" | "TEXT",
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
  });

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ["/api/admin/questions", selectedCategory],
  });

  const categoryQuestions = questions?.filter((q) => q.category === selectedCategory) || [];

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const options = data.type === "MCQ" ? JSON.stringify({
        A: data.optionA,
        B: data.optionB,
        C: data.optionC,
        D: data.optionD,
      }) : null;

      const payload = {
        category: selectedCategory,
        type: data.type,
        prompt: data.prompt,
        optionsJson: options,
        correctAnswer: data.type === "MCQ" ? data.correctAnswer : null,
      };

      if (editingQuestion) {
        const res = await apiRequest("PUT", `/api/admin/questions/${editingQuestion.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/admin/questions/${selectedCategory}`, payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: editingQuestion ? "Question updated" : "Question added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/questions/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
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

  const handleEdit = (question: Question) => {
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

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Label>Category</Label>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as Category)}>
            <SelectTrigger className="w-40" data-testid="select-questions-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-question">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
              <DialogDescription>Add a question for the {getCategoryTitle(selectedCategory)} category</DialogDescription>
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
            <DialogFooter>
              <Button onClick={() => saveMutation.mutate(questionForm)} disabled={saveMutation.isPending || !questionForm.prompt} data-testid="button-save-question">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingQuestion ? "Update" : "Add"} Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {categoryQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No questions yet. Add your first question above.</p>
          ) : (
            <div className="space-y-4">
              {categoryQuestions.map((question, index) => {
                const options = question.optionsJson ? JSON.parse(question.optionsJson) : null;
                return (
                  <div key={question.id} className="border rounded-lg p-4 space-y-2" data-testid={`question-item-${index}`}>
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
                              <span key={key} className={question.correctAnswer === key ? "text-green-600 font-medium" : ""}>
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
                              <AlertDialogAction onClick={() => deleteMutation.mutate(question.id)}>Delete</AlertDialogAction>
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

function PrizesTab() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>("kid");
  const [content, setContent] = useState("");

  const { data: prizes, isLoading } = useQuery<Prize[]>({
    queryKey: ["/api/admin/prizes"],
  });

  const currentPrize = prizes?.find((p) => p.category === selectedCategory);

  const saveMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      const res = await apiRequest("PUT", `/api/admin/prizes/${selectedCategory}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prizes"] });
      toast({ title: "Prizes saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  useState(() => {
    if (currentPrize) {
      setContent(currentPrize.content || "");
    }
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label>Category</Label>
        <Select value={selectedCategory} onValueChange={(v) => {
          setSelectedCategory(v as Category);
          const prize = prizes?.find((p) => p.category === v);
          setContent(prize?.content || "");
        }}>
          <SelectTrigger className="w-40" data-testid="select-prizes-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{getCategoryTitle(selectedCategory)} Prizes</CardTitle>
          <CardDescription>Describe the prizes for this category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe the prizes (supports simple formatting)..."
            className="min-h-48"
            data-testid="textarea-prizes"
          />
          <Button onClick={() => saveMutation.mutate({ content })} disabled={saveMutation.isPending} className="gap-2" data-testid="button-save-prizes">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Prizes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const filteredUsers = filterCategory === "all" 
    ? users 
    : users?.filter((u) => u.category === filterCategory);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/export/users.csv", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Export complete" });
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Label>Filter by Category</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40" data-testid="select-users-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filteredUsers?.length || 0} users</Badge>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2" data-testid="button-export-users">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Affiliate Code</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Referred By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.name} {user.surname}</TableCell>
                    <TableCell><Badge variant="outline">{getCategoryTitle(user.category || "")}</Badge></TableCell>
                    <TableCell>{user.city || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{user.affiliateCode}</TableCell>
                    <TableCell>{user.referralPoints || 0}</TableCell>
                    <TableCell className="font-mono text-sm">{user.referrerId ? "Yes" : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
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
  onScoreUpdated 
}: { 
  textAnswers: AnswerWithPoints[]; 
  submissionId: string; 
  currentManualScore: number;
  onScoreUpdated: () => void;
}) {
  const { toast } = useToast();
  const [answerScores, setAnswerScores] = useState<Record<string, number>>({});
  const [savedScores, setSavedScores] = useState<Record<string, number>>({});
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, number> = {};
    textAnswers.forEach((a) => {
      initial[a.id] = a.points || 0;
    });
    setAnswerScores(initial);
    setSavedScores(initial);
  }, [textAnswers]);

  const totalTextScore = Object.values(answerScores).reduce((sum, score) => sum + score, 0);

  const savePointsMutation = useMutation({
    mutationFn: async ({ answerId, points }: { answerId: string; points: number }) => {
      setSavingAnswerId(answerId);
      const res = await apiRequest("PUT", `/api/admin/answers/${answerId}/points`, { points });
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

function SubmissionDetailDialog({ submissionId, onClose }: { submissionId: string; onClose: () => void }) {
  const { toast } = useToast();

  const { data: details, isLoading, refetch } = useQuery<SubmissionDetails>({
    queryKey: ["/api/admin/submissions", submissionId],
    enabled: !!submissionId,
  });

  const scoreMutation = useMutation({
    mutationFn: async (manualScore: number) => {
      const res = await apiRequest("PUT", `/api/admin/submissions/${submissionId}/manual-score`, { manualScore });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      refetch();
      toast({ title: "Score updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/submissions/${submissionId}/recalculate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
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
                <p className="text-muted-foreground">Final Score</p>
                <p className="text-xl font-bold text-primary">{details.finalScore || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Auto: {details.autoScore || 0} + Manual: {details.manualScore || 0}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Manual Score:</Label>
                <Input
                  type="number"
                  className="w-24"
                  defaultValue={details.manualScore ?? ""}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value !== details.manualScore) {
                      scoreMutation.mutate(value);
                    }
                  }}
                  data-testid="input-detail-manual-score"
                />
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
            currentManualScore={details.manualScore || 0}
            onScoreUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
              refetch();
            }}
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

function SubmissionsTab() {
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { data: submissions, isLoading } = useQuery<(Submission & { user?: User })[]>({
    queryKey: ["/api/admin/submissions"],
  });

  const filteredSubmissions = filterCategory === "all" 
    ? submissions 
    : submissions?.filter((s) => s.category === filterCategory);

  const scoreMutation = useMutation({
    mutationFn: async ({ id, manualScore }: { id: string; manualScore: number }) => {
      const res = await apiRequest("PUT", `/api/admin/submissions/${id}/manual-score`, { manualScore });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
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
      <div className="flex items-center gap-4">
        <Label>Filter by Category</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40" data-testid="select-submissions-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Reading</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>MCQ</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Manual</TableHead>
                  <TableHead>Final</TableHead>
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
                    <TableCell>
                      <Badge variant="outline">{getCategoryTitle(submission.category)}</Badge>
                    </TableCell>
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
          />
        )}
      </Dialog>
    </div>
  );
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  city: string | null;
  country: string | null;
  finalScore: number;
  readingSeconds: number | null;
  answerSeconds: number | null;
}

function LeaderboardTab() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>("kid");

  const { data: settings } = useQuery<CompetitionSettings[]>({
    queryKey: ["/api/admin/settings"],
  });

  const currentSettings = settings?.find((s) => s.category === selectedCategory);
  const isPublished = currentSettings?.resultsPublishedAt != null;

  const { data: leaderboard, isLoading, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/admin/leaderboard", selectedCategory],
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/admin/results/publish/${selectedCategory}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard", selectedCategory] });
      toast({ title: "Results published", description: `${getCategoryTitle(selectedCategory)} leaderboard is now visible to students.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to publish", description: error.message, variant: "destructive" });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/admin/results/unpublish/${selectedCategory}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Results unpublished", description: `${getCategoryTitle(selectedCategory)} leaderboard is now hidden from students.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to unpublish", description: error.message, variant: "destructive" });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/leaderboard/recalculate?category=${selectedCategory}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard", selectedCategory] });
      toast({ title: "Leaderboard recalculated", description: "All scores have been refreshed." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to recalculate", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    window.open(`/api/admin/export/leaderboard.csv?category=${selectedCategory}`, "_blank");
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Label>Category</Label>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as Category)}>
            <SelectTrigger className="w-40" data-testid="select-leaderboard-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isPublished ? (
            <Badge className="bg-green-600">Published</Badge>
          ) : (
            <Badge variant="outline">Not Published</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="gap-2"
            data-testid="button-recalculate"
          >
            {recalculateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Recalculate
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="gap-2"
            data-testid="button-export-leaderboard"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {isPublished ? (
            <Button 
              variant="destructive" 
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
              className="gap-2"
              data-testid="button-unpublish"
            >
              {unpublishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              Unpublish
            </Button>
          ) : (
            <Button 
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="gap-2"
              data-testid="button-publish"
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Publish Results
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {getCategoryTitle(selectedCategory)} Leaderboard
          </CardTitle>
          <CardDescription>
            {leaderboard?.length || 0} participants ranked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : leaderboard && leaderboard.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Reading</TableHead>
                    <TableHead className="text-right">Answers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow key={entry.userId} data-testid={`row-leaderboard-${entry.rank}`}>
                      <TableCell className="font-bold">
                        {entry.rank === 1 && <span className="text-yellow-500">1st</span>}
                        {entry.rank === 2 && <span className="text-gray-400">2nd</span>}
                        {entry.rank === 3 && <span className="text-amber-600">3rd</span>}
                        {entry.rank > 3 && entry.rank}
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.city}{entry.city && entry.country ? ", " : ""}{entry.country}
                      </TableCell>
                      <TableCell className="text-right font-bold">{entry.finalScore}</TableCell>
                      <TableCell className="text-right">{formatDuration(entry.readingSeconds)}</TableCell>
                      <TableCell className="text-right">{formatDuration(entry.answerSeconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No completed submissions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You must be an admin to access this page.</p>
            <Link href="/admin/login">
              <Button>Go to Admin Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-destructive" />
            <span className="font-semibold text-lg">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-admin-logout">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4 hidden sm:inline" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="books" className="gap-2" data-testid="tab-books">
              <BookOpen className="h-4 w-4 hidden sm:inline" />
              Books
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2" data-testid="tab-questions">
              <HelpCircle className="h-4 w-4 hidden sm:inline" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="prizes" className="gap-2" data-testid="tab-prizes">
              <Gift className="h-4 w-4 hidden sm:inline" />
              Prizes
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="h-4 w-4 hidden sm:inline" />
              Users
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2" data-testid="tab-submissions">
              <FileText className="h-4 w-4 hidden sm:inline" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2" data-testid="tab-leaderboard">
              <Trophy className="h-4 w-4 hidden sm:inline" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="books"><BooksTab /></TabsContent>
          <TabsContent value="questions"><QuestionsTab /></TabsContent>
          <TabsContent value="prizes"><PrizesTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
          <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
