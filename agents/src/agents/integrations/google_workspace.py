import json
import logging

from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
]


class GoogleWorkspaceClient:
    def __init__(self, credentials_path: str, delegated_user: str | None = None):
        self._creds = service_account.Credentials.from_service_account_file(
            credentials_path, scopes=SCOPES
        )
        if delegated_user:
            self._creds = self._creds.with_subject(delegated_user)
        self._gmail = None
        self._drive = None
        self._sheets = None

    @property
    def gmail(self):
        if not self._gmail:
            self._gmail = build("gmail", "v1", credentials=self._creds)
        return self._gmail

    @property
    def drive(self):
        if not self._drive:
            self._drive = build("drive", "v3", credentials=self._creds)
        return self._drive

    @property
    def sheets(self):
        if not self._sheets:
            self._sheets = build("sheets", "v4", credentials=self._creds)
        return self._sheets

    def list_gmail_messages(self, query: str = "", max_results: int = 20) -> list[dict]:
        results = (
            self.gmail.users()
            .messages()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )
        messages = results.get("messages", [])
        detailed = []
        for msg in messages:
            detail = (
                self.gmail.users()
                .messages()
                .get(
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["Subject", "From", "Date"],
                )
                .execute()
            )
            headers = {
                h["name"]: h["value"]
                for h in detail.get("payload", {}).get("headers", [])
            }
            detailed.append(
                {
                    "id": msg["id"],
                    "subject": headers.get("Subject", ""),
                    "from": headers.get("From", ""),
                    "date": headers.get("Date", ""),
                    "snippet": detail.get("snippet", ""),
                }
            )
        return detailed

    def read_gmail_message(self, message_id: str) -> dict:
        msg = (
            self.gmail.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute()
        )
        return msg

    def list_drive_files(
        self, folder_id: str | None = None, mime_type: str | None = None
    ) -> list[dict]:
        query_parts = []
        if folder_id:
            query_parts.append(f"'{folder_id}' in parents")
        if mime_type:
            query_parts.append(f"mimeType='{mime_type}'")
        query_parts.append("trashed=false")
        q = " and ".join(query_parts)

        results = (
            self.drive.files()
            .list(
                q=q,
                fields="files(id, name, mimeType, modifiedTime, size)",
                pageSize=100,
            )
            .execute()
        )
        return results.get("files", [])

    def read_drive_file(self, file_id: str) -> bytes:
        return self.drive.files().get_media(fileId=file_id).execute()

    def read_sheet(self, spreadsheet_id: str, range: str) -> list[list]:
        result = (
            self.sheets.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=range)
            .execute()
        )
        return result.get("values", [])
