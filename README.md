# Project Overview
Simple and light-weight Yandex OAuth Credentials pipeline.

## Backend Logic
1. Static web site side / Fetch Yandex Authorization code.
    - User initialize Yandex Oauth process by pushing the "Connect to Yandex" button.
    - User is redirected to Yandex OAuth page.
    - User authorizes the application and get the Authorization code.
    - User paste the code to the input field and press "Pass the Code" button.
    - Authorization code is passed to Yandex Cloud Function as POST request parameter.

2. Yandex Cloud Function side / Get Yandex OAuth token.
    - Cloud Function exchanges Authorization code for token, username and expiration time.
    - Cloud Function returns token, username and expiration time to the web page.


3. Yandex Cloud Function side / Store fetched data in ClickHouse.
    - Check if "yandex_tokens" database and "tokens" table exist, if not, create database and table. Table fields include:
        - username (String)
        - token (String)
        - created_at (Date)
        - expires_at (Date)
    - Check if current token already exists in Clickhouse (avoiding duplicates).
    - Insert fetched Yandex token, username and expiration time in Clickhouse.

## Frontend Structure
1. Section 1 - Initialize Yandex Oauth process by pushing the "Connect to Yandex" button.
2. Section 2 - Input field for Yandex Authorization code with "Pass the Code" button.
3. Frontend displays Success or Error notification.

## Implementation

The frontend has been implemented as a static HTML page (`index.html`) with embedded JavaScript for handling the OAuth flow and communication with the Yandex Cloud Function.

The implementation includes:
- Basic HTML structure with two main sections as specified
- CSS styling for a clean user interface
- JavaScript functionality for OAuth flow and code submission
- Notification system for success/error messages

The implementation follows the requirements in this specification document.

## Featured Yandex Docs
https://yandex.ru/dev/id/doc/en/codes/screen-code
https://yandex.ru/dev/id/doc/en/user-information
