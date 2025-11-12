import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, Award, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { UserProfile } from "@shared/schema";

export default function Leaderboard() {
  const [, navigate] = useLocation();
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard?limit=${limit}`);
      return await response.json();
    },
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getReputationBadge = (score: number) => {
    if (score >= 1000) return { label: "Legend", variant: "default" as const };
    if (score >= 500) return { label: "Expert", variant: "default" as const };
    if (score >= 100) return { label: "Contributor", variant: "secondary" as const };
    return { label: "Newcomer", variant: "outline" as const };
  };

  const paginatedUsers = users.slice((page - 1) * 25, page * 25);
  const totalPages = Math.ceil(users.length / 25);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  Leaderboard
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-2">
                  Top contributors in the community
                </p>
              </div>

              <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
                <SelectTrigger className="w-[180px]" data-testid="select-time-period">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week" data-testid="option-week">This Week</SelectItem>
                  <SelectItem value="month" data-testid="option-month">This Month</SelectItem>
                  <SelectItem value="all" data-testid="option-all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Leaderboard Table */}
            <Card data-testid="card-leaderboard">
              <CardHeader>
                <CardTitle>Top 50 Users</CardTitle>
                <CardDescription>
                  Ranked by reputation score and contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12" data-testid="text-loading">
                    Loading leaderboard...
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground" data-testid="text-no-users">
                    No users yet
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Rank</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Reputation</TableHead>
                          <TableHead className="text-right">Contributions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((user, index) => {
                          const rank = (page - 1) * 25 + index + 1;
                          const badge = getReputationBadge(user.reputationScore);

                          return (
                            <TableRow
                              key={user.userId}
                              className="cursor-pointer hover-elevate"
                              onClick={() => navigate(`/profile/${user.userId}`)}
                              data-testid={`row-user-${index}`}
                            >
                              <TableCell className="font-medium" data-testid={`rank-${index}`}>
                                <div className="flex items-center gap-2">
                                  {getRankIcon(rank)}
                                  <span>#{rank}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8" data-testid={`avatar-${index}`}>
                                    <AvatarFallback>
                                      {user.username?.charAt(0).toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium" data-testid={`username-${index}`}>
                                    {user.username || "Anonymous"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={badge.variant} data-testid={`badge-${index}`}>
                                  {badge.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold" data-testid={`reputation-${index}`}>
                                {Number(user.reputationScore)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground" data-testid={`contributions-${index}`}>
                                {Number(user.contributionCount)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-muted-foreground" data-testid="text-page-info">
                          Page {page} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            data-testid="button-prev-page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            data-testid="button-next-page"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
