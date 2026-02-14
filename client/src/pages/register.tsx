import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Category, Competition } from "@shared/schema";

function getAgeFromBirthdate(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getAgeRange(category: Category): { min: number; max: number | null; label: string } {
  switch (category) {
    case "kid":
      return { min: 6, max: 12, label: "6-12 years old" };
    case "teen":
      return { min: 13, max: 17, label: "13-17 years old" };
    case "adult":
      return { min: 18, max: null, label: "18 years or older" };
  }
}

const registerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  gender: z.enum(["male", "female", "other"]).optional(),
  birthdate: z.string().min(1, "Date of birth is required"),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  referralCode: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

function getCategoryTitle(category: Category) {
  switch (category) {
    case "kid":
      return "Kids";
    case "teen":
      return "Teens";
    case "adult":
      return "Adults";
  }
}

function getCategoryColor(category: Category) {
  switch (category) {
    case "kid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "teen":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "adult":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
}

function isRegistrationOpenForCompetition(comp: Competition): boolean {
  if (!comp.registrationStartTime || !comp.registrationEndTime) return false;
  const now = new Date();
  const start = new Date(comp.registrationStartTime);
  const end = new Date(comp.registrationEndTime);
  return now >= start && now <= end;
}

export default function RegisterPage() {
  const params = useParams<{ category: string }>();
  const category = params.category as Category;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const { data: competitions, isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions/public"],
  });

  const categoryCompetitions = competitions?.filter(c => c.category === category) || [];
  const hasRegistrationOpen = categoryCompetitions.some(c => isRegistrationOpenForCompetition(c));
  const ageRange = getAgeRange(category);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      surname: "",
      email: "",
      password: "",
      gender: undefined,
      birthdate: "",
      phone: "",
      city: "",
      country: "",
      referralCode: "",
    },
  });

  const birthdate = form.watch("birthdate");
  const ageError = (() => {
    if (!birthdate) return null;
    const age = getAgeFromBirthdate(birthdate);
    if (age < 0) return "Invalid date of birth";
    if (category === "kid" && (age < ageRange.min || age > ageRange.max!)) {
      return `Kids category is for ages ${ageRange.label}. You are ${age} years old.`;
    }
    if (category === "teen" && (age < ageRange.min || age > ageRange.max!)) {
      return `Teens category is for ages ${ageRange.label}. You are ${age} years old.`;
    }
    if (category === "adult" && age < ageRange.min) {
      return `Adults category is for ages ${ageRange.label}. You are ${age} years old.`;
    }
    return null;
  })();

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/auth/register", {
        ...data,
        category,
      });
      return res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      toast({
        title: "Registration successful!",
        description: `Welcome, ${data.user.name}! Your affiliate code is ${data.user.affiliateCode}`,
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    if (ageError) {
      toast({
        title: "Age mismatch",
        description: ageError,
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(data);
  };

  if (!["kid", "teen", "adult"].includes(category)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Invalid category</p>
            <Link href="/">
              <Button variant="ghost">Go back home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to categories
          </Button>
        </Link>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={getCategoryColor(category)}>{getCategoryTitle(category)}</Badge>
              <span className="text-sm text-muted-foreground">Ages {ageRange.label}</span>
            </div>
            <CardTitle className="text-2xl">Register for Competition</CardTitle>
            <CardDescription>
              Fill in your details to register for the {getCategoryTitle(category)} speed reading competition.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {competitionsLoading ? (
              <div className="text-center py-6">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : !hasRegistrationOpen ? (
              <div className="text-center py-6 space-y-4">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Registration is currently closed for this category.
                </p>
                <Link href="/">
                  <Button variant="outline" data-testid="button-view-categories">View all categories</Button>
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="surname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-surname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 6 characters" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthdate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-birthdate" />
                        </FormControl>
                        <FormMessage />
                        {ageError && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription data-testid="text-age-error">{ageError}</AlertDescription>
                          </Alert>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="USA" {...field} data-testid="input-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="referralCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referral Code (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC123" {...field} data-testid="input-referral-code" />
                        </FormControl>
                        <FormDescription>
                          Enter a friend's code to give them referral points
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending || !!ageError}
                    data-testid="button-register-submit"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
