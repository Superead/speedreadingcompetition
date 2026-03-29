import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download, Plus, Trash2, Loader2, GraduationCap } from "lucide-react";
import type { User, Category } from "@shared/schema";
import { SUPPORTED_LANGUAGES } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES: Category[] = ["kid", "teen", "adult"];

function getCategoryTitle(category: string) {
  switch (category) {
    case "kid": return "Kids";
    case "teen": return "Teens";
    case "adult": return "Adults";
    default: return category;
  }
}

function TeacherSection() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", surname: "", languages: [] as string[] });

  const { data: teachers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/teachers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/teachers", {
        email: data.email,
        password: data.password,
        name: data.name,
        surname: data.surname,
        teacherLanguages: data.languages.join(","),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      toast({ title: "Teacher created" });
      setShowCreateDialog(false);
      setForm({ email: "", password: "", name: "", surname: "", languages: [] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create teacher", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/teachers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
      toast({ title: "Teacher deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete teacher", variant: "destructive" });
    },
  });

  const toggleLanguage = (code: string) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter(l => l !== code)
        : [...prev.languages, code],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Teachers</h3>
          <Badge variant="secondary">{teachers?.length || 0}</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : teachers && teachers.length > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name} {teacher.surname}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{teacher.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {((teacher as any).teacherLanguages || "").split(",").filter(Boolean).map((code: string) => {
                          const lang = SUPPORTED_LANGUAGES.find(l => l.code === code.trim());
                          return lang ? (
                            <Badge key={code} variant="outline" className="text-xs">
                              {lang.flag} {lang.code.toUpperCase()}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete teacher ${teacher.name} ${teacher.surname}?`)) {
                            deleteMutation.mutate(teacher.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No teachers yet. Click "Add Teacher" to create one.
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Surname</Label>
                <Input value={form.surname} onChange={e => setForm(prev => ({ ...prev, surname: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Languages (teacher can review these)</Label>
              <div className="flex flex-wrap gap-3">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <label key={lang.code} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.languages.includes(lang.code)}
                      onCheckedChange={() => toggleLanguage(lang.code)}
                    />
                    <span className="text-sm">{lang.flag} {lang.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.email || !form.password || !form.name || !form.surname}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="space-y-8">
      {/* Teacher Management Section */}
      <TeacherSection />

      <hr />

      {/* Student Users Section */}
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
    </div>
  );
}

export default UsersTab;
