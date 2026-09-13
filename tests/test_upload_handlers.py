"""Test upload message handlers — _process_json_file validation, size checks, non-JSON replies."""
import sys, os
import pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "mos_os"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "Muscle Operating System", "00_META", "scripts"))

from unittest.mock import AsyncMock, patch
from mos_os.handlers.upload_profile import (
    _process_json_file, handle_json_upload,
    upload_profile, MAX_JSON_BYTES,
)


class FakeDoc:
    def __init__(self, name="test.json", size=1024):
        self.file_name = name
        self.file_size = size
        self.file_id = "fake_id"


class FakeMsg:
    def __init__(self, doc=None):
        self.document = doc
        self.reply_text = AsyncMock()
        self.reply_document = AsyncMock()
        self.edit_text = AsyncMock()
        self.delete = AsyncMock()


class FakeUser:
    def __init__(self):
        self.id = 999
        self.first_name = "Tester"


class FakeUpdate:
    def __init__(self, doc=None):
        self.message = FakeMsg(doc=doc)
        self.effective_user = FakeUser()


@pytest.mark.asyncio
async def test_process_json_missing_name():
    msg = FakeMsg()
    form_json = {"answers": {"Q46": "80"}, "name": ""}
    await _process_json_file(None, None, msg, form_json, "u1")
    msg.edit_text.assert_awaited_once()
    args = msg.edit_text.call_args[0][0]
    assert "missing: name" in args


@pytest.mark.asyncio
async def test_process_json_missing_weight():
    msg = FakeMsg()
    form_json = {"answers": {"Q45": "Bob"}, "name": "Bob"}
    await _process_json_file(None, None, msg, form_json, "u1")
    msg.edit_text.assert_awaited_once()
    args = msg.edit_text.call_args[0][0]
    assert "missing: weight" in args


@pytest.mark.asyncio
async def test_process_json_missing_both():
    msg = FakeMsg()
    form_json = {"answers": {}}
    await _process_json_file(None, None, msg, form_json, "u1")
    msg.edit_text.assert_awaited_once()
    args = msg.edit_text.call_args[0][0]
    assert "name" in args
    assert "weight" in args
    assert "missing:" in args


@pytest.mark.asyncio
async def test_process_json_name_from_top_level():
    msg = FakeMsg()
    form_json = {"name": "Alice", "answers": {"Q46": "70"}}
    with patch("mos_os.handlers.upload_profile.map_form_json") as mock_map:
        mock_map.side_effect = Exception("stop here")
        await _process_json_file(None, None, msg, form_json, "u1")
    mock_map.assert_called_once()


@pytest.mark.asyncio
async def test_handle_json_upload_rejects_non_json():
    doc = FakeDoc(name="photo.jpg", size=2048)
    update = FakeUpdate(doc=doc)
    await handle_json_upload(update, None)
    update.message.reply_text.assert_awaited_once()
    args = update.message.reply_text.call_args[0][0]
    assert ".json" in args.lower()


@pytest.mark.asyncio
async def test_handle_json_upload_rejects_oversized():
    doc = FakeDoc(name="test.json", size=MAX_JSON_BYTES + 1)
    update = FakeUpdate(doc=doc)
    await handle_json_upload(update, None)
    update.message.reply_text.assert_awaited_once()
    args = update.message.reply_text.call_args[0][0]
    assert "large" in args.lower()


@pytest.mark.asyncio
async def test_handle_json_upload_accepts_valid():
    doc = FakeDoc(name="intake.json", size=4096)
    update = FakeUpdate(doc=doc)
    with patch("mos_os.handlers.upload_profile._download_json") as mock_dl:
        mock_dl.return_value = {"name": "Test", "answers": {"Q46": "75"}}
        with patch("mos_os.handlers.upload_profile._process_json_file"):
            await handle_json_upload(update, None)
    mock_dl.assert_awaited_once()


@pytest.mark.asyncio
async def test_upload_profile_requires_document():
    update = FakeUpdate(doc=None)
    await upload_profile(update, None)
    update.message.reply_text.assert_awaited_once()
    args = update.message.reply_text.call_args[0][0]
    assert "json" in args.lower()


@pytest.mark.asyncio
async def test_upload_profile_rejects_non_json():
    doc = FakeDoc(name="report.pdf", size=2048)
    update = FakeUpdate(doc=doc)
    await upload_profile(update, None)
    update.message.reply_text.assert_awaited_once()
    assert ".json" in update.message.reply_text.call_args[0][0]
