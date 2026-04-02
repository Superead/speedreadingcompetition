import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Trash2, Loader2, Upload, FileText, Type } from "lucide-react";
import type { CompetitionBook, Category } from "@shared/schema";
import { SUPPORTED_LANGUAGES } from "@shared/schema";
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

type InputMode = "text" | "pdf";

function BooksTab() {
  const { toast } = useToast();
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("tr");
  const [bookTitle, setBookTitle] = useState("");
  const [bookContent, setBookContent] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [pdfWordCount, setPdfWordCount] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: competitions, isLoading: competitionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/competitions"],
  });

  useEffect(() => {
    if (competitions && competitions.length > 0 && !selectedCompetitionId) {
      const comp = competitions[0];
      setSelectedCompetitionId(comp.id);
      const langs = ((comp as any).supportedLanguages || "tr").split(",");
      setSelectedLanguage(langs[0] || "tr");
    }
  }, [competitions, selectedCompetitionId]);

  const selectedCompetition = competitions?.find((c) => c.id === selectedCompetitionId);
  const competitionLanguages = selectedCompetition
    ? ((selectedCompetition as any).supportedLanguages || "tr").split(",")
    : ["tr"];

  // Fetch all books for this competition (all languages)
  const { data: allBooks } = useQuery<CompetitionBook[]>({
    queryKey: ["/api/admin/competitions", selectedCompetitionId, "books"],
    queryFn: async () => {
      if (!selectedCompetitionId) return [];
      const res = await fetch(`/api/admin/competitions/${selectedCompetitionId}/books`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCompetitionId,
  });

  const { data: currentBook, isLoading: bookLoading } = useQuery<CompetitionBook | null>({
    queryKey: ["/api/admin/competitions", selectedCompetitionId, "book", selectedLanguage],
    queryFn: async () => {
      if (!selectedCompetitionId) return null;
      const res = await fetch(`/api/admin/competitions/${selectedCompetitionId}/book?language=${selectedLanguage}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return null;
      const book = await res.json();
      // Only return if it actually matches our language (not a fallback)
      if (book && (book as any).language === selectedLanguage) return book;
      return null;
    },
    enabled: !!selectedCompetitionId,
  });

  useEffect(() => {
    if (currentBook) {
      setBookTitle(currentBook.title);
      setBookContent(currentBook.content || "");
      setPdfWordCount(currentBook.wordCount ? String(currentBook.wordCount) : "");
      if (currentBook.fileUrl && !currentBook.content) {
        setInputMode("pdf");
      } else {
        setInputMode("text");
      }
    } else {
      setBookTitle("");
      setBookContent("");
      setPdfWordCount("");
      setInputMode("text");
    }
    setSelectedFile(null);
    setUploadProgress("");
  }, [currentBook]);

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content?: string | null; fileUrl?: string; wordCount?: number }) => {
      const res = await apiRequest("POST", `/api/admin/competitions/${selectedCompetitionId}/book`, { ...data, language: selectedLanguage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "book"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
      toast({ title: "Book saved", description: `Book (${langName}) for ${selectedCompetition?.title || "competition"} updated.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, wordCount }: { file: File; title: string; wordCount?: number }) => {
      setUploadProgress("Uploading...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("language", selectedLanguage);
      if (wordCount && wordCount > 0) formData.append("wordCount", String(wordCount));
      const res = await fetch(`/api/admin/competitions/${selectedCompetitionId}/book/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "book"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      setSelectedFile(null);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
      toast({ title: "PDF uploaded", description: `PDF (${langName}) for ${selectedCompetition?.title || "competition"} saved.` });
    },
    onError: (error: Error) => {
      setUploadProgress("");
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/admin/competitions/${selectedCompetitionId}/book?language=${selectedLanguage}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "book"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions", selectedCompetitionId, "books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      setBookTitle("");
      setBookContent("");
      setPdfWordCount("");
      setSelectedFile(null);
      setUploadProgress("");
      toast({ title: "Book deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  if (competitionsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!competitions || competitions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No competitions found. Create a competition first in the Competitions tab.</p>
        </CardContent>
      </Card>
    );
  }

  const groupedCompetitions = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = competitions.filter((c) => c.category === cat);
    return acc;
  }, {} as Record<string, any[]>);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && !bookTitle) {
      setBookTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleSave = () => {
    if (inputMode === "pdf" && selectedFile) {
      uploadMutation.mutate({ file: selectedFile, title: bookTitle, wordCount: parseInt(pdfWordCount) || 0 });
    } else if (inputMode === "pdf" && currentBook?.fileUrl && pdfWordCount) {
      // Update word count for existing PDF without re-uploading
      saveMutation.mutate({ title: bookTitle, content: null as any, fileUrl: currentBook.fileUrl, wordCount: parseInt(pdfWordCount) || 0 });
    } else {
      saveMutation.mutate({ title: bookTitle, content: bookContent });
    }
  };

  const isSaving = saveMutation.isPending || uploadMutation.isPending;
  const canSave = bookTitle && selectedCompetitionId && (
    inputMode === "text" ? true : !!selectedFile || !!currentBook?.fileUrl
  );
  const buttonLabel = inputMode === "pdf"
    ? (selectedFile ? "Upload PDF" : currentBook?.fileUrl ? "Update Book" : "Save Book")
    : "Save Book";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Label>Competition</Label>
        <Select value={selectedCompetitionId} onValueChange={(v) => {
          setSelectedCompetitionId(v);
          const comp = competitions?.find((c: any) => c.id === v);
          const langs = ((comp as any)?.supportedLanguages || "tr").split(",");
          setSelectedLanguage(langs[0] || "tr");
        }}>
          <SelectTrigger className="w-80" data-testid="select-book-competition">
            <SelectValue placeholder="Select a competition" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => {
              const catComps = groupedCompetitions[cat] || [];
              if (catComps.length === 0) return null;
              return (
                <SelectGroup key={cat}>
                  <SelectLabel>{getCategoryTitle(cat)}</SelectLabel>
                  {catComps.map((comp: any) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.title} ({comp.status})
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
        {competitionLanguages.length > 1 && (
          <>
            <Label>Language</Label>
            <div className="flex gap-1">
              {competitionLanguages.map((code: string) => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                if (!lang) return null;
                const hasBook = allBooks?.some(b => (b as any).language === code);
                return (
                  <Button
                    key={code}
                    size="sm"
                    variant={selectedLanguage === code ? "default" : "outline"}
                    onClick={() => setSelectedLanguage(code)}
                    className="gap-1"
                    data-testid={`book-lang-${code}`}
                  >
                    {lang.flag} {lang.name}
                    {hasBook && <span className="text-green-400 ml-1">✓</span>}
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentBook ? currentBook.title : "No Book Added"}
            {competitionLanguages.length > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag} {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {selectedCompetition ? `${getCategoryTitle(selectedCompetition.category)} \u00b7 ${selectedCompetition.status}` : "Select a competition"}
            {" \u2022 "}Manage the reading material for this competition
            {allBooks && allBooks.length > 0 && ` \u2022 ${allBooks.length} language(s) added`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={inputMode === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("text")}
              className="gap-2"
            >
              <Type className="h-4 w-4" />
              Paste Text
            </Button>
            <Button
              variant={inputMode === "pdf" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("pdf")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload PDF
            </Button>
          </div>

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

          {inputMode === "text" ? (
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
          ) : (
            <div className="space-y-3">
              <Label htmlFor="bookFile">PDF File</Label>
              <Input
                id="bookFile"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                data-testid="input-book-file"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
              {uploadProgress && (
                <p className="text-sm text-blue-600 font-medium">{uploadProgress}</p>
              )}
              {currentBook?.fileUrl && !selectedFile && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-md p-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Current PDF:</span>
                  <a
                    href={currentBook.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View PDF
                  </a>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="pdfWordCount">Word Count (required for WPM calculation)</Label>
                <Input
                  id="pdfWordCount"
                  type="number"
                  value={pdfWordCount}
                  onChange={(e) => setPdfWordCount(e.target.value)}
                  placeholder="Enter total word count of the PDF"
                />
                {currentBook?.wordCount ? (
                  <p className="text-xs text-muted-foreground">Current word count: {currentBook.wordCount}</p>
                ) : (
                  <p className="text-xs text-yellow-600 font-medium">No word count set — WPM scoring won't work without this!</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="gap-2"
              data-testid="button-save-book"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : inputMode === "pdf" ? <Upload className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {buttonLabel}
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
                    <AlertDialogDescription>This will remove the book for {selectedCompetition?.title || "this competition"}.</AlertDialogDescription>
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

export default BooksTab;
