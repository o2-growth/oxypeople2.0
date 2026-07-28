import { AppLayout } from "@/components/layout/AppLayout";
import { RecognitionCard } from "@/components/recognition/RecognitionCard";
import { SendRecognition } from "@/components/recognition/SendRecognition";
import { Leaderboard } from "@/components/recognition/Leaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Send, Inbox, Award } from "lucide-react";
import { useRecognitions } from "@/hooks/useRecognitions";
import { Skeleton } from "@/components/ui/skeleton";

function RecognitionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

export default function Recognition() {
  const { recognitions, received, sent, isLoading, isLoadingReceived, isLoadingSent } =
    useRecognitions();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reconhecimentos</h1>
          <p className="text-muted-foreground mt-1">
            Celebre as conquistas e reconheça seus colegas
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Feed de Reconhecimentos */}
          <div className="lg:col-span-2 space-y-6">
            <SendRecognition />

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="received" className="gap-2">
                  <Inbox className="h-4 w-4" />
                  Recebidos
                </TabsTrigger>
                <TabsTrigger value="sent" className="gap-2">
                  <Send className="h-4 w-4" />
                  Enviados
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6 space-y-4">
                {isLoading ? (
                  <RecognitionSkeleton />
                ) : recognitions.length > 0 ? (
                  recognitions.map((recognition) => (
                    <RecognitionCard
                      key={recognition.id}
                      id={recognition.id}
                      fromUser={recognition.from_user}
                      toUser={recognition.to_user}
                      message={recognition.message}
                      badge={recognition.badge}
                      points={recognition.points}
                      createdAt={recognition.created_at}
                    />
                  ))
                ) : (
                  <EmptyState message="Nenhum reconhecimento ainda. Seja o primeiro a reconhecer um colega!" />
                )}
              </TabsContent>

              <TabsContent value="received" className="mt-6 space-y-4">
                {isLoadingReceived ? (
                  <RecognitionSkeleton />
                ) : received.length > 0 ? (
                  received.map((recognition) => (
                    <RecognitionCard
                      key={recognition.id}
                      id={recognition.id}
                      fromUser={recognition.from_user}
                      toUser={recognition.to_user}
                      message={recognition.message}
                      badge={recognition.badge}
                      points={recognition.points}
                      createdAt={recognition.created_at}
                    />
                  ))
                ) : (
                  <EmptyState message="Você ainda não recebeu nenhum reconhecimento." />
                )}
              </TabsContent>

              <TabsContent value="sent" className="mt-6 space-y-4">
                {isLoadingSent ? (
                  <RecognitionSkeleton />
                ) : sent.length > 0 ? (
                  sent.map((recognition) => (
                    <RecognitionCard
                      key={recognition.id}
                      id={recognition.id}
                      fromUser={recognition.from_user}
                      toUser={recognition.to_user}
                      message={recognition.message}
                      badge={recognition.badge}
                      points={recognition.points}
                      createdAt={recognition.created_at}
                    />
                  ))
                ) : (
                  <EmptyState message="Você ainda não enviou nenhum reconhecimento." />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Leaderboard />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
