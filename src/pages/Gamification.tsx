import { AppLayout } from "@/components/layout/AppLayout";
import { UserPointsSummary } from "@/components/gamification/UserPointsSummary";
import { GamificationLeaderboard } from "@/components/gamification/GamificationLeaderboard";
import { PointsHistory } from "@/components/gamification/PointsHistory";
import { LevelsProgress } from "@/components/gamification/LevelsProgress";
import { Gamepad2 } from "lucide-react";

export default function Gamification() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-primary" />
            Gamificação
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu engajamento e conquiste recompensas
          </p>
        </div>

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
