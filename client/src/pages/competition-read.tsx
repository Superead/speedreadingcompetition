import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DurationTimer } from "@/components/countdown-timer";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Clock, BookOpen, CheckCircle, AlertTriangle, Loader2,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Columns,
} from "lucide-react";
import type { Book, Submission, CompetitionSettings } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReadingData {
  book: Book | null;
  submission: Submission | null;
  settings: CompetitionSettings | null;
}

const FONT_OPTIONS = [
  { name: "Times New Roman", label: "Times" },
  { name: "Georgia", label: "Georgia" },
  { name: "'Garamond', serif", label: "Garamond" },
  { name: "'Open Sans', sans-serif", label: "Sans" },
];

export default function CompetitionReadPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [autoFinishing, setAutoFinishing] = useState(false);
  const finishingRef = useRef(false);

  // Book pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fontSize, setFontSize] = useState(() =>
    parseInt(localStorage.getItem("reader_fontSize") || "18")
  );
  const [fontFamily, setFontFamily] = useState(
    () => localStorage.getItem("reader_fontFamily") || "Times New Roman"
  );
  const [dualPage, setDualPage] = useState(false);
  const [pageHeight, setPageHeight] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const contentRef2 = useRef<HTMLDivElement>(null); // right page in dual mode
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery<ReadingData>({
    queryKey: ["/api/student/reading"],
    enabled: !!token,
  });

  const startReadingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/start-reading", {});
      return res.json();
    },
    onSuccess: () => {
      setHasStarted(true);
      refetch();
      toast({
        title: "Reading started!",
        description: "Your timer has begun. Good luck!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finishReadingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/finish-reading", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/dashboard"] });
      toast({
        title: "Reading completed!",
        description: "Now answer the questions.",
      });
      navigate("/competition/questions");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to finish",
        description: error.message,
        variant: "destructive",
      });
      finishingRef.current = false;
      setAutoFinishing(false);
    },
  });

  const isReadingActive =
    data?.submission?.readingStartAt && !data?.submission?.readingEndAt;
  const hasFinishedReading = data?.submission?.readingEndAt != null;
  const hasCompletedCompetition = data?.submission?.answerEndAt != null;

  // Block copy shortcuts (Ctrl+C, Ctrl+A, Ctrl+U, Ctrl+S) and PrintScreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "a", "u", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (hasCompletedCompetition) {
      toast({
        title: "Competition already completed",
        description:
          "You have already finished this competition. Results will be announced soon.",
      });
      navigate("/dashboard");
      return;
    }
    if (hasFinishedReading) {
      navigate("/competition/questions");
    }
  }, [hasFinishedReading, hasCompletedCompetition, navigate]);

  // Auto-finish reading when competition ends
  useEffect(() => {
    if (
      !isReadingActive ||
      !data?.settings?.competitionEndTime ||
      autoFinishing ||
      hasFinishedReading
    )
      return;

    const competitionEnd = new Date(data.settings.competitionEndTime);
    const now = new Date();

    const triggerAutoFinish = () => {
      if (finishingRef.current || autoFinishing) return;
      finishingRef.current = true;
      setAutoFinishing(true);
      toast({
        title: "Competition has ended",
        description: "Finishing reading and submitting your attempt.",
        variant: "destructive",
      });
      finishReadingMutation.mutate();
    };

    if (now > competitionEnd) {
      triggerAutoFinish();
      return;
    }

    const timeUntilEnd = competitionEnd.getTime() - now.getTime();
    if (timeUntilEnd > 0) {
      const timeout = setTimeout(triggerAutoFinish, timeUntilEnd);
      return () => clearTimeout(timeout);
    }
  }, [
    isReadingActive,
    data?.settings?.competitionEndTime,
    autoFinishing,
    hasFinishedReading,
  ]);

  const handleTimeUp = () => {
    if (isReadingActive && !finishingRef.current) {
      finishingRef.current = true;
      setAutoFinishing(true);
      toast({
        title: "Time's up!",
        description: "Your reading time has ended.",
        variant: "destructive",
      });
      finishReadingMutation.mutate();
    }
  };

  // Persist font settings to localStorage
  useEffect(() => {
    localStorage.setItem("reader_fontSize", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("reader_fontFamily", fontFamily);
  }, [fontFamily]);

  // Calculate pages using vertical pagination (scrollHeight / visible height)
  const recalcPages = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    // Temporarily reset transform so scrollHeight reflects full content
    const prevTransform = content.style.transform;
    const prevTransition = content.style.transition;
    content.style.transition = "none";
    content.style.transform = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rawH = container.offsetHeight;
        if (rawH === 0) return;
        // Snap page height to a multiple of line-height so text isn't cut mid-line
        const lineH = fontSize * 1.8;
        const ch = Math.floor(rawH / lineH) * lineH;
        setPageHeight(ch);
        const sh = content.scrollHeight;
        const pages = Math.max(1, Math.ceil(sh / ch));
        setTotalPages(pages);
        setCurrentPage((prev) => Math.min(prev, pages));
        // Restore — React will apply the correct transform on next render
        content.style.transition = prevTransition;
      });
    });
  }, [fontSize]);

  useEffect(() => {
    recalcPages();
  }, [data?.book?.content, fontSize, fontFamily, dualPage, recalcPages]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => recalcPages();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [recalcPages]);

  // Navigate to a specific page
  const pageStep = dualPage ? 2 : 1;
  const goToPage = useCallback(
    (page: number) => {
      const p = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(p);
    },
    [totalPages]
  );

  // Keyboard navigation (Left/Right arrow keys)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToPage(currentPage + pageStep);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPage(currentPage - pageStep);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, goToPage, pageStep]);

  // ---- Early returns for loading / no-book / pre-start states ----

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 border-b bg-card">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="container mx-auto p-8">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!data?.book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold">No Book Available</h2>
            <p className="text-muted-foreground">
              The book for this competition has not been uploaded yet.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isReadingActive && !hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{data.book.title}</h2>
              <p className="text-muted-foreground">
                You have{" "}
                <span className="font-semibold text-foreground">
                  {data.settings?.readingDurationMinutes || 30} minutes
                </span>{" "}
                to read.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Instructions
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your timer starts when you click "Start Reading"</li>
                <li>
                  • Read carefully as you'll answer questions afterwards
                </li>
                <li>• Click "Finish Reading" when done</li>
                <li>• Timer auto-submits when time runs out</li>
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => startReadingMutation.mutate()}
              disabled={startReadingMutation.isPending}
              data-testid="button-start-reading-now"
            >
              {startReadingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Reading"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Active reading view ----

  const readingStart = data.submission?.readingStartAt
    ? new Date(data.submission.readingStartAt)
    : new Date();
  const durationMinutes = data.settings?.readingDurationMinutes || 30;
  const endTime = new Date(
    readingStart.getTime() + durationMinutes * 60 * 1000
  );
  const progress = Math.max(
    0,
    Math.min(
      100,
      ((Date.now() - readingStart.getTime()) /
        (durationMinutes * 60 * 1000)) *
        100
    )
  );

  const isPdfContent = !data.book.content && data.book.fileUrl;
  const translateY =
    pageHeight > 0 ? -((currentPage - 1) * pageHeight) : 0;
  // Right page in dual mode shows the next page
  const translateY2 =
    pageHeight > 0 ? -(currentPage * pageHeight) : 0;

  const bookContent =
    data.book.content?.replace(/\n/g, "<br><br>") ||
    '<p style="text-align:center;color:#888;padding:3rem 0">No content available</p>';

  const contentStyle: React.CSSProperties = {
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: "1.8",
    textAlign: "justify",
    paddingTop: `${fontSize * 1.8}px`,
    paddingBottom: `${fontSize * 1.8}px`,
    paddingLeft: "3rem",
    paddingRight: "3rem",
    WebkitUserSelect: "none",
    userSelect: "none",
  };

  const contentHandlers = {
    onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
    onCut: (e: React.ClipboardEvent) => e.preventDefault(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header with timer */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold hidden sm:inline">
                {data.book.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Time remaining:</span>
                <DurationTimer
                  startTime={readingStart}
                  durationMinutes={durationMinutes}
                  onComplete={handleTimeUp}
                  size="sm"
                />
              </div>
            </div>
          </div>
          <Progress value={progress} className="mt-2 h-1" />
        </div>
      </header>

      {isPdfContent ? (
        /* ---------- PDF viewer (unchanged) ---------- */
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div
                className="prose prose-lg dark:prose-invert max-w-none"
                data-testid="book-content"
              >
                <div className="w-full">
                  <object
                    data={data.book.fileUrl!}
                    type="application/pdf"
                    className="w-full"
                    style={{ height: "58vh" }}
                  >
                    <iframe
                      src={`${data.book.fileUrl}#toolbar=0`}
                      className="w-full border-0"
                      style={{ height: "58vh" }}
                      title="Reading material"
                    >
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Your browser cannot display the PDF inline.{" "}
                        <a
                          href={data.book.fileUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Open PDF in new tab
                        </a>
                      </p>
                    </iframe>
                  </object>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      ) : (
        /* ---------- Paginated book view ---------- */
        <main className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 py-1">
          {/* Toolbar — single row with page nav, font, zoom, dual toggle */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 border-b bg-card rounded-t-lg px-2 flex-wrap">
            {FONT_OPTIONS.map((f) => (
              <Button
                key={f.name}
                variant={fontFamily === f.name ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setFontFamily(f.name)}
                style={{ fontFamily: f.name }}
              >
                {f.label}
              </Button>
            ))}

            <div className="h-5 w-px bg-border mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                setFontSize((prev) => Math.max(14, prev - 2))
              }
              disabled={fontSize <= 14}
              title="Decrease font size"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-6 text-center tabular-nums">
              {fontSize}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                setFontSize((prev) => Math.min(28, prev + 2))
              }
              disabled={fontSize >= 28}
              title="Increase font size"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <div className="h-5 w-px bg-border mx-1 hidden md:block" />

            {/* Dual/Single page toggle -- only on wider screens */}
            <Button
              variant={dualPage ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 hidden md:flex"
              onClick={() => setDualPage((prev) => !prev)}
              title={dualPage ? "Single page view" : "Dual page view"}
            >
              <Columns className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Page content with left/right navigation arrows */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-1 min-h-0">
            {/* Left arrow */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToPage(currentPage - pageStep)}
              disabled={currentPage === 1}
              className="shrink-0 h-10 w-10 sm:h-12 sm:w-12"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {dualPage ? (
              /* ---- Dual page: two side-by-side panels, left=page N, right=page N+1 ---- */
              <div
                ref={containerRef}
                className="flex gap-0 rounded-lg shadow-lg border overflow-hidden"
                style={{
                  height: "calc(100vh - 240px)",
                  width: "min(900px, calc(100vw - 120px))",
                  flexShrink: 0,
                }}
              >
                {/* Left page */}
                <div className="flex-1 bg-white dark:bg-card overflow-hidden"
                  style={{ height: pageHeight > 0 ? `${pageHeight}px` : "100%" }}
                >
                  <div
                    ref={contentRef}
                    className="select-none"
                    data-testid="book-content"
                    style={{ ...contentStyle, transform: `translateY(${translateY}px)`, transition: "transform 0.3s ease" }}
                    {...contentHandlers}
                    dangerouslySetInnerHTML={{ __html: bookContent }}
                  />
                </div>
                {/* Center divider */}
                <div className="w-px bg-border shrink-0" />
                {/* Right page */}
                <div className="flex-1 bg-white dark:bg-card overflow-hidden"
                  style={{
                    height: pageHeight > 0 ? `${pageHeight}px` : "100%",
                    visibility: currentPage < totalPages ? "visible" : "hidden",
                  }}
                >
                  <div
                    ref={contentRef2}
                    className="select-none"
                    style={{ ...contentStyle, transform: `translateY(${translateY2}px)`, transition: "transform 0.3s ease" }}
                    {...contentHandlers}
                    dangerouslySetInnerHTML={{ __html: bookContent }}
                  />
                </div>
              </div>
            ) : (
              /* ---- Single page ---- */
              <div
                className="bg-white dark:bg-card rounded-lg shadow-lg border"
                ref={containerRef}
                style={{
                  overflow: "hidden",
                  height: "calc(100vh - 240px)",
                  width: "min(600px, calc(100vw - 120px))",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  overflow: "hidden",
                  height: pageHeight > 0 ? `${pageHeight}px` : "100%",
                  width: "100%",
                }}>
                  <div
                    ref={contentRef}
                    className="select-none"
                    data-testid="book-content"
                    style={{ ...contentStyle, transform: `translateY(${translateY}px)`, transition: "transform 0.3s ease" }}
                    {...contentHandlers}
                    dangerouslySetInnerHTML={{ __html: bookContent }}
                  />
                </div>
              </div>
            )}

            {/* Right arrow */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToPage(currentPage + pageStep)}
              disabled={currentPage >= totalPages}
              className="shrink-0 h-10 w-10 sm:h-12 sm:w-12"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>

          {/* Page counter */}
          <div className="text-center text-xs text-muted-foreground py-1 font-medium tabular-nums">
            {dualPage ? `${currentPage}-${Math.min(currentPage + 1, totalPages)} / ${totalPages}` : `${currentPage} / ${totalPages}`}
          </div>
        </main>
      )}

      {/* Sticky footer with finish button */}
      <footer className="sticky bottom-0 border-t bg-card py-2">
        <div className="container mx-auto px-4 flex justify-center">
          <Button
            size="lg"
            onClick={() => setShowFinishDialog(true)}
            className="gap-2"
            data-testid="button-finish-reading"
          >
            <CheckCircle className="h-5 w-5" />
            Finish Reading
          </Button>
        </div>
      </footer>

      {/* Finish reading confirmation dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Reading?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish reading? You won't be able to
              come back to the book. You will proceed to the questions section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Reading</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (finishingRef.current) return;
                finishingRef.current = true;
                setAutoFinishing(true);
                finishReadingMutation.mutate();
              }}
              disabled={finishReadingMutation.isPending}
            >
              {finishReadingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                "Yes, Finish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
