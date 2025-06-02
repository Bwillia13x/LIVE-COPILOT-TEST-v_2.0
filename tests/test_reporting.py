# tests/test_reporting.py
# Unit tests for the reporting.py module.

import unittest
import os
import pandas as pd # For pd.isna checks if needed
import matplotlib.pyplot as plt # To ensure it's available, though we won't assert visual output

# Import functions and modules to be tested
from epv_valuation_model import reporting
from epv_valuation_model import config # For default currency symbol, report dirs

# Define a temporary directory for saving test plots
TEST_REPORTS_OUTPUT_DIR = "temp_test_reports_output_reporting"

class TestReporting(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Set up class-level fixtures if any."""
        print(f"\nStarting tests for reporting.py...")
        # Create the temporary directory for test plot outputs
        if not os.path.exists(TEST_REPORTS_OUTPUT_DIR):
            os.makedirs(TEST_REPORTS_OUTPUT_DIR)
        cls.sample_valuation_results = {
            'ticker': 'TESTCO',
            'current_price': 120.50,
            'currency': '$', # Use a specific currency for test consistency
            'market_cap': 12050000000,
            'epv_equity': 15000000000,
            'asset_value_equity': 7500000000,
            'margin_of_safety_epv': (150e8 - 120.5e8) / 150e8 if 150e8 else 0,
            'wacc': 0.09,
            'nopat': 1350000000, # 150e8 * 0.09
            'epv_operations': 14500000000,
            'normalized_ebit': 1800000000,
            'avg_op_margin': 0.18,
            'maint_capex': 150000000,
            'risk_free_rate': 0.025,
            'equity_risk_premium': config.EQUITY_RISK_PREMIUM,
        }

    @classmethod
    def tearDownClass(cls):
        """Clean up class-level fixtures after all tests are run."""
        print(f"\nCleaning up after reporting.py tests...")
        if os.path.exists(TEST_REPORTS_OUTPUT_DIR):
            for item in os.listdir(TEST_REPORTS_OUTPUT_DIR):
                item_path = os.path.join(TEST_REPORTS_OUTPUT_DIR, item)
                try:
                    if os.path.isfile(item_path):
                        os.unlink(item_path)
                except Exception as e:
                    print(f"Error removing file {item_path}: {e}")
            try:
                os.rmdir(TEST_REPORTS_OUTPUT_DIR) # Remove dir if empty
                print(f"Removed temporary directory: {TEST_REPORTS_OUTPUT_DIR}")
            except OSError as e: # Directory might not be empty if file removal failed
                print(f"Error removing directory {TEST_REPORTS_OUTPUT_DIR}: {e}")


    def test_generate_text_summary_returns_string(self):
        """Test that generate_text_summary returns a non-empty string."""
        summary = reporting.generate_text_summary(self.sample_valuation_results)
        self.assertIsInstance(summary, str, "Summary should be a string.")
        self.assertGreater(len(summary), 0, "Summary string should not be empty.")
        print("test_generate_text_summary_returns_string PASSED.")

    def test_generate_text_summary_contains_key_info(self):
        """Test that the summary contains key pieces of information."""
        summary = reporting.generate_text_summary(self.sample_valuation_results)
        self.assertIn(self.sample_valuation_results['ticker'], summary, "Ticker missing from summary.")
        self.assertIn("EPV (Equity)", summary, "EPV (Equity) label missing.")
        self.assertIn(f"{self.sample_valuation_results['currency']}{self.sample_valuation_results['epv_equity']:,.0f}", summary, "EPV Equity value missing/incorrect.")
        self.assertIn("Market Cap", summary, "Market Cap label missing.")
        self.assertIn("Margin of Safety", summary, "Margin of Safety label missing.")
        self.assertIn("WACC", summary, "WACC label missing.")
        self.assertIn(f"{self.sample_valuation_results['wacc']:.2%}", summary, "WACC value missing/incorrect.")
        print("test_generate_text_summary_contains_key_info PASSED.")

    def test_generate_text_summary_handles_missing_optional_data(self):
        """Test summary generation when optional data like asset_value or MoS is None."""
        results_missing_av = self.sample_valuation_results.copy()
        results_missing_av['asset_value_equity'] = None
        results_missing_av['margin_of_safety_epv'] = None # If EPV or MC missing

        summary = reporting.generate_text_summary(results_missing_av)
        self.assertIn("Asset Value (Equity Proxy): Not Calculated / Available", summary)
        self.assertIn("Margin of Safety (vs EPV):  N/A", summary)
        print("test_generate_text_summary_handles_missing_optional_data PASSED.")


    def test_plot_valuation_comparison_runs_without_error_no_save(self):
        """Test that plot_valuation_comparison runs without error when not saving."""
        # This test mainly checks that the plotting function can be called
        # without raising exceptions with typical data. Visual output is not asserted.
        try:
            plt.ioff() # Turn off interactive mode for automated tests
            reporting.plot_valuation_comparison(
                ticker=self.sample_valuation_results['ticker'],
                epv_equity=self.sample_valuation_results['epv_equity'],
                market_cap=self.sample_valuation_results['market_cap'],
                asset_value_equity=self.sample_valuation_results['asset_value_equity'],
                currency=self.sample_valuation_results['currency'],
                save_path=None # Do not save, just run the plotting logic
            )
            # If we reach here, no exception was raised by the plotting code itself
            self.assertTrue(True)
        except Exception as e:
            self.fail(f"plot_valuation_comparison raised an exception: {e}")
        finally:
            plt.ion() # Turn interactive mode back on if it was on before
            plt.close('all') # Close any figures created
        print("test_plot_valuation_comparison_runs_without_error_no_save PASSED.")

    def test_plot_valuation_comparison_runs_with_asset_value_none(self):
        """Test plotting when asset_value_equity is None."""
        try:
            plt.ioff()
            reporting.plot_valuation_comparison(
                ticker=self.sample_valuation_results['ticker'],
                epv_equity=self.sample_valuation_results['epv_equity'],
                market_cap=self.sample_valuation_results['market_cap'],
                asset_value_equity=None, # Test this case
                currency=self.sample_valuation_results['currency'],
                save_path=None
            )
            self.assertTrue(True)
        except Exception as e:
            self.fail(f"plot_valuation_comparison with asset_value=None raised an exception: {e}")
        finally:
            plt.ion()
            plt.close('all')
        print("test_plot_valuation_comparison_runs_with_asset_value_none PASSED.")

    def test_plot_valuation_comparison_saves_file(self):
        """Test that plot_valuation_comparison attempts to save a file if path is provided."""
        ticker = self.sample_valuation_results['ticker']
        plot_filename = f"{ticker}_test_plot.png"
        save_location = os.path.join(TEST_REPORTS_OUTPUT_DIR, plot_filename)

        # Ensure file does not exist before test
        if os.path.exists(save_location):
            os.unlink(save_location)

        try:
            plt.ioff()
            reporting.plot_valuation_comparison(
                ticker=ticker,
                epv_equity=self.sample_valuation_results['epv_equity'],
                market_cap=self.sample_valuation_results['market_cap'],
                asset_value_equity=self.sample_valuation_results['asset_value_equity'],
                currency=self.sample_valuation_results['currency'],
                save_path=save_location
            )
            self.assertTrue(os.path.exists(save_location), f"Plot file should have been saved to {save_location}")
            self.assertGreater(os.path.getsize(save_location), 0, "Saved plot file should not be empty.")
            print(f"test_plot_valuation_comparison_saves_file PASSED (File saved to {save_location}).")
        except Exception as e:
            self.fail(f"plot_valuation_comparison with save_path raised an exception: {e}")
        finally:
            plt.ion()
            plt.close('all')
            # Clean up the created file after test
            # if os.path.exists(save_location):
            #     os.unlink(save_location) # Handled by tearDownClass


if __name__ == '__main__':
    unittest.main() 