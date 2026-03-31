---
name: email-send
description: >
  Send emails via the Paperclip email API. Use when you need to email content
  plans, reports, summaries, or any other deliverables to stakeholders. Requires
  RESEND_API_KEY to be configured on the server.
---

# Email Send Skill

Send emails through the Paperclip server's email endpoint. The server handles
delivery via Resend — you just call the API.

## Authentication

Same as all Paperclip API calls:
`Authorization: Bearer $PAPERCLIP_API_KEY`

## Endpoint

```
POST $PAPERCLIP_API_URL/email/send
Content-Type: application/json
Authorization: Bearer $PAPERCLIP_API_KEY
X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
```

## Request Body

| Field     | Type               | Required | Description                              |
|-----------|--------------------|----------|------------------------------------------|
| `to`      | string or string[] | Yes      | Recipient email address(es)              |
| `subject` | string             | Yes      | Email subject line (max 500 chars)       |
| `html`    | string             | No*      | HTML body content                        |
| `text`    | string             | No*      | Plain text body content                  |
| `from`    | string             | No       | Sender (defaults to server config)       |
| `replyTo` | string             | No       | Reply-to address                         |

*At least one of `html` or `text` is required.

## Example

```bash
curl -X POST "$PAPERCLIP_API_URL/email/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Weekly Content Plan - w/c 7 April 2026",
    "html": "<h1>Content Plan</h1><p>Here is your weekly content plan...</p>",
    "text": "Content Plan\n\nHere is your weekly content plan..."
  }'
```

## Response

Success (200):
```json
{ "success": true, "id": "resend-message-id" }
```

Error (4xx/5xx):
```json
{ "error": "Email delivery failed", "details": { ... } }
```

## Tips

- Always send both `html` and `text` for best deliverability.
- For content plans, format the HTML nicely with tables and headings.
- The `from` field defaults to the server's configured sender — you usually don't need to set it.
- If the endpoint returns 503, it means RESEND_API_KEY is not configured on the server.
