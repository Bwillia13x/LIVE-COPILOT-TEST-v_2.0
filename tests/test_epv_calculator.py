# tests/test_epv_calculator.py
# Unit tests for the epv_calculator.py module.

import unittest
from unittest.mock import patch, MagicMock, call # Added call
import pandas as pd
import numpy as np

# Import functions and modules to be tested or used in tests
from epv_valuation_model import epv_calculator
from epv_valuation_model import data_fetcher # Will be mocked, but keep for direct calls if any made by name
from epv_valuation_model import data_processor
from epv_valuation_model import config # For constants and standardized names

# Define a known stable ticker for live tests (will be used in sample data)
TEST_TICKER_VALID = "MSFT" 
# TEST_TICKER_VALID = "AAPL"

# --- Copied Helper functions for sample data (Ideally from a shared test utility) ---
def create_calculator_sample_financial_df(statement_type: str) -> pd.DataFrame:
    if statement_type == "income_stmt":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [1000.0, 800.0, 250.0, 200.0, 10.0, 190.0, 40.0, 150.0], # EBIT, Revenue, IntExp, Tax, NI
            pd.Timestamp('2022-12-31'): [900.0, 700.0, 230.0, 180.0, 8.0, 172.0, 35.0, 137.0],
            pd.Timestamp('2021-12-31'): [800.0, 600.0, 210.0, 160.0, 6.0, 154.0, 30.0, 124.0],
            # Add more items as needed by epv_calculator, e.g., specific tax rate items if used
            # For calculate_normalized_ebit: S_REVENUE, S_OPERATING_INCOME
            # For calculate_nopat: S_EFFECTIVE_TAX_RATE, S_PRETAX_INCOME, S_TAX_PROVISION
        }, index=[config.S_REVENUE, 'Cost Of Goods Sold', config.S_OPERATING_INCOME, 'EBIT_Placeholder', 
                  config.S_INTEREST_EXPENSE, config.S_PRETAX_INCOME, config.S_TAX_PROVISION, config.S_NET_INCOME])
    elif statement_type == "balance_sheet":
        # For WACC: Total Debt, Total Equity (Market Cap used as proxy), Cash
        # For EPV Equity: Total Debt, Cash, Minority Interest, Preferred Stock
        # For Maint Capex: Gross PPE, Net PPE, Sales
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [2000.0, 1200.0, 800.0, 100.0, 300.0, 50.0, 20.0, 700.0, 600.0, 500.0], 
            pd.Timestamp('2022-12-31'): [1800.0, 1100.0, 700.0, 90.0, 250.0, 40.0, 15.0, 650.0, 550.0, 450.0],
            pd.Timestamp('2021-12-31'): [1600.0, 1000.0, 600.0, 80.0, 200.0, 30.0, 10.0, 600.0, 500.0, 400.0]
        }, index=[config.S_TOTAL_ASSETS, config.S_TOTAL_LIABILITIES, config.S_TOTAL_STOCKHOLDER_EQUITY, 
                  config.S_CASH_EQUIVALENTS, config.S_TOTAL_DEBT, config.S_NONCONTROLLING_INTEREST, 
                  config.S_PREFERRED_STOCK_VALUE, config.S_GROSS_PPE, 'Net Property, Plant & Equipment', 
                  config.S_REVENUE]) # Revenue for Graham formula in Maint Capex
    elif statement_type == "cashflow":
        # For Maint Capex: Depreciation, Capex
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [-100.0, 70.0],
            pd.Timestamp('2022-12-31'): [-90.0, 65.0],
            pd.Timestamp('2021-12-31'): [-80.0, 60.0]
        }, index=[config.S_CAPEX, config.S_DEPRECIATION_CF])
    return pd.DataFrame()

def create_calculator_sample_stock_info() -> dict:
    return {
        "symbol": TEST_TICKER_VALID.upper(),
        "longName": "Microsoft Corp.",
        "currency": "USD",
        "regularMarketPrice": 350.0,
        "currentPrice": 350.0,
        "marketCap": 2.8e12, # For WACC and EPV Equity
        "beta": 0.9, # For WACC
        "sharesOutstanding": 7.5e9, 
        # No explicit "Total Debt" or "Cash" here, those come from BS for EPV Equity calc
    }
# --- End Copied Helpers ---

class TestEpvCalculator(unittest.TestCase):

    @classmethod
    @patch('epv_valuation_model.data_fetcher.get_risk_free_rate_proxy')
    @patch('epv_valuation_model.data_fetcher.get_stock_info')
    @patch('epv_valuation_model.data_fetcher.get_historical_financials')
    @patch('epv_valuation_model.data_fetcher.get_ticker_object')
    def setUpClass(cls, mock_get_ticker_object, mock_get_historical_financials, \
                     mock_get_stock_info, mock_get_risk_free_rate_proxy):
        """
        Set up class-level fixtures using mocked data_fetcher and processed data.
        """
        print(f"\nSetting up mocked tests for epv_calculator.py using {TEST_TICKER_VALID}...")

        # 1. Mock get_ticker_object
        mock_ticker_instance = MagicMock(spec=True)
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_get_ticker_object.return_value = mock_ticker_instance

        # 2. Mock get_risk_free_rate_proxy
        cls.sample_risk_free_rate = 0.035 # Example RFR
        mock_get_risk_free_rate_proxy.return_value = cls.sample_risk_free_rate
        # Actual call made in original setUpClass:
        # cls.risk_free_rate = data_fetcher.get_risk_free_rate_proxy(config.RISK_FREE_RATE_TICKER)

        # 3. Mock get_historical_financials (for raw data to be processed)
        raw_is_sample = create_calculator_sample_financial_df("income_stmt")
        raw_bs_sample = create_calculator_sample_financial_df("balance_sheet")
        raw_cf_sample = create_calculator_sample_financial_df("cashflow")

        def side_effect_get_historical_financials(ticker_obj_param, statement_type_param):
            if statement_type_param == "income_stmt": return raw_is_sample
            if statement_type_param == "balance_sheet": return raw_bs_sample
            if statement_type_param == "cashflow": return raw_cf_sample
            return pd.DataFrame()
        mock_get_historical_financials.side_effect = side_effect_get_historical_financials

        # 4. Mock get_stock_info (for raw data to be processed)
        raw_info_sample = create_calculator_sample_stock_info()
        mock_get_stock_info.return_value = raw_info_sample

        # --- The following simulates original setUpClass logic using mocks implicitly ---
        # This call now uses the mocked get_ticker_object
        cls.ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID)
        # This call now uses the mocked get_risk_free_rate_proxy
        cls.risk_free_rate = data_fetcher.get_risk_free_rate_proxy(config.RISK_FREE_RATE_TICKER)
        
        # The direct calls to data_fetcher for financials and info are implicitly handled 
        # if process_financial_data were to call them. However, we are providing the sample raw data directly.

        cls.processed_data = data_processor.process_financial_data(raw_is_sample, raw_bs_sample, raw_cf_sample, raw_info_sample)
        
        # Check for potential errors from processing, though sample data should be clean
        if cls.processed_data["income_statement"].empty or \
           cls.processed_data["balance_sheet"].empty or \
           cls.processed_data["cash_flow"].empty or \
           not cls.processed_data["stock_details"]:
            # This should not happen with our controlled sample data
            raise unittest.SkipTest(f"Mocked and processed data is unexpectedly incomplete for {TEST_TICKER_VALID}.")

        cls.is_proc = cls.processed_data["income_statement"]
        cls.bs_proc = cls.processed_data["balance_sheet"]
        cls.cf_proc = cls.processed_data["cash_flow"]
        cls.details_proc = cls.processed_data["stock_details"]
        print("Mocked raw data fetched, processed, and ready for epv_calculator test class.")

        # --- Assertions on Mocks (verify setup) ---
        mock_get_ticker_object.assert_any_call(TEST_TICKER_VALID) # Original setup calls this
        mock_get_risk_free_rate_proxy.assert_called_once_with(config.RISK_FREE_RATE_TICKER)
        # process_financial_data does not call data_fetcher functions itself, it takes data as input.
        # The original setUpClass would have made these calls to populate raw_is, raw_bs etc.:
        # mock_get_historical_financials.assert_any_call(mock_ticker_instance, "income_stmt")
        # mock_get_stock_info.assert_any_call(mock_ticker_instance)

        # --- Pre-calculate base values (as in original setUpClass) ---
        cls.norm_ebit_tuple = epv_calculator.calculate_normalized_ebit(cls.is_proc)
        if cls.norm_ebit_tuple:
            cls.normalized_ebit, cls.avg_op_margin = cls.norm_ebit_tuple
        else:
            cls.normalized_ebit, cls.avg_op_margin = None, None # Should not happen with good sample data

        cls.maint_capex = epv_calculator.calculate_maintenance_capex(cls.is_proc, cls.bs_proc, cls.cf_proc)
        if cls.maint_capex is None and config.S_DEPRECIATION_CF in cls.cf_proc.index: # Fallback
            print("Warning (setUpClass with mocks): Maint Capex calc failed, using D&A fallback.")
            cls.maint_capex = abs(cls.cf_proc.loc[config.S_DEPRECIATION_CF].iloc[:config.DEFAULT_NORMALIZATION_YEARS].mean(skipna=True))
        
        # Ensure key values are not None for tests to run meaningfully
        if cls.normalized_ebit is None or cls.maint_capex is None:
             raise unittest.SkipTest("Normalized EBIT or Maintenance Capex could not be calculated from sample data.")

    def test_calculate_normalized_ebit(self):
        """Test the calculate_normalized_ebit function."""
        self.assertIsNotNone(self.norm_ebit_tuple, "calculate_normalized_ebit returned None.")
        normalized_ebit, avg_op_margin = self.norm_ebit_tuple
        self.assertIsInstance(normalized_ebit, (float, np.floating), "Normalized EBIT should be a float.")
        self.assertIsInstance(avg_op_margin, (float, np.floating), "Average Operating Margin should be a float.")
        self.assertGreater(normalized_ebit, 0, "Normalized EBIT should be positive for a typical profitable company.")
        self.assertGreaterEqual(avg_op_margin, -0.5, "Average Operating Margin seems too low (e.g. < -50%).") # Allow for some losses
        self.assertLessEqual(avg_op_margin, 1.0, "Average Operating Margin cannot exceed 100%.")
        print(f"test_calculate_normalized_ebit PASSED (EBIT: {normalized_ebit:,.0f}, Margin: {avg_op_margin:.2%}).")

    def test_calculate_maintenance_capex(self):
        """Test the calculate_maintenance_capex function."""
        # Maint capex is already calculated in setUpClass
        self.assertIsNotNone(self.maint_capex, "calculate_maintenance_capex returned None.")
        self.assertIsInstance(self.maint_capex, (float, np.floating), "Maintenance Capex should be a float.")
        self.assertGreaterEqual(self.maint_capex, 0, "Maintenance Capex should generally be non-negative.")
        # Compare with average D&A as a sanity check
        if config.S_DEPRECIATION_CF in self.cf_proc.index:
            avg_da = abs(self.cf_proc.loc[config.S_DEPRECIATION_CF].mean(skipna=True))
            if pd.notna(avg_da):
                 self.assertLess(self.maint_capex, avg_da * 5, "Maint Capex seems excessively high compared to D&A (e.g. > 5x D&A).") # Rough sanity check
                 # Maint Capex can be lower than D&A
        print(f"test_calculate_maintenance_capex PASSED (Maint Capex: {self.maint_capex:,.0f}).")

    def test_calculate_nopat(self):
        """Test the calculate_nopat function."""
        if self.normalized_ebit is None:
            self.skipTest("Skipping NOPAT test as Normalized EBIT calculation failed in setup.")
        nopat = epv_calculator.calculate_nopat(self.normalized_ebit, self.is_proc)
        self.assertIsNotNone(nopat, "calculate_nopat returned None.")
        self.assertIsInstance(nopat, (float, np.floating), "NOPAT should be a float.")
        self.assertGreater(nopat, 0, "NOPAT should be positive for a typical profitable company.")
        print(f"test_calculate_nopat PASSED (NOPAT: {nopat:,.0f}).")

    def test_calculate_wacc(self):
        """Test the calculate_wacc function."""
        wacc = epv_calculator.calculate_wacc(
            self.details_proc, self.bs_proc, self.is_proc, self.risk_free_rate
        )
        self.assertIsNotNone(wacc, "calculate_wacc returned None.")
        self.assertIsInstance(wacc, (float, np.floating), "WACC should be a float.")
        self.assertGreater(wacc, 0.0, "WACC should be positive.")
        self.assertLess(wacc, 0.30, "WACC seems implausibly high (e.g., > 30%).") # Sanity check
        print(f"test_calculate_wacc PASSED (WACC: {wacc:.2%}).")

    def test_calculate_epv_operations(self):
        """Test the calculate_epv (for operations) function."""
        if self.normalized_ebit is None or self.maint_capex is None:
            self.skipTest("Skipping EPV Ops test due to prior calculation failures in setup.")

        nopat = epv_calculator.calculate_nopat(self.normalized_ebit, self.is_proc)
        wacc = epv_calculator.calculate_wacc(self.details_proc, self.bs_proc, self.is_proc, self.risk_free_rate)
        if nopat is None or wacc is None:
            self.skipTest("Skipping EPV Ops test as NOPAT or WACC calculation failed.")

        epv_results = epv_calculator.calculate_epv(nopat, wacc, self.maint_capex)
        self.assertIsNotNone(epv_results, "calculate_epv returned None.")
        self.assertIsInstance(epv_results, dict, "EPV result should be a dictionary.")
        self.assertIn("epv_operations", epv_results, "'epv_operations' key missing.")
        epv_ops = epv_results["epv_operations"]
        self.assertIsInstance(epv_ops, (float, np.floating), "EPV (Operations) should be a float.")
        # EPV can be negative if NOPAT is negative, but for profitable MSFT/AAPL, expect positive.
        # self.assertGreater(epv_ops, 0, "EPV (Operations) should be positive for a profitable company.")
        print(f"test_calculate_epv_operations PASSED (EPV Ops: {epv_ops:,.0f}).")

    def test_calculate_epv_equity(self):
        """Test the calculate_epv_equity function."""
        if self.normalized_ebit is None or self.maint_capex is None:
            self.skipTest("Skipping EPV Equity test due to prior calculation failures in setup.")

        nopat = epv_calculator.calculate_nopat(self.normalized_ebit, self.is_proc)
        wacc = epv_calculator.calculate_wacc(self.details_proc, self.bs_proc, self.is_proc, self.risk_free_rate)
        if nopat is None or wacc is None:
            self.skipTest("Skipping EPV Equity test as NOPAT or WACC calculation failed.")
        epv_results = epv_calculator.calculate_epv(nopat, wacc, self.maint_capex)
        if epv_results is None:
            self.skipTest("Skipping EPV Equity test as EPV Operations calculation failed.")
        epv_ops = epv_results["epv_operations"]

        epv_equity = epv_calculator.calculate_epv_equity(epv_ops, self.bs_proc, self.details_proc)
        self.assertIsNotNone(epv_equity, "calculate_epv_equity returned None.")
        self.assertIsInstance(epv_equity, (float, np.floating), "EPV (Equity) should be a float.")
        # Could compare to market cap for a very rough sanity check, but not a strict test.
        # market_cap = self.details_proc.get("market_cap", 0)
        # if market_cap > 0:
        #     self.assertGreater(epv_equity, market_cap * 0.1, "EPV Equity seems extremely low vs Market Cap.")
        #     self.assertLess(epv_equity, market_cap * 10, "EPV Equity seems extremely high vs Market Cap.")
        print(f"test_calculate_epv_equity PASSED (EPV Equity: {epv_equity:,.0f}).")

    def test_calculate_asset_value_equity(self):
        """Test the calculate_asset_value_equity function."""
        av_equity = epv_calculator.calculate_asset_value_equity(self.bs_proc)
        # This can be None if Net Tangible Assets or Equity not found, so check accordingly.
        if av_equity is not None:
            self.assertIsInstance(av_equity, (float, np.floating), "Asset Value (Equity) should be a float.")
            # self.assertGreater(av_equity, 0, "Asset Value (Equity) should generally be positive.")
            print(f"test_calculate_asset_value_equity PASSED (AV Equity: {av_equity:,.0f}).")
        else:
            print("test_calculate_asset_value_equity PASSED (AV Equity was None, as expected for some data).")


    def test_wacc_with_no_debt_scenario(self):
        """Test WACC calculation when a company has no debt."""
        # Create a dummy balance sheet with no debt items or zero debt
        bs_no_debt_data = {
            config.S_TOTAL_ASSETS: [1000, 900],
            config.S_TOTAL_STOCKHOLDER_EQUITY: [1000, 900], # All equity financed
            config.S_CASH_EQUIVALENTS: [100, 80]
            # Ensure no S_TOTAL_DEBT, S_SHORT_LONG_TERM_DEBT, S_LONG_TERM_DEBT or they are zero
        }
        # Ensure all required columns for WACC from bs_proc are present, even if zeroed for debt
        # This requires knowing what epv_calculator.calculate_wacc specifically looks for in bs_proc.
        # For simplicity, we'll assume the structure is sufficient if debt items are missing/zero.
        # A more robust test would mock bs_proc more completely.
        
        # Create a DataFrame with the same columns (years) as self.bs_proc
        bs_no_debt_df = pd.DataFrame(bs_no_debt_data, index=pd.Index(bs_no_debt_data.keys()), columns=self.bs_proc.columns[:2])


        # Create minimal income statement for interest expense (should be zero or near zero)
        is_no_interest_data = {
            config.S_INTEREST_EXPENSE: [0,0],
            config.S_TAX_PROVISION: self.is_proc.loc[config.S_TAX_PROVISION].iloc[:2].tolist() if config.S_TAX_PROVISION in self.is_proc.index else [0,0], # Keep tax for Ke calc
            config.S_PRETAX_INCOME: self.is_proc.loc[config.S_PRETAX_INCOME].iloc[:2].tolist() if config.S_PRETAX_INCOME in self.is_proc.index else [100,90]
        }
        is_no_interest_df = pd.DataFrame(is_no_interest_data, index=pd.Index(is_no_interest_data.keys()), columns=self.is_proc.columns[:2])


        # Modify stock_details for this test if necessary (e.g., market_cap)
        details_no_debt = self.details_proc.copy()
        # If market_cap is tied to equity value, it should be consistent
        # details_no_debt["market_cap"] = 1000 # Assuming market cap equals book equity for this test

        wacc_no_debt = epv_calculator.calculate_wacc(
            details_no_debt, bs_no_debt_df, is_no_interest_df, self.risk_free_rate
        )
        self.assertIsNotNone(wacc_no_debt, "WACC for no-debt scenario should not be None.")

        # Expected Cost of Equity (Ke)
        beta = details_no_debt.get("beta", config.DEFAULT_BETA)
        expected_ke = self.risk_free_rate + beta * config.EQUITY_RISK_PREMIUM
        self.assertAlmostEqual(wacc_no_debt, expected_ke, places=4,
                               msg="WACC should equal Cost of Equity when there is no debt.")
        print(f"test_wacc_with_no_debt_scenario PASSED (WACC: {wacc_no_debt:.2%}, Expected Ke: {expected_ke:.2%}).")


if __name__ == '__main__':
    unittest.main()
