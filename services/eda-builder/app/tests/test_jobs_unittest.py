import os
import tempfile
import unittest
from fastapi.testclient import TestClient


class EdaBuilderApiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["EDA_BUILDER_DATA_DIR"] = self.tmp.name
        from app.config import get_settings

        get_settings.cache_clear()
        from app.main import create_app

        self.client = TestClient(create_app())

    def tearDown(self):
        self.tmp.cleanup()

    def test_create_idempotent_job_and_get_draft(self):
        payload = {
            "source": {"type": "ezplm_component", "componentId": "lm358", "mpn": "LM358DR"},
            "requestedArtifacts": {"symbol9": True, "symbol10": True, "footprint": True, "step": True, "vrml": False},
            "mode": "missing_only",
        }
        first = self.client.post("/api/v1/eda-builder/jobs", json=payload, headers={"Idempotency-Key": "same-request"})
        second = self.client.post("/api/v1/eda-builder/jobs", json=payload, headers={"Idempotency-Key": "same-request"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["jobId"], second.json()["jobId"])

        draft = self.client.get(f"/api/v1/eda-builder/jobs/{first.json()['jobId']}/draft")
        self.assertEqual(draft.status_code, 200)
        self.assertEqual(draft.json()["component"]["mpn"], "LM358DR")
        self.assertEqual(draft.json()["reviewItems"][0]["severity"], "blocking")

    def test_generate_returns_explicit_not_implemented_failure(self):
        payload = {
            "source": {"type": "manual", "mpn": "MANUAL-PART"},
            "requestedArtifacts": {"symbol9": True, "symbol10": False, "footprint": False, "step": False, "vrml": False},
            "mode": "missing_only",
        }
        job = self.client.post("/api/v1/eda-builder/jobs", json=payload).json()
        generated = self.client.post(f"/api/v1/eda-builder/jobs/{job['jobId']}/generate")
        self.assertEqual(generated.status_code, 200)
        self.assertEqual(generated.json()["status"], "failed")
        self.assertEqual(generated.json()["error"], "GENERATION_NOT_IMPLEMENTED")

        artifacts = self.client.get(f"/api/v1/eda-builder/jobs/{job['jobId']}/artifacts").json()
        self.assertIsNone(artifacts["symbol"])
        self.assertEqual(artifacts["manifest"]["validationStatus"], "not_run")

    def test_cancel_job(self):
        payload = {
            "source": {"type": "pdf_url", "sourceUrl": "https://example.com/part.pdf", "mpn": "URL-PART"},
            "requestedArtifacts": {"symbol9": True, "symbol10": True, "footprint": True, "step": False, "vrml": False},
            "mode": "missing_only",
        }
        job = self.client.post("/api/v1/eda-builder/jobs", json=payload).json()
        cancelled = self.client.post(f"/api/v1/eda-builder/jobs/{job['jobId']}/cancel")
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.json()["status"], "cancelled")


if __name__ == "__main__":
    unittest.main()
