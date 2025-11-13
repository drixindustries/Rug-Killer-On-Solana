import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, XCircle, Flag } from "lucide-react";
import { format } from "date-fns";
import type { TokenReport, TokenComment } from "@shared/schema";

export default function Moderation() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<TokenReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Check if user is admin
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const { data: pendingReports = [], isLoading: loadingReports } = useQuery<TokenReport[]>({
    queryKey: ["/api/reports/pending"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: flaggedComments = [], isLoading: loadingComments } = useQuery<TokenComment[]>({
    queryKey: ["/api/comments/flagged"],
    enabled: adminCheck?.isAdmin === true,
  });

  const reviewReportMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; reviewNotes?: string }) => {
      const response = await apiRequest("PUT", `/api/reports/${data.id}/review`, {
        status: data.status,
        reviewNotes: data.reviewNotes,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports/pending"] });
      toast({
        title: "Success",
        description: "Report reviewed successfully",
      });
      setIsReviewDialogOpen(false);
      setSelectedReport(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to review report",
        variant: "destructive",
      });
    },
  });

  const openReviewDialog = (report: TokenReport) => {
    setSelectedReport(report);
    setReviewNotes("");
    setIsReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedReport) {
      reviewReportMutation.mutate({
        id: selectedReport.id,
        status: "approved",
        reviewNotes: reviewNotes || undefined,
      });
    }
  };

  const handleDismiss = () => {
    if (selectedReport) {
      reviewReportMutation.mutate({
        id: selectedReport.id,
        status: "dismissed",
        reviewNotes: reviewNotes || undefined,
      });
    }
  };

  const getSeverityBadge = (severity: number | null | undefined) => {
    const s = severity ?? 0;
    if (s >= 4) return { label: "Critical", variant: "destructive" as const };
    if (s >= 3) return { label: "High", variant: "default" as const };
    if (s >= 2) return { label: "Medium", variant: "secondary" as const };
    return { label: "Low", variant: "outline" as const };
  };

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-access-denied">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access this page. Admin access required.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                Moderation
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mt-2">
                Review reports and manage flagged content
              </p>
            </div>

            {/* Moderation Tabs */}
            <Tabs defaultValue="reports" className="space-y-6">
              <TabsList data-testid="tabs-moderation">
                <TabsTrigger value="reports" data-testid="tab-reports">
                  Pending Reports ({pendingReports.length})
                </TabsTrigger>
                <TabsTrigger value="comments" data-testid="tab-comments">
                  Flagged Comments ({flaggedComments.length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Reports Tab */}
              <TabsContent value="reports">
                <Card data-testid="card-pending-reports">
                  <CardHeader>
                    <CardTitle>Pending Reports</CardTitle>
                    <CardDescription>
                      Token reports awaiting moderation review
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingReports ? (
                      <div className="text-center py-12" data-testid="text-loading-reports">
                        Loading reports...
                      </div>
                    ) : pendingReports.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-reports">
                        No pending reports
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Token</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingReports.map((report, index) => {
                            const severityBadge = getSeverityBadge(report.severityScore ?? 0);

                            return (
                              <TableRow key={report.id} data-testid={`report-${index}`}>
                                <TableCell className="font-mono text-sm" data-testid={`report-token-${index}`}>
                                  {report.tokenAddress.slice(0, 8)}...
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" data-testid={`report-type-${index}`}>
                                    {report.reportType}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={severityBadge.variant} data-testid={`report-severity-${index}`}>
                                    {severityBadge.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground" data-testid={`report-time-${index}`}>
                                  {report.createdAt && format(new Date(report.createdAt), "PPp")}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openReviewDialog(report)}
                                    data-testid={`button-review-${index}`}
                                  >
                                    Review
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flagged Comments Tab */}
              <TabsContent value="comments">
                <Card data-testid="card-flagged-comments">
                  <CardHeader>
                    <CardTitle>Flagged Comments</CardTitle>
                    <CardDescription>
                      Comments flagged by community members
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingComments ? (
                      <div className="text-center py-12" data-testid="text-loading-comments">
                        Loading comments...
                      </div>
                    ) : flaggedComments.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-comments">
                        No flagged comments
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {flaggedComments.map((comment, index) => (
                          <div
                            key={comment.id}
                            className="p-4 border rounded-lg space-y-2"
                            data-testid={`comment-${index}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm" data-testid={`comment-content-${index}`}>
                                  {comment.commentText}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <span data-testid={`comment-token-${index}`}>
                                    Token: {comment.tokenAddress.slice(0, 8)}...
                                  </span>
                                  {comment.createdAt && (
                                    <span data-testid={`comment-time-${index}`}>
                                      • {format(new Date(comment.createdAt), "PP")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="destructive" className="ml-4" data-testid={`comment-flag-${index}`}>
                                <Flag className="w-3 h-3 mr-1" />
                                Flagged
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <Button size="sm" variant="outline" data-testid={`button-comment-approve-${index}`}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" data-testid={`button-comment-delete-${index}`}>
                                <XCircle className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent data-testid="dialog-review-report">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Review this token report and take action
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-semibold">Token:</span>
                  <span className="ml-2 font-mono" data-testid="dialog-report-token">
                    {selectedReport.tokenAddress}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Type:</span>
                  <Badge variant="outline" className="ml-2" data-testid="dialog-report-type">
                    {selectedReport.reportType}
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Severity:</span>
                  <Badge
                    variant={getSeverityBadge(selectedReport.severityScore ?? 0).variant}
                    className="ml-2"
                    data-testid="dialog-report-severity"
                  >
                    {getSeverityBadge(selectedReport.severityScore ?? 0).label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-sm">Evidence:</div>
                <div className="p-3 bg-muted rounded-md text-sm" data-testid="dialog-report-evidence">
                  {selectedReport.evidence}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="review-notes" className="text-sm font-semibold">
                  Review Notes (Optional)
                </label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={reviewReportMutation.isPending}
              data-testid="button-dismiss-report"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <Button
              onClick={handleApprove}
              disabled={reviewReportMutation.isPending}
              data-testid="button-approve-report"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {reviewReportMutation.isPending ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
