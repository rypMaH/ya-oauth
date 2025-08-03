# Yandex OAuth Integration

This project provides a simple static web page to facilitate the Yandex OAuth authorization flow. The page allows users to obtain an authorization code from Yandex and pass it to a Yandex Cloud Function for token exchange and storage in ClickHouse.

## Features

- Simple and lightweight static web page
- Yandex OAuth authorization code retrieval
- Authorization code submission to Yandex Cloud Function
- Success and error notifications

## How to Use

1. Open `index.html` in a web browser
2. Click the "Connect to Yandex" button to start the OAuth process
3. You will be redirected to Yandex to authorize the application
4. After authorization, you'll receive an authorization code
5. Copy the authorization code and paste it into the input field
6. Click "Pass the Code" to send the code to the Yandex Cloud Function
7. View the success or error notification

## Configuration

The application uses the following configuration values from `.env`:

- `YANDEX_CLIENT_ID`: Your Yandex OAuth application client ID
- `YANDEX_CLIENT_SECRET`: Your Yandex OAuth application client secret
- `YANDEX_REDIRECT_URI`: The redirect URI for OAuth flow

## Implementation Details

The web page consists of two main sections:

1. **Section 1**: Initialize Yandex OAuth process with "Connect to Yandex" button
2. **Section 2**: Input field for Yandex Authorization code with "Pass the Code" button

The page includes basic styling for a clean, user-friendly interface with appropriate feedback notifications.

## Security Notes

In this implementation, the client ID is exposed in the frontend code. In a production environment:

- The OAuth flow should be handled server-side
- The client secret should never be exposed in client-side code
- Consider using a backend proxy for API calls to protect your credentials

## Next Steps

To complete the full implementation:

1. Deploy the Yandex Cloud Function to handle token exchange
2. Update the `sendCodeToCloudFunction` function in `index.html` with the actual Cloud Function endpoint
3. Implement proper error handling and validation
4. Add additional security measures as needed