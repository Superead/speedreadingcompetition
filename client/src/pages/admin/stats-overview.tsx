import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Trophy, FileText, UserCheck, Zap, Target, TrendingUp
} from "lucide-react";

interface StatsData {
  totalStudents: number;
  activeCompetitions: number;
  totalCompetitions: number;
  totalSubmissions: number;
  totalRegistrations: number;
  avgScore: number;
  avgWPM: number;
  categoryStats: {
    kid: { students: number; submissions: number };
    teen: { students: number; submissions: number };
    adult: { students: number; submissions: number };
  };
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            {subtext && <p className="text-[10px] text-muted-foreground/70">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsOverview() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { kid, teen, adult } = data.categoryStats;

  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          icon={Users}
          label="Students"
          value={data.totalStudents}
          subtext={`${kid.students}K / ${teen.students}T / ${adult.students}A`}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <StatCard
          icon={Trophy}
          label="Active Competitions"
          value={data.activeCompetitions}
          subtext={`${data.totalCompetitions} total`}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <StatCard
          icon={UserCheck}
          label="Registrations"
          value={data.totalRegistrations}
          subtext="active competitions"
          color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
        />
        <StatCard
          icon={FileText}
          label="Submissions"
          value={data.totalSubmissions}
          subtext={`${kid.submissions}K / ${teen.submissions}T / ${adult.submissions}A`}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
        />
        <StatCard
          icon={Zap}
          label="Avg WPM"
          value={data.avgWPM || "—"}
          subtext="reading speed"
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
        />
        <StatCard
          icon={Target}
          label="Avg Score"
          value={data.avgScore ? data.avgScore.toLocaleString() : "—"}
          subtext="final score"
          color="bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Completion Rate"
          value={data.totalRegistrations > 0
            ? `${Math.round((data.totalSubmissions / data.totalRegistrations) * 100)}%`
            : "—"}
          subtext={`${data.totalSubmissions}/${data.totalRegistrations}`}
          color="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
        />
      </div>
    </div>
  );
}
