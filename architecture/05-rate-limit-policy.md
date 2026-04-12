# Rate Limit Policy

## Overview

Rate limiting is implemented using SlowAPI to protect the API from abuse and ensure fair resource allocation.

## Configuration

### Rate Limits by Endpoint Type

| Category | Endpoint Pattern | Limit |
|----------|------------------|-------|
| Auth Login | `/api/auth/login` | 5/minute |
| Auth Register | `/api/auth/register` | 3/hour |
| Password Reset | `/api/auth/password/*` | 10/hour |
| Search | `/*/search` | 20/minute |
| Data Read | GET on `/api/v1/tenant/competities`, `/api/v1/tenant/wedstrijden`, `/api/v1/tenant/teams` | 100/minute |
| Data Write | POST/PUT/DELETE/PATCH on data endpoints | 30/minute |
| Bulk Operations | Bulk endpoints | 10/hour |
| Default | All other endpoints | 60/minute |

### Internal IP Whitelist

The following IPs are excluded from rate limiting:
- 127.0.0.1 (localhost)
- ::1 (IPv6 localhost)

## Response Headers

When a rate limit is hit, the following headers are included in the response:

| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds to wait before retrying |
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when the limit resets |

## Error Response

When rate limited, clients receive:
- **Status Code**: 429 Too Many Requests
- **Body**: `{"detail": "Te veel aanvragen. Probeer het over {seconds} seconden opnieuw."}`

## Implementation

- Rate limiting uses client IP address (supports X-Forwarded-For for reverse proxy)
- Limits are applied per IP address
- Rate limiting is disabled when `TESTING` environment variable is set

## Best Practices for Clients

1. Implement exponential backoff on 429 responses
2. Cache responses where possible to reduce API calls
3. Use the rate limit headers to track usage
4. Queue requests to avoid hitting limits during burst traffic