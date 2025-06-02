import unittest
import os
import shutil
import math
import tempfile
import pandas as pd
from epv_valuation_model import utils

class TestUtils(unittest.TestCase):
    def test_ensure_directory_exists_creates_dir(self):
        temp_dir = tempfile.mkdtemp()
        nested_dir = os.path.join(temp_dir, "level1", "level2")
        # Should not raise
        utils.ensure_directory_exists(nested_dir)
        self.assertTrue(os.path.exists(nested_dir))
        # Clean up
        shutil.rmtree(temp_dir)

    def test_ensure_directory_exists_existing_dir(self):
        temp_dir = tempfile.mkdtemp()
        # Should not raise if called again
        utils.ensure_directory_exists(temp_dir)
        self.assertTrue(os.path.exists(temp_dir))
        shutil.rmtree(temp_dir)

    def test_format_currency_basic(self):
        self.assertEqual(utils.format_currency(1234567.89, precision=2), "$1,234,567.89")
        self.assertEqual(utils.format_currency(1234567, precision=0), "$1,234,567")
        self.assertEqual(utils.format_currency(-50000, precision=0), "$-50,000")
        self.assertEqual(utils.format_currency(0, precision=0), "$0")
        self.assertEqual(utils.format_currency(987.65, currency_symbol="€", precision=2), "€987.65")

    def test_format_currency_none_nan(self):
        self.assertEqual(utils.format_currency(None), "N/A")
        self.assertEqual(utils.format_currency(float('nan')), "N/A")
        self.assertEqual(utils.format_currency(pd.NA), "N/A")

    def test_format_currency_custom_na(self):
        self.assertEqual(utils.format_currency(None, default_na="NO DATA"), "NO DATA")

    def test_format_percentage_basic(self):
        self.assertEqual(utils.format_percentage(0.25345, precision=2), "25.35%")
        self.assertEqual(utils.format_percentage(0.085, precision=1), "8.5%")
        self.assertEqual(utils.format_percentage(1.0, precision=0), "100%")
        self.assertEqual(utils.format_percentage(-0.05, precision=2), "-5.00%")
        self.assertEqual(utils.format_percentage(0, precision=2), "0.00%")

    def test_format_percentage_none_nan(self):
        self.assertEqual(utils.format_percentage(None), "N/A")
        self.assertEqual(utils.format_percentage(float('nan')), "N/A")
        self.assertEqual(utils.format_percentage(pd.NA), "N/A")

    def test_format_percentage_custom_na(self):
        self.assertEqual(utils.format_percentage(None, default_na="NO DATA"), "NO DATA")

if __name__ == "__main__":
    unittest.main() 