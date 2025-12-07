import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, MessageSquare, ThumbsUp, Flag, Star, Edit2, Trophy, Activity } from "lucide-react";
import { format } from "date-fns";
import type { UserProfile, UserActivity } from "@shared/schema";

export default function Profile() {
  const { toast } = useToast();
  const [matchMe, paramsMe] = useRoute("/profile/me");
  const [, params] = useRoute("/profile/:userId");
  const userId = matchMe ? "me" : (params?.userId || "");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Handle "me" route - try to get from URL params or localStorage
  const resolvedUserId = userId === 'me' 
    ? (new URLSearchParams(window.location.search).get('discordId') 
        ? `discord:${new URLSearchParams(window.location.search).get('discordId')}`
        : new URLSearchParams(window.location.search).get('telegramId')
        ? `telegram:${new URLSearchParams(window.location.search).get('telegramId')}`
        : userId)
    : userId;

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile", resolvedUserId],
    enabled: !!resolvedUserId,
    queryFn: async () => {
      const url = resolvedUserId === 'me' 
        ? `/api/profile/me${new URLSearchParams(window.location.search).toString() ? '&' + new URLSearchParams(window.location.search).toString() : ''}`
        : `/api/profile/${resolvedUserId}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error('Profile not found');
      return await res.json();
    },
  });

  const { data: activities = [] } = useQuery<UserActivity[]>({
    queryKey: ["/api/profile", resolvedUserId, "activities"],
    enabled: !!resolvedUserId && !!profile,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/profile", resolvedUserId, "stats"],
    enabled: !!resolvedUserId && !!profile,
    queryFn: async () => {
      const url = resolvedUserId === 'me'
        ? `/api/profile/me/stats${new URLSearchParams(window.location.search).toString() ? '&' + new URLSearchParams(window.location.search).toString() : ''}`
        : `/api/profile/${resolvedUserId}/stats`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return null;
      return await res.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username?: string; bio?: string; isPublic?: boolean }) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      username: username || undefined,
      bio: bio || undefined,
      isPublic,
    });
  };

  const openEditDialog = () => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setIsPublic((profile as any).isPublic ?? profile.visibility === "public");
      setIsEditDialogOpen(true);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case "vote":
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case "report":
        return <Flag className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getReputationBadge = (score: number) => {
    if (score >= 1000) return { label: "Legend", variant: "default" as const };
    if (score >= 500) return { label: "Expert", variant: "default" as const };
    if (score >= 100) return { label: "Contributor", variant: "secondary" as const };
    return { label: "Newcomer", variant: "outline" as const };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div data-testid="text-loading">Loading profile...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-not-found">Profile Not Found</CardTitle>
              <CardDescription>This user profile doesn't exist or is private.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const reputationBadge = getReputationBadge(profile.reputationScore);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* User Info Card */}
              <Card data-testid="card-profile-info">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile
                    </CardTitle>
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={openEditDialog}
                          data-testid="button-edit-profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-edit-profile">
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                          <DialogDescription>
                            Update your profile information and privacy settings
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="username" data-testid="label-username">
                              Username
                            </Label>
                            <Input
                              id="username"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Your username"
                              data-testid="input-username"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bio" data-testid="label-bio">
                              Bio
                            </Label>
                            <Textarea
                              id="bio"
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Tell us about yourself..."
                              rows={4}
                              data-testid="textarea-bio"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="public" data-testid="label-public-profile">
                              Public Profile
                            </Label>
                            <Switch
                              id="public"
                              checked={isPublic}
                              onCheckedChange={setIsPublic}
                              data-testid="switch-public"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleUpdateProfile}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-profile"
                          >
                            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="w-20 h-20" data-testid="avatar-user">
                      <AvatarFallback className="text-2xl">
                        {profile.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold" data-testid="text-username">
                        {profile.username || "Anonymous"}
                      </h2>
                      <Badge variant={reputationBadge.variant} data-testid="badge-reputation">
                        <Trophy className="w-3 h-3 mr-1" />
                        {reputationBadge.label}
                      </Badge>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-muted-foreground text-center" data-testid="text-bio">
                      {profile.bio}
                    </p>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reputation</span>
                      <span className="font-semibold" data-testid="text-reputation-score">
                        {Number(profile.reputationScore)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Contributions</span>
                      <span className="font-semibold" data-testid="text-contribution-count">
                        {Number(profile.contributionCount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <Card data-testid="card-stats">
                <CardHeader>
                  <CardTitle className="text-base">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Comments</span>
                    </div>
                    <span className="font-semibold" data-testid="text-stat-comments">
                      {activities.filter((a) => a.activityType === "comment").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Votes</span>
                    </div>
                    <span className="font-semibold" data-testid="text-stat-votes">
                      {activities.filter((a) => a.activityType === "vote").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Reports</span>
                    </div>
                    <span className="font-semibold" data-testid="text-stat-reports">
                      {activities.filter((a) => a.activityType === "report").length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* PNL Stats Card */}
              {stats?.pnl && (
                <Card data-testid="card-pnl-stats">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      PnL Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total PnL</span>
                      <span className={`font-semibold ${stats.pnl.totalPnlSol >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.pnl.totalPnlSol >= 0 ? '+' : ''}{stats.pnl.totalPnlSol.toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ROI</span>
                      <span className={`font-semibold ${stats.pnl.roiPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.pnl.roiPct >= 0 ? '+' : ''}{stats.pnl.roiPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Win Rate</span>
                      <span className="font-semibold">{stats.pnl.winRatePct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Trades</span>
                      <span className="font-semibold">{stats.pnl.totalTrades}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Call Stats Card */}
              {stats?.calls && (
                <Card data-testid="card-call-stats">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Call Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Calls</span>
                      <span className="font-semibold">{stats.calls.totalCalls}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hits</span>
                      <span className="font-semibold text-green-500">{stats.calls.hits}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hit Rate</span>
                      <span className="font-semibold">{stats.calls.hitRate.toFixed(1)}%</span>
                    </div>
                    {stats.calls.bestGain && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Best Gain</span>
                        <span className="font-semibold text-green-500">+{stats.calls.bestGain.toFixed(1)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Activity Feed */}
            <div className="lg:col-span-2">
              <Card data-testid="card-activity-feed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Activity Feed
                  </CardTitle>
                  <CardDescription>Recent contributions and actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-activity">
                      No activity yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                          data-testid={`activity-${index}`}
                        >
                          <div className="mt-1">{getActivityIcon(activity.activityType)}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize" data-testid={`activity-type-${index}`}>
                                {activity.activityType}
                              </span>
                              <Badge variant="outline" data-testid={`activity-points-${index}`}>
                                +{Number(activity.points)} pts
                              </Badge>
                            </div>
                            {activity.targetToken && (
                              <p className="text-sm text-muted-foreground font-mono" data-testid={`activity-token-${index}`}>
                                Token: {activity.targetToken.slice(0, 8)}...
                              </p>
                            )}
                            {activity.createdAt && (
                              <p className="text-xs text-muted-foreground" data-testid={`activity-time-${index}`}>
                                {format(new Date(activity.createdAt), "PPp")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
