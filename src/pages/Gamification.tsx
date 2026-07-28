import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserPointsSummary } from "@/components/gamification/UserPointsSummary";
import { GamificationLeaderboard } from "@/components/gamification/GamificationLeaderboard";
import { PointsHistory } from "@/components/gamification/PointsHistory";
import { LevelsProgress } from "@/components/gamification/LevelsProgress";
import { Gamepad2 } from "lucide-react";

export default function Gamification() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Gamepad2}
          title="Gamificação"
          description="Acompanhe seu engajamento e conquiste recompensas"
        />

        {/* User Summary */}
        <UserPointsSummary />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Leaderboard - Takes 2 columns */}
          <div className="lg:col-span-2">
            <GamificationLeaderboard />
          </div>

          {/* Points History */}
          <div>
            <PointsHistory />
          </div>
        </div>

        {/* Levels Progress */}
        <LevelsProgress />
      </div>
    </AppLayout>
  );
}
