# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Solana Rug Killer seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please Do:

1. **Email us directly** at security@yourwebsite.com with:
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

2. **Allow us time to respond** - We aim to respond within 48 hours and will keep you informed of our progress

3. **Give us reasonable time to fix** - We will work to patch critical vulnerabilities as quickly as possible

## What to Expect

1. **Acknowledgment** - We will acknowledge receipt of your vulnerability report within 48 hours
2. **Communication** - We will keep you informed about our progress addressing the vulnerability
3. **Credit** - If you wish, we will credit you in our security advisory when we disclose the vulnerability
4. **Fix Timeline** - We aim to patch critical vulnerabilities within 7 days and other vulnerabilities within 30 days

## Security Best Practices

When deploying Solana Rug Killer, follow these security best practices:

### Environment Variables
- Never commit `.env` files to version control
- Use strong, random values for `SESSION_SECRET`
- Rotate API keys regularly
- Use separate keys for development and production

### Database Security
- Use SSL/TLS connections to your PostgreSQL database
- Implement regular database backups
- Use strong passwords for database users
- Limit database user permissions to only what's necessary

### API Security
- Enable rate limiting in production
- Use HTTPS in production (enforced by Replit Deployments)
- Implement proper CORS policies
- Validate all user input

### Wallet Security
- Never log or expose private keys
- Store the `CREATOR_WALLET_PRIVATE_KEY` as a Replit secret
- Use hardware wallets for production creator wallets
- Implement multi-signature wallets for high-value operations

### Bot Security
- Keep bot tokens secret and rotate them if exposed
- Limit bot permissions to only what's necessary
- Implement rate limiting for bot commands
- Monitor bot usage for abuse

### Subscription Security
- Validate all Whop webhooks using signature verification
- Implement idempotency for payment processing
- Use atomic database transactions for subscription changes
- Log all subscription modifications for audit trails

## Known Security Considerations

### Smart Contract Interactions
This application reads from the Solana blockchain but does not execute transactions on behalf of users (except for the creator wallet). Users are responsible for:
- Verifying transaction details before signing
- Securing their own private keys
- Understanding the risks of connecting wallets to web applications

### Third-Party APIs
This application integrates with third-party APIs:
- Rugcheck.xyz
- GoPlus Security
- DexScreener
- Jupiter

Users should be aware that:
- We cannot guarantee the security of these external services
- API responses are validated but should not be the sole basis for investment decisions
- Rate limiting may affect service availability

### AI Blacklist System
The AI-powered blacklist system is automated and may produce false positives. Users should:
- Verify blacklist flags independently
- Not rely solely on automated detection
- Report false positives for investigation

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we appreciate and acknowledge security researchers who help us maintain the security of Solana Rug Killer. If you report a valid security vulnerability, we will:

- Publicly acknowledge your contribution (if you wish)
- Provide a detailed write-up of the fix
- Consider offering $RUGK tokens as a thank you (amount at our discretion)

## Security Updates

Security updates will be:
- Released as soon as possible after a vulnerability is confirmed
- Announced in our GitHub releases
- Communicated to users via Discord/Telegram announcements
- Documented in our changelog

## Contact

For security concerns, contact:
- **Email**: security@yourwebsite.com
- **PGP Key**: [Available on request]
- **Response Time**: Within 48 hours

For general support:
- **GitHub Issues**: For non-security bugs and features
- **Discord**: For community support
- **Email**: support@yourwebsite.com

Thank you for helping keep Solana Rug Killer and our users safe!
