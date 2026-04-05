import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Loader2, Edit, Eye, EyeOff } from "lucide-react";
import type { Category, Competition, CompetitionBook } from "@shared/schema";
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

interface CompetitionWithDetails extends Competition {
  book?: CompetitionBook;
  questionCount: number;
  registrationCount: number;
}

function CompetitionsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "kid" as Category,
    description: "",
    prizeContent: "",
    titleTranslations: {} as Record<string, string>,
    descriptionTranslations: {} as Record<string, string>,
    prizeTranslations: {} as Record<string, string>,
    supportedLanguages: "tr",
    registrationStartTime: "",
    registrationEndTime: "",
    competitionStartTime: "",
    competitionEndTime: "",
    readingDurationMinutes: 30,
    answeringDurationMinutes: 15,
  });

  const { data: competitions, isLoading, refetch } = useQuery<CompetitionWithDetails[]>({
    queryKey: ["/api/admin/competitions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/admin/competitions", {
        ...data,
        prizeContent: data.prizeContent || null,
        titleTranslations: JSON.stringify(data.titleTranslations || {}),
        descriptionTranslations: JSON.stringify(data.descriptionTranslations || {}),
        prizeTranslations: JSON.stringify(data.prizeTranslations || {}),
        supportedLanguages: data.supportedLanguages || "tr",
        registrationStartTime: data.registrationStartTime || null,
        registrationEndTime: data.registrationEndTime || null,
        competitionStartTime: data.competitionStartTime || null,
        competitionEndTime: data.competitionEndTime || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Competition created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const res = await apiRequest("PUT", `/api/admin/competitions/${data.id}`, {
        ...data,
        prizeContent: data.prizeContent || null,
        titleTranslations: JSON.stringify(data.titleTranslations || {}),
        descriptionTranslations: JSON.stringify(data.descriptionTranslations || {}),
        prizeTranslations: JSON.stringify(data.prizeTranslations || {}),
        supportedLanguages: data.supportedLanguages || "tr",
        registrationStartTime: data.registrationStartTime || null,
        registrationEndTime: data.registrationEndTime || null,
        competitionStartTime: data.competitionStartTime || null,
        competitionEndTime: data.competitionEndTime || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Competition updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/competitions/${id}`, {});
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      toast({ title: "Competition deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/admin/competitions/${id}/publish`, {});
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      toast({ title: "Competition published" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to publish", description: error.message, variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/admin/competitions/${id}/close`, {});
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      toast({ title: "Competition closed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to close", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "kid",
      description: "",
      prizeContent: "",
      titleTranslations: {},
      descriptionTranslations: {},
      prizeTranslations: {},
      supportedLanguages: "tr",
      registrationStartTime: "",
      registrationEndTime: "",
      competitionStartTime: "",
      competitionEndTime: "",
      readingDurationMinutes: 30,
      answeringDurationMinutes: 15,
    });
    setEditingCompetition(null);
  };

  const formatDateForInput = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  const parseTranslations = (val: any): Record<string, string> => {
    if (!val) return {};
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return val;
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      title: competition.title,
      category: competition.category,
      description: competition.description || "",
      prizeContent: competition.prizeContent || "",
      titleTranslations: parseTranslations((competition as any).titleTranslations),
      descriptionTranslations: parseTranslations((competition as any).descriptionTranslations),
      prizeTranslations: parseTranslations((competition as any).prizeTranslations),
      supportedLanguages: (competition as any).supportedLanguages || "tr",
      registrationStartTime: formatDateForInput(competition.registrationStartTime),
      registrationEndTime: formatDateForInput(competition.registrationEndTime),
      competitionStartTime: formatDateForInput(competition.competitionStartTime),
      competitionEndTime: formatDateForInput(competition.competitionEndTime),
      readingDurationMinutes: competition.readingDurationMinutes || 30,
      answeringDurationMinutes: competition.answeringDurationMinutes || 15,
    });
    setIsDialogOpen(true);
  };

  const getFormErrors = () => {
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push("Title is required");
    if (formData.registrationStartTime && formData.registrationEndTime) {
      if (new Date(formData.registrationStartTime) >= new Date(formData.registrationEndTime)) {
        errors.push("Registration start must be before registration end");
      }
    }
    if (formData.competitionStartTime && formData.competitionEndTime) {
      if (new Date(formData.competitionStartTime) >= new Date(formData.competitionEndTime)) {
        errors.push("Competition start must be before competition end");
      }
    }
    if (formData.registrationEndTime && formData.competitionEndTime) {
      if (new Date(formData.registrationEndTime) > new Date(formData.competitionEndTime)) {
        errors.push("Registration must end before or when competition ends");
      }
    }
    if (formData.readingDurationMinutes < 1) errors.push("Reading duration must be at least 1 minute");
    if (formData.answeringDurationMinutes < 1) errors.push("Answering duration must be at least 1 minute");
    return errors;
  };

  const formErrors = getFormErrors();

  const handleSubmit = () => {
    if (formErrors.length > 0) {
      toast({ title: "Please fix the following", description: formErrors.join(". "), variant: "destructive" });
      return;
    }
    if (editingCompetition) {
      updateMutation.mutate({ ...formData, id: editingCompetition.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return <Badge variant="secondary">Draft</Badge>;
      case "ACTIVE": return <Badge className="bg-green-600">Active</Badge>;
      case "CLOSED": return <Badge variant="destructive">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold">Competition Manager</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-competition">
              <Plus className="h-4 w-4" />
              Create Competition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompetition ? "Edit Competition" : "Create Competition"}</DialogTitle>
              <DialogDescription>Configure the competition settings</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Competition title (default/fallback)"
                    data-testid="input-competition-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as Category })}>
                    <SelectTrigger data-testid="select-competition-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Competition description (default/fallback)"
                  data-testid="textarea-competition-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Prize Details</Label>
                <Textarea
                  value={formData.prizeContent}
                  onChange={(e) => setFormData({ ...formData, prizeContent: e.target.value })}
                  placeholder="Describe the prizes (default/fallback)"
                  rows={3}
                  data-testid="textarea-competition-prize"
                />
              </div>
              <div className="space-y-2">
                <Label>Supported Languages</Label>
                <div className="flex flex-wrap gap-2" data-testid="languages-selector">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const selected = formData.supportedLanguages.split(",").includes(lang.code);
                    return (
                      <Button
                        key={lang.code}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => {
                          const current = formData.supportedLanguages.split(",").filter(Boolean);
                          let next: string[];
                          if (selected) {
                            next = current.filter((c) => c !== lang.code);
                            if (next.length === 0) next = ["tr"]; // always at least one
                          } else {
                            next = [...current, lang.code];
                          }
                          setFormData({ ...formData, supportedLanguages: next.join(",") });
                        }}
                        data-testid={`lang-toggle-${lang.code}`}
                      >
                        {lang.flag} {lang.name}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Select languages for this competition. Students will choose their language at registration.</p>
              </div>

              {/* Per-language translations */}
              {formData.supportedLanguages.split(",").filter(Boolean).length > 0 && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <Label className="text-sm font-semibold">Translations per Language</Label>
                  <p className="text-xs text-muted-foreground">Fill in title, description, and prize for each supported language. Students will see these in their competition language.</p>
                  {formData.supportedLanguages.split(",").filter(Boolean).map((langCode) => {
                    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
                    if (!lang) return null;
                    return (
                      <div key={langCode} className="space-y-2 border-l-4 border-primary/30 pl-3">
                        <p className="text-sm font-medium">{lang.flag} {lang.name}</p>
                        <div className="space-y-2">
                          <Input
                            value={formData.titleTranslations[langCode] || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              titleTranslations: { ...formData.titleTranslations, [langCode]: e.target.value }
                            })}
                            placeholder={`Title in ${lang.name}`}
                          />
                          <Textarea
                            value={formData.descriptionTranslations[langCode] || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              descriptionTranslations: { ...formData.descriptionTranslations, [langCode]: e.target.value }
                            })}
                            placeholder={`Description in ${lang.name}`}
                            rows={2}
                          />
                          <Textarea
                            value={formData.prizeTranslations[langCode] || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              prizeTranslations: { ...formData.prizeTranslations, [langCode]: e.target.value }
                            })}
                            placeholder={`Prize details in ${lang.name}`}
                            rows={2}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Registration Start</Label>
                  <Input
                    type="datetime-local"
                    value={formData.registrationStartTime}
                    onChange={(e) => setFormData({ ...formData, registrationStartTime: e.target.value })}
                    data-testid="input-reg-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registration End</Label>
                  <Input
                    type="datetime-local"
                    value={formData.registrationEndTime}
                    onChange={(e) => setFormData({ ...formData, registrationEndTime: e.target.value })}
                    data-testid="input-reg-end"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Competition Start</Label>
                  <Input
                    type="datetime-local"
                    value={formData.competitionStartTime}
                    onChange={(e) => setFormData({ ...formData, competitionStartTime: e.target.value })}
                    data-testid="input-comp-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Competition End</Label>
                  <Input
                    type="datetime-local"
                    value={formData.competitionEndTime}
                    onChange={(e) => setFormData({ ...formData, competitionEndTime: e.target.value })}
                    data-testid="input-comp-end"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reading Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.readingDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, readingDurationMinutes: parseInt(e.target.value) || 30 })}
                    min={1}
                    data-testid="input-reading-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Answering Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.answeringDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, answeringDurationMinutes: parseInt(e.target.value) || 15 })}
                    min={1}
                    data-testid="input-answering-duration"
                  />
                </div>
              </div>
            </div>
            {formErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1" data-testid="text-competition-form-errors">
                {formErrors.map((error, i) => (
                  <p key={i} className="text-sm text-destructive">{error}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || formErrors.length > 0} data-testid="button-save-competition">
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingCompetition ? "Update" : "Create"} Competition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {competitions?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No competitions yet. Create your first competition above.</p>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Competition Period</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitions?.map((comp) => (
                    <TableRow key={comp.id} data-testid={`competition-row-${comp.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {comp.title}
                          {comp.prizeContent && <Badge variant="outline" className="text-xs">Prize</Badge>}
                          {((comp as any).supportedLanguages || "tr").split(",").length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {((comp as any).supportedLanguages || "tr").split(",").map((code: string) => {
                                const l = SUPPORTED_LANGUAGES.find((sl) => sl.code === code);
                                return l?.flag || code;
                              }).join(" ")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{getCategoryTitle(comp.category)}</Badge></TableCell>
                      <TableCell>{getStatusBadge(comp.status)}</TableCell>
                      <TableCell>{comp.questionCount || 0}</TableCell>
                      <TableCell>{comp.registrationCount || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {comp.competitionStartTime && comp.competitionEndTime ? (
                          <>
                            {new Date(comp.competitionStartTime).toLocaleDateString()} - {new Date(comp.competitionEndTime).toLocaleDateString()}
                          </>
                        ) : (
                          "Not set"
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(comp)} data-testid={`button-edit-competition-${comp.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {comp.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const issues: string[] = [];
                              if (!comp.competitionStartTime) issues.push("Set a competition start time");
                              if (!comp.competitionEndTime) issues.push("Set a competition end time");
                              if ((comp.questionCount || 0) === 0) issues.push("Add at least one question");
                              if (!comp.book) issues.push("Add a book/reading material");
                              if (issues.length > 0) {
                                toast({ title: "Cannot publish yet", description: issues.join(". ") + ".", variant: "destructive" });
                                return;
                              }
                              publishMutation.mutate(comp.id);
                            }}
                            data-testid={`button-publish-competition-${comp.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {comp.status === "ACTIVE" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-close-competition-${comp.id}`}>
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Close Competition?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will close "{comp.title}". Students will no longer be able to register or participate. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-close-competition">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => closeMutation.mutate(comp.id)} data-testid="button-confirm-close-competition">Close Competition</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-competition-${comp.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Competition?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{comp.title}" and all associated books, questions, registrations, and submissions. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(comp.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CompetitionsTab;
