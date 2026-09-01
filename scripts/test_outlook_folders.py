#!/usr/bin/env python3
"""Tests for Outlook company-folder sorting."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from outlook_folders import (
    MAIL_FAILURES,
    ME_FOLDER,
    OTHER_FOLDER,
    OTHER_PEOPLE,
    PARENT_FOLDER,
    PEOPLE_FOLDER,
    PEOPLE_PREFIX,
    Message,
    classify_message,
    classify_person,
    domain_to_folder,
    extract_domain,
    load_companies,
    load_messages_csv,
    load_people,
    load_personal_domains,
    load_source_folder_ids,
    people_group_name,
    registrable_domain,
    rules_cheat_sheet,
    safe_person_folder,
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
            "noreply@uber.com": "Uber",
            "estatement@icicibank.com": "Icicibank",
            "tanishq@td.transact-tcl.co.in": "Tanishq",
        }
        for address, folder in cases.items():
            result = classify_message(
                Message("x", address, "s"), self.companies, self.personal, self.mapping
            )
            self.assertEqual(result.folder, folder, address)

    def test_personal_is_not_a_company_folder(self):
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


class PeopleTests(unittest.TestCase):
    def test_known_people_and_mail_failures(self):
        people = load_people()
        me = classify_person(Message("shyam prasad", "shyam_1@hotmail.co.uk", "note"), people)
        self.assertEqual(me.folder, f"{PEOPLE_PREFIX}{ME_FOLDER}")
        fail = classify_person(Message("Microsoft Outlook", "postmaster@outlook.com", "Undeliverable"), people)
        self.assertEqual(fail.folder, f"{PEOPLE_PREFIX}{MAIL_FAILURES}")
        david = classify_person(
            Message("david metcalfe", "davidjohnmetcalfe@yahoo.com", "hi"), people
        )
        self.assertEqual(david.folder, f"{PEOPLE_PREFIX}David Metcalfe")

    def test_person_folder_names_are_readable(self):
        self.assertEqual(safe_person_folder("david metcalfe", "x@gmail.com"), "David Metcalfe")
        self.assertEqual(safe_person_folder("DAJANI JEGAN", "x@gmail.com"), "Dajani Jegan")
        self.assertEqual(safe_person_folder("Ask Ganesha", "x@gmail.com"), "Ask Ganesha")
        self.assertEqual(safe_person_folder("", "anna.metcalfe@gmail.com"), "Anna Metcalfe")

    def test_two_emails_from_same_person_get_a_named_folder(self):
        messages = [
            Message("Anna Metcalfe", "anna.m@gmail.com", "Hi"),
            Message("Anna Metcalfe", "anna.m@gmail.com", "Sunday"),
            Message("Once", "once.friend@yahoo.com", "yo"),
        ]
        preview = sort_messages(messages)
        self.assertEqual(
            [m.from_email for m in preview.groups[people_group_name("Anna Metcalfe")]],
            ["anna.m@gmail.com", "anna.m@gmail.com"],
        )
        self.assertEqual(
            [m.from_email for m in preview.groups[people_group_name(OTHER_PEOPLE)]],
            ["once.friend@yahoo.com"],
        )
        self.assertEqual(preview.inbox, [])


class SortTests(unittest.TestCase):
    def test_sample_inbox_files_companies_and_people(self):
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
        people_other = preview.groups[people_group_name(OTHER_PEOPLE)]
        people_emails = {m.from_email for m in people_other}
        self.assertIn("family.member@gmail.com", people_emails)
        self.assertIn("mate@hotmail.co.uk", people_emails)
        self.assertTrue(any("oneoffspam" in m.from_email for m in preview.groups[OTHER_FOLDER]))
        inbox_emails = {m.from_email for m in preview.inbox}
        self.assertNotIn("deals@oneoffspam.example", inbox_emails)
        self.assertNotIn("family.member@gmail.com", inbox_emails)
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
        self.assertEqual(
            [m.from_email for m in preview.groups[people_group_name(OTHER_PEOPLE)]],
            ["mum@gmail.com"],
        )
        self.assertEqual(preview.inbox, [])

    def test_two_unknown_same_company_create_folder(self):
        messages = [
            Message("Shop", "a@freshbeans.example", "Order"),
            Message("Shop", "b@freshbeans.example", "Ship"),
        ]
        preview = sort_messages(messages)
        self.assertEqual(list(preview.groups), ["Freshbeans"])
        self.assertEqual(preview.inbox, [])

    def test_sample_inbox_is_cleared_into_folders(self):
        preview = sort_messages(load_messages_csv())
        self.assertEqual(preview.inbox, [])


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
        self.assertIn(PEOPLE_FOLDER, text)
        self.assertIn(OTHER_PEOPLE, text)

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


class PinTests(unittest.TestCase):
    def test_important_folders_get_numbered_prefix(self):
        from outlook_folders import load_pin_ranks, pinned_folder_name

        ranks = load_pin_ranks()
        self.assertEqual(pinned_folder_name("Apple", ranks), "01 Apple")
        self.assertEqual(pinned_folder_name("Google", ranks), "02 Google")
        self.assertEqual(pinned_folder_name("GitHub", ranks), "03 GitHub")
        self.assertEqual(pinned_folder_name("Cursor", ranks), "04 Cursor")
        self.assertEqual(pinned_folder_name("GoDaddy", ranks), "05 GoDaddy")
        self.assertTrue(pinned_folder_name("Apple", ranks) < pinned_folder_name("Google", ranks))
        self.assertTrue(pinned_folder_name("Apple", ranks) < "Amazon")
        self.assertEqual(pinned_folder_name("Freshbeans", ranks), "Freshbeans")
        order = [pinned_folder_name(name, ranks) for name, _ in sorted(ranks.items(), key=lambda item: item[1])]
        self.assertEqual(order[:4], ["01 Apple", "02 Google", "03 GitHub", "04 Cursor"])


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
        self.assertIn("People", html)

    def test_one_click_bat_exists(self):
        root = Path(__file__).resolve().parents[1]
        self.assertTrue((root / "FILE-ALL-EMAIL-FOLDERS.bat").exists())
        self.assertTrue((root / "outlook" / "File-AllCompanyMail.ps1").exists())
        live = (root / "scripts" / "file_live_outlook.py").read_text(encoding="utf-8")
        self.assertIn("start_device_login", live)
        self.assertIn("file_mailbox", live)


if __name__ == "__main__":
    unittest.main()
