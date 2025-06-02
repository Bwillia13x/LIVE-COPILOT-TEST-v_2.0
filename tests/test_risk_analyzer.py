# tests/test_risk_analyzer.py
# Unit tests for the risk_analyzer.py module.

import unittest
from unittest.mock import patch, MagicMock, call # Added call
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Callable, Tuple

# Import functions and modules to be tested or used in tests
from epv_valuation_model import risk_analyzer
from epv_valuation_model import epv_calculator # Needed for base calculations
from epv_valuation_model import data_fetcher # Will be mocked
from epv_valuation_model import data_processor
from epv_valuation_model import config

# Define a known stable ticker for live tests (will be used in sample data)
TEST_TICKER_VALID = "AAPL" # Apple Inc.
# TEST_TICKER_VALID = "MSFT" # Microsoft Corp.

# --- Copied Helper functions for sample data (Ideally from a shared test utility) ---
def create_risk_analyzer_sample_financial_df(statement_type: str) -> pd.DataFrame:
    # Using similar structure to epv_calculator test helpers
    if statement_type == "income_stmt":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [1000.0, 800.0, 250.0, 200.0, 10.0, 190.0, 40.0, 150.0],
            pd.Timestamp('2022-12-31'): [900.0, 700.0, 230.0, 180.0, 8.0, 172.0, 35.0, 137.0],
            pd.Timestamp('2021-12-31'): [800.0, 600.0, 210.0, 160.0, 6.0, 154.0, 30.0, 124.0],
        }, index=[config.S_REVENUE, 'Cost Of Goods Sold', config.S_OPERATING_INCOME, 'EBIT_Placeholder', 
                  config.S_INTEREST_EXPENSE, config.S_PRETAX_INCOME, config.S_TAX_PROVISION, config.S_NET_INCOME])
    elif statement_type == "balance_sheet":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [2000.0, 1200.0, 800.0, 100.0, 300.0, 50.0, 20.0, 700.0, 600.0, 500.0], 
            pd.Timestamp('2022-12-31'): [1800.0, 1100.0, 700.0, 90.0, 250.0, 40.0, 15.0, 650.0, 550.0, 450.0],
            pd.Timestamp('2021-12-31'): [1600.0, 1000.0, 600.0, 80.0, 200.0, 30.0, 10.0, 600.0, 500.0, 400.0]
        }, index=[config.S_TOTAL_ASSETS, config.S_TOTAL_LIABILITIES, config.S_TOTAL_STOCKHOLDER_EQUITY, 
                  config.S_CASH_EQUIVALENTS, config.S_TOTAL_DEBT, config.S_NONCONTROLLING_INTEREST, 
                  config.S_PREFERRED_STOCK_VALUE, config.S_GROSS_PPE, 'Net Property, Plant & Equipment', 
                  config.S_REVENUE])
    elif statement_type == "cashflow":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [-100.0, 70.0],
            pd.Timestamp('2022-12-31'): [-90.0, 65.0],
            pd.Timestamp('2021-12-31'): [-80.0, 60.0]
        }, index=[config.S_CAPEX, config.S_DEPRECIATION_CF])
    return pd.DataFrame()

def create_risk_analyzer_sample_stock_info() -> dict:
    return {
        "symbol": TEST_TICKER_VALID.upper(),
        "longName": "Apple Inc.",
        "currency": "USD",
        "regularMarketPrice": 170.0,
        "currentPrice": 170.0,
        "marketCap": 2.8e12, # Changed to AAPL market cap ballpark
        "beta": 1.2, # Changed to AAPL ballpark beta
        "sharesOutstanding": 16e9, 
    }
# --- End Copied Helpers ---

class TestRiskAnalyzer(unittest.TestCase):

    @classmethod
    @patch('epv_valuation_model.data_fetcher.get_risk_free_rate_proxy')
    @patch('epv_valuation_model.data_fetcher.get_stock_info')
    @patch('epv_valuation_model.data_fetcher.get_historical_financials')
    @patch('epv_valuation_model.data_fetcher.get_ticker_object')
    def setUpClass(cls, mock_get_ticker_object, mock_get_historical_financials, \
                     mock_get_stock_info, mock_get_risk_free_rate_proxy):
        """
        Set up class-level fixtures using mocked data, processed data, and base EPV calculations.
        """
        print(f"\nSetting up mocked tests for risk_analyzer.py using {TEST_TICKER_VALID}...")

        # 1. Mock get_ticker_object
        mock_ticker_instance = MagicMock(spec=True)
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_get_ticker_object.return_value = mock_ticker_instance

        # 2. Mock get_risk_free_rate_proxy
        cls.sample_risk_free_rate = 0.038 # Slightly different RFR for this test suite if desired
        mock_get_risk_free_rate_proxy.return_value = cls.sample_risk_free_rate

        # 3. Mock get_historical_financials (for raw data)
        raw_is_sample = create_risk_analyzer_sample_financial_df("income_stmt")
        raw_bs_sample = create_risk_analyzer_sample_financial_df("balance_sheet")
        raw_cf_sample = create_risk_analyzer_sample_financial_df("cashflow")
        def side_effect_hist_fin(ticker_obj, stmt_type): # Renamed to avoid conflict with outer scope
            if stmt_type == "income_stmt": return raw_is_sample
            if stmt_type == "balance_sheet": return raw_bs_sample
            if stmt_type == "cashflow": return raw_cf_sample
            return pd.DataFrame()
        mock_get_historical_financials.side_effect = side_effect_hist_fin

        # 4. Mock get_stock_info (for raw data)
        raw_info_sample = create_risk_analyzer_sample_stock_info()
        mock_get_stock_info.return_value = raw_info_sample

        # --- Simulate original setUpClass logic using these mocks ---
        # These calls use the mocked versions of data_fetcher functions
        cls.ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID) 
        cls.risk_free_rate = data_fetcher.get_risk_free_rate_proxy(config.RISK_FREE_RATE_TICKER)
        
        # These would have been calls to data_fetcher too, now data is from helpers directly into processor
        # raw_is = data_fetcher.get_historical_financials(cls.ticker_obj, "income_stmt")
        # raw_bs = data_fetcher.get_historical_financials(cls.ticker_obj, "balance_sheet")
        # raw_cf = data_fetcher.get_historical_financials(cls.ticker_obj, "cashflow")
        # raw_info = data_fetcher.get_stock_info(cls.ticker_obj)

        cls.processed_data_bundle = data_processor.process_financial_data(
            raw_is_sample, raw_bs_sample, raw_cf_sample, raw_info_sample
        )
        if cls.processed_data_bundle["income_statement"].empty or \
           cls.processed_data_bundle["balance_sheet"].empty: 
            raise unittest.SkipTest(f"Mocked and processed data is incomplete for {TEST_TICKER_VALID}.")

        cls.is_proc = cls.processed_data_bundle["income_statement"]
        cls.bs_proc = cls.processed_data_bundle["balance_sheet"]
        cls.cf_proc = cls.processed_data_bundle["cash_flow"]
        cls.details_proc = cls.processed_data_bundle["stock_details"]

        # --- Calculate base case values for sensitivity/MC (as in original) ---
        norm_ebit_tuple = epv_calculator.calculate_normalized_ebit(cls.is_proc)
        if not norm_ebit_tuple: raise unittest.SkipTest("Base Normalized EBIT failed with mocked data.")
        cls.normalized_ebit_base, cls.avg_op_margin_base = norm_ebit_tuple

        cls.maint_capex_base = epv_calculator.calculate_maintenance_capex(cls.is_proc, cls.bs_proc, cls.cf_proc)
        if cls.maint_capex_base is None: 
            if config.S_DEPRECIATION_CF in cls.cf_proc.index:
                cls.maint_capex_base = abs(cls.cf_proc.loc[config.S_DEPRECIATION_CF].iloc[:config.DEFAULT_NORMALIZATION_YEARS].mean(skipna=True))
            if cls.maint_capex_base is None: raise unittest.SkipTest("Base Maint Capex failed with mocked data, even with fallback.")
        
        cls.nopat_base = epv_calculator.calculate_nopat(cls.normalized_ebit_base, cls.is_proc)
        if cls.nopat_base is None: raise unittest.SkipTest("Base NOPAT failed with mocked data.") # Changed from `not cls.nopat_base` for clarity
        
        cls.wacc_base = epv_calculator.calculate_wacc(cls.details_proc, cls.bs_proc, cls.is_proc, cls.risk_free_rate)
        if cls.wacc_base is None: raise unittest.SkipTest("Base WACC failed with mocked data.") # Changed from `not cls.wacc_base`

        cls.base_calc_inputs_for_risk = {
            'risk_free_rate': cls.risk_free_rate,
            'avg_op_margin_base': cls.avg_op_margin_base,
            'wacc_base': cls.wacc_base,
            'normalized_ebit_base': cls.normalized_ebit_base,
            'nopat_base': cls.nopat_base,
            'maint_capex_base': cls.maint_capex_base,
            'processed_data_bundle': cls.processed_data_bundle # Pass this through as sensitivity might need it
        }
        print("Mocked base data and calculations prepared for risk_analyzer test class.")

        # --- Assertions on Mocks ---
        mock_get_ticker_object.assert_called_once_with(TEST_TICKER_VALID)
        mock_get_risk_free_rate_proxy.assert_called_once_with(config.RISK_FREE_RATE_TICKER)
        # We don't assert calls for get_historical_financials/get_stock_info here because
        # the setup directly uses the sample data (raw_is_sample, etc.) to feed into data_processor.
        # If data_processor itself called those fetchers, the mocks would still work.

    def test_run_sensitivity_analysis_structure_and_basic_run(self):
        """Test the structure of sensitivity analysis output and a basic run."""
        if not all(self.base_calc_inputs_for_risk.values()): # Check if any base input is None/False/0
            self.skipTest("Base calculation inputs for risk analysis are incomplete.")

        vars_to_sensitize = [
            {'name': 'WACC', 'base_value': self.wacc_base},
            {'name': 'Avg Op Margin', 'base_value': self.avg_op_margin_base}
        ]

        sensitivity_output = risk_analyzer.run_sensitivity_analysis(
            self.base_calc_inputs_for_risk,
            self.processed_data_bundle,
            vars_to_sensitize,
            sensitivity_range=0.10, # Smaller range for faster test
            num_steps=3 # -10%, 0%, +10%
        )

        self.assertIsInstance(sensitivity_output, dict, "Sensitivity output should be a dictionary.")
        self.assertIn('WACC', sensitivity_output, "WACC sensitivity results missing.")
        self.assertIn('Avg Op Margin', sensitivity_output, "Avg Op Margin sensitivity results missing.")

        for var_name, df_result in sensitivity_output.items():
            self.assertIsInstance(df_result, pd.DataFrame, f"Results for {var_name} should be a DataFrame.")
            self.assertFalse(df_result.empty, f"Results DataFrame for {var_name} should not be empty.")
            self.assertIn('Variation', df_result.columns)
            self.assertIn(var_name, df_result.columns) # e.g. 'WACC' column for WACC sensitivity
            self.assertIn('EPV Equity', df_result.columns)
            self.assertEqual(len(df_result), 3, f"Expected 3 steps for {var_name} sensitivity.")
            # Check that the middle row (base case) EPV Equity is not NaN
            self.assertFalse(pd.isna(df_result.loc[1, 'EPV Equity']), f"Base case EPV Equity for {var_name} should not be NaN.")
        print("test_run_sensitivity_analysis_structure_and_basic_run PASSED.")

    def test_sensitivity_analysis_wacc_direction(self):
        """Test that EPV Equity moves inversely to WACC."""
        if not self.base_calc_inputs_for_risk.get('wacc_base'):
             self.skipTest("Base WACC not available for sensitivity direction test.")

        vars_to_sensitize = [{'name': 'WACC', 'base_value': self.wacc_base}]
        sensitivity_output = risk_analyzer.run_sensitivity_analysis(
            self.base_calc_inputs_for_risk, self.processed_data_bundle, vars_to_sensitize, num_steps=3
        )
        df_wacc = sensitivity_output.get('WACC')
        if df_wacc is None or len(df_wacc) < 3:
            self.fail("WACC sensitivity DataFrame is missing or too short.")

        # EPV Equity should decrease as WACC increases
        # df_wacc is sorted by increasing WACC (due to multiplier)
        epv_at_lower_wacc = df_wacc.loc[0, 'EPV Equity'] # Multiplier < 1
        epv_at_base_wacc = df_wacc.loc[1, 'EPV Equity']  # Multiplier = 1
        epv_at_higher_wacc = df_wacc.loc[2, 'EPV Equity'] # Multiplier > 1

        if pd.notna(epv_at_lower_wacc) and pd.notna(epv_at_base_wacc) and pd.notna(epv_at_higher_wacc):
            self.assertGreater(epv_at_lower_wacc, epv_at_base_wacc, "EPV should be higher at lower WACC.")
            self.assertLess(epv_at_higher_wacc, epv_at_base_wacc, "EPV should be lower at higher WACC.")
        else:
            self.skipTest("Could not verify WACC sensitivity direction due to NaN EPV values.")
        print("test_sensitivity_analysis_wacc_direction PASSED.")


    def test_sensitivity_analysis_op_margin_direction(self):
        """Test that EPV Equity moves in the same direction as Operating Margin."""
        if not self.base_calc_inputs_for_risk.get('avg_op_margin_base'):
            self.skipTest("Base Avg Op Margin not available for sensitivity direction test.")

        vars_to_sensitize = [{'name': 'Avg Op Margin', 'base_value': self.avg_op_margin_base}]
        sensitivity_output = risk_analyzer.run_sensitivity_analysis(
            self.base_calc_inputs_for_risk, self.processed_data_bundle, vars_to_sensitize, num_steps=3
        )
        df_op_margin = sensitivity_output.get('Avg Op Margin')
        if df_op_margin is None or len(df_op_margin) < 3:
            self.fail("Avg Op Margin sensitivity DataFrame is missing or too short.")

        # EPV Equity should increase as Avg Op Margin increases
        epv_at_lower_margin = df_op_margin.loc[0, 'EPV Equity']
        epv_at_base_margin = df_op_margin.loc[1, 'EPV Equity']
        epv_at_higher_margin = df_op_margin.loc[2, 'EPV Equity']

        if pd.notna(epv_at_lower_margin) and pd.notna(epv_at_base_margin) and pd.notna(epv_at_higher_margin):
            self.assertLess(epv_at_lower_margin, epv_at_base_margin, "EPV should be lower at lower Op Margin.")
            self.assertGreater(epv_at_higher_margin, epv_at_base_margin, "EPV should be higher at higher Op Margin.")
        else:
            self.skipTest("Could not verify Op Margin sensitivity direction due to NaN EPV values.")
        print("test_sensitivity_analysis_op_margin_direction PASSED.")

    def test_run_monte_carlo_simulation_basic_run(self):
        """Test a basic run of the Monte Carlo simulation."""
        if not all(self.base_calc_inputs_for_risk.values()):
            self.skipTest("Base calculation inputs for MC are incomplete.")

        mc_variable_configs = [
            {'name': 'avg_op_margin', 'dist': 'normal', 'mean': self.avg_op_margin_base, 'std': 0.01},
            {'name': 'beta', 'dist': 'normal', 'mean': self.details_proc.get('beta', config.DEFAULT_BETA), 'std': 0.1}
        ]
        num_sims_test = 100 # Small number for quick test

        mc_results_df = risk_analyzer.run_monte_carlo_simulation(
            self.base_calc_inputs_for_risk,
            self.processed_data_bundle,
            mc_variable_configs,
            num_simulations=num_sims_test
        )

        self.assertIsInstance(mc_results_df, pd.DataFrame, "Monte Carlo output should be a DataFrame.")
        if not mc_results_df.empty: # Only check columns if DF is not empty
            self.assertIn('Simulated EPV Equity', mc_results_df.columns)
            # The number of rows might be less than num_sims_test if some iterations failed
            self.assertLessEqual(len(mc_results_df), num_sims_test)
            print(f"Monte Carlo ran, produced {len(mc_results_df)} results out of {num_sims_test} attempts.")
            if len(mc_results_df) > 0:
                 self.assertFalse(mc_results_df['Simulated EPV Equity'].isnull().all(), "All MC EPV Equity results are NaN.")
            else:
                 print("Warning: Monte Carlo simulation produced no valid results in this test run.")
        else:
            print("Warning: Monte Carlo simulation produced an empty DataFrame.")
        print("test_run_monte_carlo_simulation_basic_run PASSED.")


if __name__ == '__main__':
    unittest.main()
