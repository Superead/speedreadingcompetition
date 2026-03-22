import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Loader2 } from "lucide-react";
import type { CompetitionSettings, Category } from "@shared/schema";

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

export default SettingsTab;
