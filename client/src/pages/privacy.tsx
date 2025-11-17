import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold" data-testid="heading-privacy">Privacy Policy</h1>
              <p className="text-muted-foreground">Last Updated: November 11, 2025</p>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                At Rug Killer Alpha Bot, we take your privacy seriously. This Privacy Policy explains how 
                we collect, use, disclose, and safeguard your information.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h3 className="font-semibold text-foreground">1.1 Personal Information</h3>
                <p>When you use Rug Killer Alpha Bot, we may collect:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Wallet address (via Phantom Wallet signature)</li>
                  <li><strong>Authentication Data:</strong> OAuth tokens from Google, GitHub, X (Twitter), or Apple</li>
                  <li><strong>Wallet Addresses:</strong> Solana wallet addresses you connect for token-gated access</li>
                  <li><strong>Payment Information:</strong> Processed securely by Whop (we don't store card details)</li>
                  <li><strong>Cryptocurrency Transactions:</strong> On-chain payment records (publicly visible on Solana blockchain)</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-6">1.2 Usage Data</h3>
                <p>We automatically collect information about your use of the Service:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Token Analysis History:</strong> Tokens you've analyzed and search queries</li>
                  <li><strong>Bot Interactions:</strong> Commands you use on Telegram and Discord bots</li>
                  <li><strong>Subscription Data:</strong> Current tier, status, and subscription history</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
                  <li><strong>Log Data:</strong> Access times, pages viewed, errors encountered</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-6">1.3 Blockchain Data</h3>
                <p>We collect publicly available blockchain data including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Token metadata, supply, and authority information</li>
                  <li>Holder distributions and wallet balances</li>
                  <li>Transaction histories and trading patterns</li>
                  <li>Liquidity pool data and market information</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Provide the Service:</strong> Token analysis, risk scoring, bot commands, alerts</li>
                  <li><strong>Process Payments:</strong> Manage subscriptions and verify token holdings</li>
                  <li><strong>Authenticate Users:</strong> Secure login and access control</li>
                  <li><strong>Improve the Service:</strong> Analyze usage patterns and fix bugs</li>
                  <li><strong>Send Notifications:</strong> Alpha alerts, subscription updates, security notices</li>
                  <li><strong>Prevent Fraud:</strong> Detect abuse, spam, and unauthorized access</li>
                  <li><strong>Comply with Legal Obligations:</strong> Respond to lawful requests and enforce our Terms</li>
                  <li><strong>Communicate with You:</strong> Customer support and important updates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. How We Share Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We may share your information with:</p>
                
                <h3 className="font-semibold text-foreground mt-4">3.1 Third-Party Service Providers</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Phantom Wallet:</strong> Wallet-based authentication and signature verification</li>
                  <li><strong>Whop:</strong> Subscription payment processing</li>
                  <li><strong>Telegram/Discord:</strong> Bot functionality and message delivery</li>
                  <li><strong>Rugcheck, GoPlus, DexScreener, Jupiter:</strong> Token analysis data</li>
                  <li><strong>RPC Providers (Helius, QuickNode, Alchemy):</strong> Blockchain data access</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">3.2 Legal Requirements</h3>
                <p>We may disclose your information if required by law or in response to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Subpoenas, court orders, or legal processes</li>
                  <li>Requests from law enforcement or government agencies</li>
                  <li>Protection of our rights, property, or safety</li>
                  <li>Prevention of fraud, security issues, or technical problems</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">3.3 Business Transfers</h3>
                <p>
                  In the event of a merger, acquisition, or sale of assets, your information may be 
                  transferred to the acquiring entity.
                </p>

                <h3 className="font-semibold text-foreground mt-4">3.4 With Your Consent</h3>
                <p>
                  We may share information with third parties when you explicitly consent to such sharing.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We retain your information for as long as necessary to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide the Service and maintain your account</li>
                  <li>Comply with legal obligations (typically 7 years for financial records)</li>
                  <li>Resolve disputes and enforce our Terms of Service</li>
                  <li>Prevent fraud and abuse</li>
                </ul>
                <p>
                  When you delete your account, we will delete or anonymize your personal information 
                  within 30 days, except where retention is required by law.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We implement security measures to protect your information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Encryption:</strong> HTTPS/TLS for data transmission, encrypted database storage</li>
                  <li><strong>Access Controls:</strong> Role-based permissions and admin-only features</li>
                  <li><strong>Secure Sessions:</strong> HTTP-only cookies with session expiration</li>
                  <li><strong>Environment Variables:</strong> API keys and secrets stored securely in environment configuration</li>
                  <li><strong>Regular Audits:</strong> Security reviews and dependency updates</li>
                  <li><strong>Rate Limiting:</strong> Protection against brute force and DDoS attacks</li>
                </ul>
                <p>
                  However, no method of transmission over the Internet is 100% secure. We cannot 
                  guarantee absolute security of your information.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Cookies and Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We use cookies and similar tracking technologies:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Session Cookies:</strong> Maintain your logged-in state (essential)</li>
                  <li><strong>Analytics:</strong> Understand how users interact with the Service</li>
                  <li><strong>Preferences:</strong> Remember your settings and preferences</li>
                </ul>
                <p>
                  You can control cookies through your browser settings, but disabling essential cookies 
                  may affect Service functionality.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Your Privacy Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>Depending on your location, you may have the following rights:</p>
                
                <h3 className="font-semibold text-foreground mt-4">7.1 Access and Portability</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Request a copy of your personal information</li>
                  <li>Export your data in a machine-readable format</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">7.2 Correction and Deletion</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Update or correct inaccurate information</li>
                  <li>Delete your account and associated data</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">7.3 Objection and Restriction</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Object to processing of your information</li>
                  <li>Restrict how we use your data</li>
                  <li>Opt-out of marketing communications</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">7.4 How to Exercise Your Rights</h3>
                <p>
                  To exercise any of these rights, contact us at privacy@yourwebsite.com. We will respond 
                  within 30 days.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Rug Killer Alpha Bot is not intended for users under 18 years of age. We do not knowingly 
                  collect personal information from children under 18.
                </p>
                <p>
                  If you are a parent or guardian and believe your child has provided us with personal 
                  information, please contact us immediately. We will delete such information promptly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. International Data Transfers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Your information may be transferred to and processed in countries other than your country 
                  of residence. These countries may have different data protection laws.
                </p>
                <p>
                  By using the Service, you consent to the transfer of your information to the United States 
                  and other countries where we or our service providers operate.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Third-Party Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Our Service may contain links to third-party websites and services (DexScreener, BubbleMaps, 
                  Solscan, etc.). We are not responsible for the privacy practices of these third parties.
                </p>
                <p>
                  We encourage you to read the privacy policies of any third-party services you use.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. California Privacy Rights (CCPA)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>If you are a California resident, you have additional rights under the CCPA:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Right to know what personal information is collected, used, and shared</li>
                  <li>Right to delete personal information (with certain exceptions)</li>
                  <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
                  <li>Right to non-discrimination for exercising your privacy rights</li>
                </ul>
                <p>
                  To exercise these rights, contact us at privacy@yourwebsite.com with "CCPA Request" in 
                  the subject line.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>12. European Privacy Rights (GDPR)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>If you are in the European Economic Area (EEA), you have rights under the GDPR:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Right of access to your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                  <li>Right to withdraw consent</li>
                  <li>Right to lodge a complaint with a supervisory authority</li>
                </ul>
                <p>
                  We process your data based on: (1) your consent, (2) contractual necessity, (3) legal 
                  obligations, or (4) legitimate interests.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>13. Do Not Track Signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We do not currently respond to "Do Not Track" (DNT) browser signals. We treat all users 
                  the same regardless of DNT settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>14. Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of material 
                  changes by:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Posting the new Privacy Policy on this page</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending an email notification (for significant changes)</li>
                  <li>Displaying a prominent notice on the Service</li>
                </ul>
                <p>
                  Your continued use of the Service after changes become effective constitutes acceptance 
                  of the revised Privacy Policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>15. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have questions or concerns about this Privacy Policy or our data practices, 
                  please contact us:
                </p>
                <ul className="space-y-2">
                  <li><strong>Email:</strong> privacy@yourwebsite.com</li>
                  <li><strong>Legal Inquiries:</strong> legal@yourwebsite.com</li>
                  <li><strong>Discord:</strong> Join our community server</li>
                  <li><strong>Telegram:</strong> Contact via our bot</li>
                  <li><strong>GitHub:</strong> https://github.com/drixindustries/Rug-Killer-On-Solana/issues</li>
                </ul>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                By using Rug Killer Alpha Bot, you acknowledge that you have read and understood this Privacy 
                Policy and consent to the collection, use, and disclosure of your information as described.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
