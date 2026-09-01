#!/usr/bin/env python3
"""Tests for Outlook company-folder sorting."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from outlook_folders import (
    OTHER_FOLDER,
    PARENT_FOLDER,
    Message,
    classify_message,
    domain_to_folder,
    extract_domain,
    load_companies,
    load_messages_csv,
    load_personal_domains,
    load_source_folder_ids,
    registrable_domain,
    rules_cheat_sheet,
    sort_messages,
    title_from_domain,
    write_generated_files,
)


class DomainTests(unittest.TestCase):
    def test_extract_plain_and_header(self):
        self.assertEqual(extract_domain("noreply@github.com"), "github.com")
        self.assertEqual(
            extract_domain("GitHub <notifications@github.com>"),
            "github.com",
        )

    def test_registrable_co_uk_and_subdomain(self):
        self.assertEqual(registrable_domain("noreply.brakes.co.uk"), "brakes.co.uk")
        self.assertEqual(registrable_domain("email.apple.com"), "apple.com")
        self.assertEqual(registrable_domain("github.com"), "github.com")

    def test_title_from_domain(self):
        self.assertEqual(title_from_domain("orders.freshbeans.example"), "Freshbeans")


class MappingTests(unittest.TestCase):
    def setUp(self):
        self.companies = load_companies()
        self.personal = load_personal_domains()
        self.mapping = domain_to_folder(self.companies)

    def test_known_senders(self):
        cases = {
            "notifications@github.com": "GitHub",
            "noreply@users.noreply.github.com": "GitHub",
            "noreply@cursor.com": "Cursor",
            "notifications@cursor.sh": "Cursor",
            "appleid@id.apple.com": "Apple",
            "no_reply@email.apple.com": "Apple",
            "no-reply@accounts.google.com": "Google",
            "noreply@render.com": "Cloud",
            "hello@netlify.com": "Cloud",
            "noreply@openai.com": "OpenAI",
            "donotreply@secureserver.net": "GoDaddy",
            "auto-confirm@amazon.co.uk": "Amazon",
            "hr@vedanta.co.in": "Vedanta",
            "noreply@brakes.co.uk": "Brakes",
            "orders@bidfood.co.uk": "Bidfood",
            "sales@nisbets.co.uk": "Nisbets",
            "noreply@mail.hmrc.gov.uk": "HMRC",
            "alerts@barclays.co.uk": "Barclays",
            "no-reply@nhs.uk": "NHS",
        }
        for address, folder in cases.items():
            result = classify_message(
                Message("x", address, "s"), self.companies, self.personal, self.mapping
            )
            self.assertEqual(result.folder, folder, address)

    def test_personal_stays_in_inbox(self):
        for address in (
            "family.member@gmail.com",
            "mate@hotmail.co.uk",
            "someone@outlook.com",
            "me@icloud.com",
        ):
            result = classify_message(
                Message("Friend", address, "hi"),
                self.companies,
                self.personal,
                self.mapping,
            )
            self.assertIsNone(result.folder, address)
            self.assertIn("personal", result.reason)

    def test_from_name_fallback(self):
        result = classify_message(
            Message("GitHub Notifications", "alerts@odd-mailer.example", "PR"),
            self.companies,
            self.personal,
            self.mapping,
        )
        self.assertEqual(result.folder, "GitHub")


class SortTests(unittest.TestCase):
    def test_sample_inbox_files_companies_and_keeps_people(self):
        preview = sort_messages(load_messages_csv())
        self.assertGreaterEqual(len(preview.groups["GitHub"]), 3)
        self.assertGreaterEqual(len(preview.groups["Cursor"]), 2)
        self.assertIn("Apple", preview.groups)
        self.assertIn("Google", preview.groups)
        self.assertIn("Cloud", preview.groups)
        self.assertIn("Bidfood", preview.groups)
        self.assertIn("HMRC", preview.groups)
        self.assertIn("Barclays", preview.groups)
        self.assertIn("NHS", preview.groups)
        inbox_emails = {m.from_email for m in preview.inbox}
        self.assertIn("family.member@gmail.com", inbox_emails)
        self.assertIn("mate@hotmail.co.uk", inbox_emails)
        self.assertTrue(any("oneoffspam" in m.from_email for m in preview.groups[OTHER_FOLDER]))
        self.assertNotIn("deals@oneoffspam.example", inbox_emails)
        self.assertIn("Freshbeans", preview.groups)
        self.assertEqual(len(preview.groups["Freshbeans"]), 2)

    def test_single_unknown_goes_to_other_companies(self):
        messages = [
            Message("Shop", "a@once.example", "Hi"),
            Message("Mum", "mum@gmail.com", "Hi"),
        ]
        preview = sort_messages(messages)
        self.assertNotIn("Once", preview.groups)
        self.assertEqual([m.from_email for m in preview.groups[OTHER_FOLDER]], ["a@once.example"])
        self.assertEqual([m.from_email for m in preview.inbox], ["mum@gmail.com"])

    def test_two_unknown_same_company_create_folder(self):
        messages = [
            Message("Shop", "a@freshbeans.example", "Order"),
            Message("Shop", "b@freshbeans.example", "Ship"),
        ]
        preview = sort_messages(messages)
        self.assertEqual(list(preview.groups), ["Freshbeans"])
        self.assertEqual(preview.inbox, [])

    def test_all_company_mail_leaves_inbox(self):
        preview = sort_messages(load_messages_csv())
        for message in preview.inbox:
            domain = message.from_email.rsplit("@", 1)[-1]
            self.assertTrue(
                domain in {"gmail.com", "hotmail.co.uk", "outlook.com", "icloud.com"}
                or "gmail" in domain
                or "hotmail" in domain,
                msg=f"company mail left in inbox: {message.from_email}",
            )


class ExportTests(unittest.TestCase):
    def test_rules_include_user_examples(self):
        text = rules_cheat_sheet()
        self.assertIn("File → GitHub", text)
        self.assertIn("github.com", text)
        self.assertIn("File → Cursor", text)
        self.assertIn("File → Cloud", text)
        self.assertIn("File → Apple", text)
        self.assertIn("File → Google", text)
        self.assertIn(f"Move to folder: Inbox / {PARENT_FOLDER} /", text)
        self.assertIn(OTHER_FOLDER, text)

    def test_write_preview_files(self):
        paths = write_generated_files()
        self.assertTrue(paths["preview"].exists())
        html = paths["preview"].read_text(encoding="utf-8")
        self.assertIn("GitHub", html)
        self.assertIn("Left in Inbox", html)
        summary = paths["summary"].read_text(encoding="utf-8")
        self.assertIn("filed", summary)
        self.assertIn("source_folder_ids", summary)

    def test_source_folder_from_outlook_link(self):
        ids = load_source_folder_ids()
        self.assertTrue(ids)
        self.assertTrue(ids[0].startswith("AQMk"))


class OpenMeTests(unittest.TestCase):
    def test_open_me_tells_user_where_to_look(self):
        root = Path(__file__).resolve().parents[1]
        html = (root / "OPEN-ME-OUTLOOK-FOLDERS.html").read_text(encoding="utf-8")
        self.assertIn("Folder Pane", html)
        self.assertIn("GitHub", html)
        self.assertIn("Cursor", html)
        self.assertIn("not</b> on the Windows desktop", html)
        self.assertIn("FILE-ALL-EMAIL-FOLDERS.bat", html)
        self.assertIn("outlook.live.com", html)
        self.assertIn("shyam_1@hotmail.co.uk", html)

    def test_one_click_bat_exists(self):
        root = Path(__file__).resolve().parents[1]
        self.assertTrue((root / "FILE-ALL-EMAIL-FOLDERS.bat").exists())
        self.assertTrue((root / "outlook" / "File-AllCompanyMail.ps1").exists())
        live = (root / "scripts" / "file_live_outlook.py").read_text(encoding="utf-8")
        self.assertIn("start_device_login", live)
        self.assertIn("file_mailbox", live)


if __name__ == "__main__":
    unittest.main()
