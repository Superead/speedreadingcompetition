import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Loader2 } from "lucide-react";
import type { Prize, Category } from "@shared/schema";

const CATEGORIES: Category[] = ["kid", "teen", "adult"];

function getCategoryTitle(category: string) {
  switch (category) {
    case "kid": return "Kids";
    case "teen": return "Teens";
    case "adult": return "Adults";
    default: return category;
  }
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

  useEffect(() => {
    if (currentPrize) {
      setContent(currentPrize.content || "");
    } else {
      setContent("");
    }
  }, [currentPrize]);

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

export default PrizesTab;
