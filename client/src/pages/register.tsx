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
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Category, Competition } from "@shared/schema";
import { SUPPORTED_LANGUAGES } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/lib/i18n";
import i18n from "@/lib/i18n";

function getLocalizedCompField(comp: any, field: string, lang: string): string {
  const key = field === 'prizeContent' ? 'prizeTranslations' : `${field}Translations`;
  const raw = comp?.[key];
  if (raw) {
    try {
      const translations = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (translations[lang]) return translations[lang];
    } catch {}
  }
  return comp?.[field] || "";
}

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

function getCategoryFromAge(age: number): Category | null {
  if (age >= 6 && age <= 12) return "kid";
  if (age >= 13 && age <= 17) return "teen";
  if (age >= 18) return "adult";
  return null;
}

function getCategoryTitle(category: Category) {
  switch (category) {
    case "kid": return "Kids (6-12)";
    case "teen": return "Teens (13-17)";
    case "adult": return "Adults (18+)";
  }
}

function getCategoryColor(category: Category) {
  switch (category) {
    case "kid": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "teen": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "adult": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
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
  preferredLanguage: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const params = useParams<{ category?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { t } = useTranslation();

  const { data: competitions } = useQuery<Competition[]>({
    queryKey: ["/api/competitions/public"],
  });

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
      preferredLanguage: "tr",
    },
  });

  const birthdate = form.watch("birthdate");

  // Auto-detect category from birthdate, or use URL param as fallback
  const detectedCategory: Category | null = birthdate
    ? getCategoryFromAge(getAgeFromBirthdate(birthdate))
    : (params.category && ["kid", "teen", "adult"].includes(params.category))
      ? (params.category as Category)
      : null;

  const age = birthdate ? getAgeFromBirthdate(birthdate) : null;
  const ageError = age !== null && age < 6 ? "You must be at least 6 years old to register." : null;

  // Check if there's an active competition for the detected category
  const activeCompetition = detectedCategory
    ? competitions?.find(c => c.category === detectedCategory && c.status === "ACTIVE")
    : null;

  // Always show all supported languages so users can pick their preferred competition language
  const competitionLanguages = activeCompetition
    ? ((activeCompetition as any).supportedLanguages || "tr").split(",").filter(Boolean)
    : SUPPORTED_LANGUAGES.map(l => l.code);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const res = await apiRequest("POST", "/api/auth/register", {
        ...data,
        category: detectedCategory,
        preferredLanguage: data.preferredLanguage || "tr",
      });
      return res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      // Sync i18n with chosen language
      if (data.user.preferredLanguage) {
        changeLanguage(data.user.preferredLanguage);
      }
      toast({
        title: t('register.success'),
        description: t('register.welcome', { name: data.user.name }),
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
      toast({ title: "Age restriction", description: ageError, variant: "destructive" });
      return;
    }
    if (!detectedCategory) {
      toast({ title: "Date of birth required", description: "Please enter your date of birth so we can assign you to the right category.", variant: "destructive" });
      return;
    }
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            {t('register.backToHome')}
          </Button>
        </Link>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
            <CardDescription>
              {t('register.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('register.firstName')} *</FormLabel>
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
                        <FormLabel>{t('register.lastName')} *</FormLabel>
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
                  name="birthdate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.dateOfBirth')} *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-birthdate" />
                      </FormControl>
                      <FormMessage />
                      {ageError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{t('register.ageError')}</AlertDescription>
                        </Alert>
                      )}
                      {detectedCategory && !ageError && (
                        <div className="mt-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-muted-foreground">
                            {t('register.category')}: <Badge className={getCategoryColor(detectedCategory)}>{getCategoryTitle(detectedCategory)}</Badge>
                          </span>
                          {activeCompetition && (
                            <span className="text-xs text-green-600 ml-1">• {getLocalizedCompField(activeCompetition, 'title', i18n.language) || activeCompetition.title}</span>
                          )}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.email')} *</FormLabel>
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
                      <FormLabel>{t('register.password')} *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t('register.passwordHint')} {...field} data-testid="input-password" />
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
                      <FormLabel>{t('register.gender')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder={t('register.selectGender')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">{t('register.genderMale')}</SelectItem>
                          <SelectItem value="female">{t('register.genderFemale')}</SelectItem>
                          <SelectItem value="other">{t('register.genderOther')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.phone')}</FormLabel>
                      <FormControl>
                        <Input placeholder="+90 5XX XXX XXXX" {...field} data-testid="input-phone" />
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
                        <FormLabel>{t('register.city')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Istanbul" {...field} data-testid="input-city" />
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
                        <FormLabel>{t('register.country')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Turkey" {...field} data-testid="input-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                    control={form.control}
                    name="preferredLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('register.competitionLanguage')} *</FormLabel>
                        <FormDescription>
                          {t('register.languageHint')}
                        </FormDescription>
                        <div className="flex flex-wrap gap-2">
                          {competitionLanguages.map((code: string) => {
                            const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                            if (!lang) return null;
                            return (
                              <Button
                                key={code}
                                type="button"
                                size="sm"
                                variant={field.value === code ? "default" : "outline"}
                                onClick={() => field.onChange(code)}
                                data-testid={`lang-pick-${code}`}
                              >
                                {lang.flag} {lang.name}
                              </Button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('register.referralCode')}</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC123" {...field} data-testid="input-referral-code" />
                      </FormControl>
                      <FormDescription>
                        {t('register.referralHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending || !!ageError || !detectedCategory}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('register.registering')}
                    </>
                  ) : (
                    t('register.submitButton')
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {t('register.alreadyHaveAccount')}{" "}
                  <Link href="/login">
                    <Button variant="ghost" className="p-0 h-auto underline">
                      {t('register.loginHere')}
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
