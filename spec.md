Yandex API token handling single-page application (SPA) with the following business logic implementation requirements:

1. Authentication Flow:
   - Implement a secure mechanism to fetch the Yandex API token
   - Include proper error handling for failed authentication attempts
   - Store the token securely in the application state

2. Webhook Integration:
   - Design a reliable communication layer to pass the Yandex API token to the n8n webhook
   - Implement retry logic for failed webhook calls
   - Include necessary validation of webhook responses (response status and message parsing)

Technical Requirements:
- Implement responsive one section UI design.
- Include minimal loading states
- Add comprehensive error handling with notifications.
- Ensure secure token management
- Document API integration points

Configuration variables:
- Yandex App Client ID: '513f041567bc4b46a9780a675bb88d5e'
- Webhook URL: 'https://n8n.riddler.digital/webhook/yandex-oauth'
- Redirect URI: current page URL

Visual design:
- Single section layout with a centered content area
- Minimalistic styling with a focus on readability
- Clear call-to-action buttons for authentication
- Feedback mechanisms for successful authentication and errors
- Theme code: index.css