import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold" data-testid="heading-terms">Terms of Service</h1>
              <p className="text-muted-foreground">Last Updated: November 11, 2025</p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please read these Terms of Service carefully before using Solana Rug Killer. 
                By accessing or using our service, you agree to be bound by these terms.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  By accessing and using Solana Rug Killer ("Service", "we", "us", or "our"), you accept 
                  and agree to be bound by the terms and provision of this agreement. If you do not agree 
                  to these Terms of Service, please do not use our Service.
                </p>
                <p>
                  We reserve the right to modify these terms at any time. Continued use of the Service 
                  following any changes shall constitute your consent to such changes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Description of Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Solana Rug Killer is a token analysis platform that provides information and risk 
                  assessments for Solana SPL tokens. Our Service aggregates data from multiple sources 
                  including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Rugcheck.xyz - Community-driven risk scores</li>
                  <li>GoPlus Security - Honeypot detection and security scanning</li>
                  <li>DexScreener - Market data and trading information</li>
                  <li>Jupiter Aggregator - Price verification and liquidity data</li>
                  <li>Solana blockchain - On-chain token analysis</li>
                </ul>
                <p>
                  The Service includes web application access, Telegram bot, Discord bot, AI-powered 
                  blacklist, and alpha alert features.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. NOT FINANCIAL ADVICE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <div className="bg-destructive/10 border border-destructive p-4 rounded-md">
                  <p className="font-semibold text-destructive">IMPORTANT DISCLAIMER:</p>
                  <p className="mt-2">
                    Solana Rug Killer provides informational analysis only. Our Service is NOT financial 
                    advice, investment advice, trading advice, or a recommendation to buy, sell, or hold 
                    any cryptocurrency or token.
                  </p>
                </div>
                <p>
                  You acknowledge and agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All investment decisions are made at your own risk</li>
                  <li>You are solely responsible for your own investment research and decisions</li>
                  <li>We do not guarantee the accuracy, completeness, or timeliness of any information</li>
                  <li>Past performance is not indicative of future results</li>
                  <li>Cryptocurrency trading involves substantial risk of loss</li>
                  <li>You should consult with a qualified financial advisor before making investment decisions</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Risk Score Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our risk scoring system (0-100) is an automated analysis based on publicly available 
                  blockchain data and third-party API responses. You acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Risk scores are estimates and may contain errors or inaccuracies</li>
                  <li>A low risk score does not guarantee a token is safe</li>
                  <li>A high risk score does not mean a token is definitively a scam</li>
                  <li>Scammers may manipulate on-chain data to appear legitimate</li>
                  <li>New attack vectors and scam techniques are constantly evolving</li>
                  <li>Third-party data sources may be unavailable, outdated, or incorrect</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. AI Blacklist and Detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our AI-powered blacklist system uses automated rules to detect suspicious wallets and 
                  potential scams. You acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Automated detection may produce false positives or false negatives</li>
                  <li>Wallets may be incorrectly flagged as malicious</li>
                  <li>Malicious wallets may not be detected by our system</li>
                  <li>The blacklist is not comprehensive and should not be your only due diligence</li>
                  <li>We are not responsible for any losses resulting from blacklist information</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Alpha Alerts and Smart Money Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our alpha alert system monitors wallet activity and new token launches. You understand that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Alerts are informational only and not trading recommendations</li>
                  <li>Following "smart money" wallets does not guarantee profits</li>
                  <li>Tracked wallets may engage in manipulative or illegal activity</li>
                  <li>New token launches may be scams or rug pulls</li>
                  <li>By the time you receive an alert, market conditions may have changed</li>
                  <li>We do not endorse or verify any tokens mentioned in alerts</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Subscription and Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our Service offers multiple subscription tiers (Individual, Group, Lifetime) processed 
                  through Whop and cryptocurrency payments. You agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Free trial access is limited to 7 days with no credit card required</li>
                  <li>Paid subscriptions renew automatically unless cancelled</li>
                  <li>Cryptocurrency payments are non-refundable once confirmed on-chain</li>
                  <li>We reserve the right to modify pricing with 30 days notice</li>
                  <li>Token-gated access (10M+ $ANTIRUG) requires maintaining the minimum balance</li>
                  <li>Subscription codes are single-use unless otherwise specified</li>
                  <li>All sales are final unless otherwise required by law</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. User Conduct</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for any illegal or unauthorized purpose</li>
                  <li>Attempt to gain unauthorized access to our systems or data</li>
                  <li>Abuse, harass, or threaten other users or our staff</li>
                  <li>Spam bot commands or abuse rate limits</li>
                  <li>Share subscription credentials or access codes publicly</li>
                  <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                  <li>Use automated tools to scrape or download our data</li>
                  <li>Resell or redistribute our Service without permission</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our Service integrates with third-party APIs and services (Rugcheck, GoPlus, DexScreener, 
                  Jupiter, Replit Auth, Whop, Telegram, Discord). You acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We are not responsible for the availability or accuracy of third-party services</li>
                  <li>Third-party services have their own terms of service and privacy policies</li>
                  <li>We may discontinue integration with third-party services at any time</li>
                  <li>Service disruptions may occur due to third-party API limitations or outages</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The Service and its original content, features, and functionality are owned by Solana 
                  Rug Killer and are protected by international copyright, trademark, patent, trade secret, 
                  and other intellectual property laws.
                </p>
                <p>
                  Our open-source code is licensed under the MIT License. Commercial use requires compliance 
                  with the license terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <div className="bg-destructive/10 border border-destructive p-4 rounded-md">
                  <p className="font-semibold text-destructive">MAXIMUM LIABILITY:</p>
                  <p className="mt-2">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOLANA RUG KILLER SHALL NOT BE LIABLE FOR ANY 
                    INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
                    PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, 
                    USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
                  </p>
                </div>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use or inability to use the Service</li>
                  <li>Any conduct or content of any third party on the Service</li>
                  <li>Unauthorized access, use, or alteration of your data</li>
                  <li>Investment losses resulting from information provided by the Service</li>
                  <li>Rug pulls, scams, or fraudulent tokens you interact with</li>
                  <li>Errors, inaccuracies, or omissions in our analysis or data</li>
                </ul>
                <p>
                  Our total liability shall not exceed the amount you paid for the Service in the past 12 months.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>12. Warranty Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY 
                  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
                  FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </p>
                <p>
                  We do not warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                  <li>The information provided will be accurate, reliable, or correct</li>
                  <li>Any defects or errors will be corrected</li>
                  <li>The Service will meet your specific requirements</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>13. Indemnification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  You agree to indemnify, defend, and hold harmless Solana Rug Killer, its officers, 
                  directors, employees, contractors, and agents from any claims, liabilities, damages, 
                  losses, costs, or expenses (including reasonable attorneys' fees) arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use or misuse of the Service</li>
                  <li>Your violation of these Terms of Service</li>
                  <li>Your violation of any rights of another party</li>
                  <li>Your violation of any applicable laws or regulations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>14. Termination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We reserve the right to terminate or suspend your account and access to the Service 
                  immediately, without prior notice or liability, for any reason, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Breach of these Terms of Service</li>
                  <li>Fraudulent, abusive, or illegal activity</li>
                  <li>Extended non-payment of subscription fees</li>
                  <li>Request by law enforcement or government agency</li>
                </ul>
                <p>
                  Upon termination, your right to use the Service will cease immediately.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>15. Governing Law</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the 
                  jurisdiction in which Solana Rug Killer operates, without regard to its conflict 
                  of law provisions.
                </p>
                <p>
                  Any disputes arising from these Terms or the Service shall be resolved through binding 
                  arbitration in accordance with the rules of the American Arbitration Association.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>16. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We reserve the right to modify or replace these Terms at any time. If a revision is 
                  material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p>
                  Continued use of the Service after changes become effective constitutes acceptance of 
                  the revised Terms.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>17. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <ul className="space-y-2">
                  <li><strong>Email:</strong> legal@yourwebsite.com</li>
                  <li><strong>Discord:</strong> Join our community server</li>
                  <li><strong>Telegram:</strong> Contact via our bot</li>
                  <li><strong>GitHub:</strong> https://github.com/drixindustries/Rug-Killer-On-Solana</li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                By using Solana Rug Killer, you acknowledge that you have read, understood, and agree to 
                be bound by these Terms of Service. If you do not agree, please discontinue use of the 
                Service immediately.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
