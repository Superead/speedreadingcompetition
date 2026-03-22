import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download, Loader2, Trophy, Eye, EyeOff, RefreshCw } from "lucide-react";
import type { CompetitionSettings, Category, Competition } from "@shared/schema";

const CATEGORIES: Category[] = ["kid", "teen", "adult"];

function getCategoryTitle(category: string) {
  switch (category) {
    case "kid": return "Kids";
    case "teen": return "Teens";
    case "adult": return "Adults";
    default: return category;
  }
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
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("all");

  const { data: competitions } = useQuery<Competition[]>({
    queryKey: ["/api/admin/competitions"],
  });

  const categoryCompetitions = competitions?.filter(c => c.category === selectedCategory) || [];

  const selectedCompetition = selectedCompetitionId !== "all"
    ? categoryCompetitions.find(c => c.id === selectedCompetitionId)
    : null;

  // Published state: per-competition if one is selected, otherwise per-category settings
  const { data: settings } = useQuery<CompetitionSettings[]>({
    queryKey: ["/api/admin/settings"],
  });

  const isPublished = selectedCompetition
    ? selectedCompetition.resultsPublishedAt != null
    : settings?.find(s => s.category === selectedCategory)?.resultsPublishedAt != null;

  const leaderboardUrl = selectedCompetitionId !== "all"
    ? `/api/admin/leaderboard/${selectedCategory}?competitionId=${selectedCompetitionId}`
    : `/api/admin/leaderboard/${selectedCategory}`;

  const { data: leaderboard, isLoading, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/admin/leaderboard", selectedCategory, selectedCompetitionId],
    queryFn: async () => {
      const res = await fetch(leaderboardUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (force?: boolean) => {
      const forceParam = force ? "?force=true" : "";
      if (selectedCompetitionId !== "all") {
        const res = await apiRequest("PUT", `/api/admin/competitions/${selectedCompetitionId}/results/publish${forceParam}`, {});
        return res.json();
      } else {
        const res = await apiRequest("PUT", `/api/admin/results/publish/${selectedCategory}${forceParam}`, {});
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard"] });
      const label = selectedCompetition?.title || getCategoryTitle(selectedCategory);
      toast({ title: "Results published", description: `${label} leaderboard is now visible to students.` });
    },
    onError: (error: Error) => {
      // If competition hasn't ended, offer to force publish
      if (error.message.includes("haven't ended") || error.message.includes("hasn't ended")) {
        const confirmed = window.confirm(
          `${error.message}\n\nDo you want to publish results anyway?`
        );
        if (confirmed) {
          publishMutation.mutate(true);
        }
      } else {
        toast({ title: "Failed to publish", description: error.message, variant: "destructive" });
      }
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (selectedCompetitionId !== "all") {
        const res = await apiRequest("PUT", `/api/admin/competitions/${selectedCompetitionId}/results/unpublish`, {});
        return res.json();
      } else {
        const res = await apiRequest("PUT", `/api/admin/results/unpublish/${selectedCategory}`, {});
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard"] });
      const label = selectedCompetition?.title || getCategoryTitle(selectedCategory);
      toast({ title: "Results unpublished", description: `${label} leaderboard is now hidden from students.` });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard"] });
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

  const leaderboardTitle = selectedCompetition
    ? selectedCompetition.title
    : `${getCategoryTitle(selectedCategory)} (All Competitions)`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={(v) => {
              setSelectedCategory(v as Category);
              setSelectedCompetitionId("all");
            }}>
              <SelectTrigger className="w-32" data-testid="select-leaderboard-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{getCategoryTitle(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Competition</Label>
            <Select value={selectedCompetitionId} onValueChange={setSelectedCompetitionId}>
              <SelectTrigger className="w-48" data-testid="select-leaderboard-competition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Competitions</SelectItem>
                {categoryCompetitions.map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>{comp.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              onClick={() => publishMutation.mutate(false)}
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
            {leaderboardTitle}
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

export default LeaderboardTab;
