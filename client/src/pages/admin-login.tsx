import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { Redirect } from "wouter";

const adminLoginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, user } = useAuth();

  const form = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLoginData) => {
      const res = await apiRequest("POST", "/api/auth/admin-login", data);
      return res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.user);
      toast({
        title: "Admin login successful",
        description: "Welcome to the admin dashboard",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminLoginData) => {
    loginMutation.mutate(data);
  };

  if (user) {
    return <Redirect to={user.role === "ADMIN" ? "/admin" : user.role === "TEACHER" ? "/teacher" : "/dashboard"} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Button>
        </Link>

        <Card>
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Access the competition management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@demo.com"
                          {...field}
                          data-testid="input-admin-email"
                        />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-admin-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login as Admin"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
