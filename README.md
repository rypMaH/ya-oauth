# Yandex OAuth Account Manager

A complete system for managing Yandex account credentials with ClickHouse storage and a web frontend.

## Features

- **OAuth Integration**: Connect Yandex accounts via OAuth 2.0
- **Account Management**: View and manage account credentials
- **Status Control**: Toggle account active/inactive status
- **ClickHouse Storage**: Store credentials in ClickHouse database
- **Web Interface**: Clean, responsive frontend for account management

This project provides two main components:
1. **Yandex OAuth Credentials Pipeline** - OAuth token management and storage
2. **Yandex Direct Campaigns Extractor** - Automated data extraction from Yandex Direct API

## Project Overview

### 1. OAuth Credentials Pipeline
Simple and light-weight Yandex OAuth Credentials pipeline.

**Backend Logic:**
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

### 2. Yandex Direct Campaigns Extractor
Automated extraction of campaign data from Yandex Direct API.

**Features:**
- Multi-account support using stored OAuth tokens
- Comprehensive campaign data extraction
- Automatic table creation in ClickHouse
- Partitioned storage for efficient querying
- Scheduled execution support


## Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables**:
   Update `.env` file with your credentials:
   ```
   YANDEX_CLIENT_ID=your_client_id
   YANDEX_CLIENT_SECRET=your_client_secret
   YANDEX_REDIRECT_URI=https://oauth.yandex.ru/verification_code

   CLICKHOUSE_HOST=your_clickhouse_host
   CLICKHOUSE_PORT=8123
   CLICKHOUSE_USER=your_username
   CLICKHOUSE_PASSWORD=your_password
   CLICKHOUSE_DB=yandex_creds
   CLICKHOUSE_TABLE=api_tokens
   ```

## Usage

### OAuth Flow (Token Management)
1. Open `index.html` in a web browser
2. Click "Connect to Yandex" to start OAuth flow
3. Paste the authorization code and submit
4. Tokens are automatically stored in ClickHouse

### Campaigns Extraction
1. **Run the extractor**:
   ```bash
   python yandex_direct_extractor.py
   ```

2. **Test the setup**:
   ```bash
   python test_extractor.py
   ```

3. **Schedule regular extraction**:
   - **Linux/Mac**: Add to crontab
     ```bash
     # Run every hour
     0 * * * * cd /path/to/yandex-oauth && python yandex_direct_extractor.py
     ```
   - **Windows**: Create Task Scheduler task

## Data Schema

### api_tokens table
- `username`: Yandex account username
- `full_name`: User's full name
- `access_token`: OAuth access token
- `expires_at`: Token expiration date
- `inserted_at`: Token creation date

### yandex_direct_campaigns table (auto-created)
- `campaign_id`: Unique campaign identifier
- `name`: Campaign name
- `status`: Campaign status (ACCEPTED, DRAFT, etc.)
- `state`: Campaign state (ON, OFF, etc.)
- `status_payment`: Payment status
- `status_clarification`: Status clarification text
- `source_id`: Source identifier
- `currency`: Campaign currency
- `daily_budget`: Daily budget amount
- `daily_budget_currency`: Budget currency
- `start_date`: Campaign start date
- `end_date`: Campaign end date
- `negative_keywords`: Negative keywords
- `time_zone`: Campaign timezone
- `statistics_impressions`: Total impressions
- `statistics_clicks`: Total clicks
- `statistics_cost`: Total cost
- `extracted_at`: Data extraction timestamp
- `username`: Account username
- `full_name`: Account owner's full name

## API Documentation

### Yandex OAuth
- [OAuth Flow](https://yandex.ru/dev/id/doc/en/codes/screen-code)
- [User Information](https://yandex.ru/dev/id/doc/en/user-information)

### Yandex Direct API
- [Campaigns API](https://yandex.ru/dev/direct/doc/ref-v5/campaigns/get.html)
- [API Limits](https://yandex.ru/dev/direct/doc/concepts/limits.html)

## Troubleshooting

### Common Issues
1. **Connection errors**: Verify ClickHouse credentials
2. **API errors**: Check token validity and expiration
3. **Permission errors**: Ensure Yandex Direct API access

### Debug Mode
Add debug logging to scripts:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Security Notes
- Never commit `.env` file
- Use secure ClickHouse credentials
- Rotate OAuth tokens regularly
- Monitor API usage and limits
