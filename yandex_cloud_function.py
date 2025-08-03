import os
import json
import requests
import traceback
import clickhouse_connect

from yandexid import YandexOAuth
from datetime import datetime, timedelta


def handler(event, context):
    http_method = event.get('httpMethod', 'POST').upper()
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    if http_method == "OPTIONS":
        return {"statusCode": 204, "headers": cors_headers, "body": ""}

    try:
        if isinstance(event.get('body'), str):
            data = json.loads(event['body'])
        else:
            data = event.get('body', event)
    except Exception:
        data = event.get('body', event)

    code = data.get('code')
    if not code:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Missing authorization code"})
        }

    client_id = os.environ.get('YANDEX_CLIENT_ID')
    client_secret = os.environ.get('YANDEX_CLIENT_SECRET')
    redirect_uri = os.environ.get('YANDEX_REDIRECT_URI')

    clickhouse_host = os.environ.get("CLICKHOUSE_HOST")
    clickhouse_port = int(os.environ.get("CLICKHOUSE_PORT"))
    clickhouse_user = os.environ.get("CLICKHOUSE_USER")
    clickhouse_password = os.environ.get("CLICKHOUSE_PASSWORD")
    clickhouse_db = os.environ.get("CLICKHOUSE_DB")
    clickhouse_table = os.environ.get("CLICKHOUSE_TABLE")

    if not all([client_id, client_secret, redirect_uri]):
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Missing OAuth credentials in environment"})
        }
    if not all([clickhouse_host, clickhouse_user, clickhouse_password, clickhouse_db]):
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Missing ClickHouse credentials in environment"})
        }

    try:
        # OAuth token exchange
        yandex_oauth = YandexOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri
        )
        token = yandex_oauth.get_token_from_code(code)
        access_token = token.access_token
        expires_in = token.expires_in
        expires_at = (datetime.now() + timedelta(seconds=expires_in)).date()

        # Fetch user info
        user_resp = requests.get(
            "https://login.yandex.ru/info",
            headers={"Authorization": f"OAuth {access_token}"}
        )
        if user_resp.status_code != 200:
            raise Exception(f"Failed to get user info: {user_resp.text}")
        
        user_info = user_resp.json()
        username = user_info.get("login", "-")
        first_name = user_info.get("first_name", "-")
        last_name = user_info.get("last_name", "-")
        full_name = f"{first_name} {last_name}".strip()
        
        # Connect to ClickHouse
        ch_client = clickhouse_connect.get_client(
            host=clickhouse_host,
            port=clickhouse_port,
            username=clickhouse_user,
            password=clickhouse_password,
            database=clickhouse_db
        )

        # Duplicate username check
        duplicate_rows = ch_client.query(
            f"SELECT count() FROM {clickhouse_db}.{clickhouse_table} WHERE username = %(username)s",
            {"username": username}
        )
        if duplicate_rows.result_rows[0][0] > 0:
            return {
                "statusCode": 409,
                "headers": cors_headers,
                "body": json.dumps({"error": "Username already exists in the database", "username": username})
            }
        
        # Insert credentials
        data = [[
            username,
            full_name,
            access_token,
            expires_at,
            datetime.now().date()
        ]]

        ch_client.insert(f"{clickhouse_db}.{clickhouse_table}", data, column_names=["username", "full_name", "access_token", "expires_at", "inserted_at"])

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "success": True,
                "username": username,
                "full_name": full_name,
                "token": access_token
            })
        }

    except Exception as e:
        error_message = f"{str(e)}\n{traceback.format_exc()}"
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": error_message})
        }
