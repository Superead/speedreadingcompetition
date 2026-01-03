import { useState } from "react";
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

  useState(() => {
    if (currentSettings) {
      setFormData({
        registrationStartTime: formatDateForInput(currentSettings.registrationStartTime),
        registrationEndTime: formatDateForInput(currentSettings.registrationEndTime),
        competitionStartTime: formatDateForInput(currentSettings.competitionStartTime),
        readingDurationMinutes: currentSettings.readingDurationMinutes || 30,
        answeringDurationMinutes: currentSettings.answeringDurationMinutes || 15,
      });
    }
  });

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

function SubmissionsTab() {
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState<string>("all");

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

  const formatTime = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

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
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reading Time</TableHead>
                  <TableHead>Auto Score</TableHead>
                  <TableHead>Manual Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions?.map((submission) => (
                  <TableRow key={submission.id} data-testid={`row-submission-${submission.id}`}>
                    <TableCell className="font-medium">
                      {(submission as any).userName || "Unknown"}
                    </TableCell>
                    <TableCell><Badge variant="outline">{getCategoryTitle(submission.category)}</Badge></TableCell>
                    <TableCell>{formatDuration(submission.readingSeconds)}</TableCell>
                    <TableCell>{submission.score ?? "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
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
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full max-w-3xl">
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
          </TabsList>

          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="books"><BooksTab /></TabsContent>
          <TabsContent value="questions"><QuestionsTab /></TabsContent>
          <TabsContent value="prizes"><PrizesTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
