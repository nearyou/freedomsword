import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "deploy" / "vps" / "prepare-env.py"
PROJECT_ROOT = SCRIPT.parents[2]
spec = importlib.util.spec_from_file_location("prepare_env", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PrepareEnvTests(unittest.TestCase):
    def test_preserves_vps_secrets_and_sets_deployment_values(self):
        with tempfile.TemporaryDirectory(dir=PROJECT_ROOT) as folder:
            imported = Path(folder) / ".env.import"
            target = Path(folder) / ".env"
            imported.write_text('APP_ENV="development"\nDATABASE_URL="mongodb+srv://local/db"\n'
                                'SESSION_SECRET="local-secret"\nBALLOT_SECRET="local-ballot"\n'
                                'ELIGIBILITY_COMMITMENT_SECRET="local-eligibility"\n')
            target.write_text('DATABASE_URL="mongodb+srv://vps/db"\n'
                              'TELEGRAM_BOT_TOKEN="12345:existing-token"\n'
                              'SESSION_SECRET="vps-secret"\n')
            module.prepare_env(imported, target)
            values = module.parse_env(target)
            self.assertEqual(module.plain(values["DATABASE_URL"]), "mongodb+srv://vps/db")
            self.assertEqual(module.plain(values["TELEGRAM_BOT_TOKEN"]), "12345:existing-token")
            self.assertEqual(module.plain(values["SESSION_SECRET"]), "vps-secret")
            self.assertEqual(module.plain(values["BALLOT_SECRET"]), "local-ballot")
            self.assertEqual(module.plain(values["APP_ENV"]), "staging")
            self.assertEqual(module.plain(values["REDIS_URL"]), "redis://127.0.0.1:6379")
            self.assertFalse(imported.exists())
            self.assertEqual(len(list(Path(folder).glob(".env.backup.*"))), 1)

    def test_missing_bot_token_leaves_existing_file_untouched(self):
        with tempfile.TemporaryDirectory(dir=PROJECT_ROOT) as folder:
            imported = Path(folder) / ".env.import"
            target = Path(folder) / ".env"
            imported.write_text('DATABASE_URL="mongodb+srv://local/db"\n'
                                'SESSION_SECRET="local-secret"\nBALLOT_SECRET="local-ballot"\n'
                                'ELIGIBILITY_COMMITMENT_SECRET="local-eligibility"\n')
            target.write_text('APP_ENV="development"\n')
            with self.assertRaisesRegex(ValueError, "TELEGRAM_BOT_TOKEN"):
                module.prepare_env(imported, target)
            self.assertEqual(target.read_text(), 'APP_ENV="development"\n')
            self.assertTrue(imported.exists())


if __name__ == "__main__":
    unittest.main()
