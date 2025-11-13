# API Documentation

This document describes the REST API endpoints available in Solana Rug Killer.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication via session cookies. Users must be logged in through Replit Auth.

### Login
```http
GET /api/login
```

Redirects to Replit Auth login page.

### Logout
```http
GET /api/logout
```

Logs out the current user and clears session.

### Get Current User
```http
GET /api/user
```

Returns the currently authenticated user.

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "replitUserId": "replit-user-id",
  "subscriptionTier": "individual",
  "subscriptionStatus": "active"
}
```

## Token Analysis

### Analyze Token
```http
POST /api/analyze
```

Performs comprehensive analysis of a Solana token.

**Request Body:**
```json
{
  "tokenAddress": "2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt"
}
```

**Response:**
```json
{
  "tokenAddress": "2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt",
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "analyzedAt": 1699564800000,
  "metadata": {
    "name": "Solana Rug Killer",
    "symbol": "RUGK",
    "decimals": 9,
    "supply": 1000000000
  },
  "mintAuthority": {
    "hasAuthority": false,
    "isRevoked": true
  },
  "freezeAuthority": {
    "hasAuthority": false,
    "isRevoked": true
  },
  "topHolders": [...],
  "liquidityPool": {...},
  "rugcheckData": {...},
  "goplusData": {...},
  "dexscreenerData": {...}
}
```

## Subscription Management

### Get Subscription Status
```http
GET /api/subscription/status
```

Returns the current user's subscription status.

**Response:**
```json
{
  "tier": "individual",
  "status": "active",
  "validUntil": "2024-12-31T23:59:59Z",
  "features": ["unlimited_scans", "bot_access"]
}
```

### Create Checkout Session
```http
POST /api/subscription/checkout
```

Creates a Stripe checkout session for subscription.

**Request Body:**
```json
{
  "tier": "individual"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_123456",
  "url": "https://checkout.stripe.com/..."
}
```

## Wallet Connections

### Connect Wallet
```http
POST /api/wallet/connect
```

Connects a Solana wallet to the user's account.

**Request Body:**
```json
{
  "walletAddress": "AbCd1234EfGh5678...",
  "signature": "base58-encoded-signature",
  "message": "message-that-was-signed"
}
```

**Response:**
```json
{
  "success": true,
  "walletAddress": "AbCd1234EfGh5678...",
  "tokenBalance": 15000000,
  "isEligible": true
}
```

### Get Wallet Status
```http
GET /api/wallet/status
```

Returns the status of connected wallet.

**Response:**
```json
{
  "connected": true,
  "walletAddress": "AbCd1234EfGh5678...",
  "tokenBalance": 15000000,
  "isEligible": true,
  "lastChecked": 1699564800000
}
```

## Blacklist

### Get Blacklisted Wallets
```http
GET /api/blacklist
```

Returns list of blacklisted wallets.

**Query Parameters:**
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `severity` - Filter by severity (min value)

**Response:**
```json
{
  "wallets": [
    {
      "walletAddress": "BadActor123...",
      "labelType": "honeypot_creator",
      "severity": 90,
      "evidence": "Created token with 99% sell tax",
      "source": "rules_engine",
      "createdAt": 1699564800000
    }
  ],
  "total": 1234,
  "hasMore": true
}
```

### Check Wallet
```http
GET /api/blacklist/:walletAddress
```

Checks if a specific wallet is blacklisted.

**Response:**
```json
{
  "isBlacklisted": true,
  "flags": [
    {
      "labelType": "honeypot_creator",
      "severity": 90,
      "evidence": "Created token with 99% sell tax",
      "createdAt": 1699564800000
    }
  ]
}
```

## Subscription Codes

### Redeem Code
```http
POST /api/codes/redeem
```

Redeems a subscription code for lifetime access.

**Request Body:**
```json
{
  "code": "LIFETIME-ABC-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code redeemed successfully",
  "tier": "lifetime",
  "expiresAt": null
}
```

## Bot Management

### Get Bot Invite Links
```http
GET /api/bot/invite-links
```

Returns invite links for Telegram and Discord bots.

**Response:**
```json
{
  "telegram": "https://t.me/YourBot",
  "discord": "https://discord.com/api/oauth2/authorize?..."
}
```

## Admin Endpoints

All admin endpoints require the user's email to be in the `ADMIN_EMAILS` environment variable.

### Check Admin Status
```http
GET /api/admin/check
```

**Response:**
```json
{
  "isAdmin": true
}
```

### Generate Subscription Code
```http
POST /api/admin/codes/generate
```

**Request Body:**
```json
{
  "tier": "lifetime",
  "maxUses": 1,
  "expiresAt": "2024-12-31T23:59:59Z",
  "description": "Giveaway winner"
}
```

**Response:**
```json
{
  "code": "LIFETIME-XYZ-789",
  "tier": "lifetime",
  "maxUses": 1,
  "currentUses": 0,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Creator Wallet Balance
```http
GET /api/admin/wallet/balance
```

Returns the balance of the creator wallet.

**Response:**
```json
{
  "balance": 1.5,
  "publicKey": "CreatorWallet123..."
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited based on subscription tier:

- **Free Tier**: 10 requests per minute
- **Individual**: 60 requests per minute
- **Group**: 120 requests per minute
- **Lifetime**: 200 requests per minute

## WebSocket Endpoints

### Alpha Alerts
```
ws://localhost:5000/api/ws/alerts
```

Subscribes to real-time alpha alerts (smart money transactions, new launches, quality gems).

**Message Format:**
```json
{
  "type": "smart_money_buy",
  "wallet": "SmartMoney123...",
  "token": "NewToken456...",
  "amount": 100,
  "timestamp": 1699564800000
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
// Analyze a token
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    tokenAddress: '2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt' 
  })
});
const analysis = await response.json();
```

### Python
```python
import requests

# Analyze a token
response = requests.post(
    'http://localhost:5000/api/analyze',
    json={'tokenAddress': '2rvVzKqwW7yeF8vbyVgvo7hEqaPvFx7fZudyLcRMxmNt'}
)
analysis = response.json()
```

## Support

For API support:
- GitHub Issues: [Create an issue](https://github.com/drixindustries/rugkillleronsol/issues)
- Discord: [Join our server](https://discord.gg/yourinvite)
- Email: support@yourwebsite.com
