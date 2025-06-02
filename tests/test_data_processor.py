# tests/test_data_processor.py
# Unit tests for the data_processor.py module.

import unittest
from unittest.mock import patch, MagicMock, call # Added call
import pandas as pd
import numpy as np # For np.nan

# Import functions and modules to be tested or used in tests
from epv_valuation_model import data_processor
from epv_valuation_model import data_fetcher # Re-enable import
from epv_valuation_model import config     # For standardized names and configs

# Define a known stable ticker for live tests (will be used in sample data)
TEST_TICKER_VALID = "AAPL" 

# Helper to create a sample financial statement DataFrame (similar to test_data_fetcher)
def create_processor_sample_financial_df(statement_type: str) -> pd.DataFrame:
    # More detailed sample data might be needed to properly test processing logic
    if statement_type == "income_stmt":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [1000, 800, 600, 200, 50, 150, 10, 5], # Added more items
            pd.Timestamp('2022-12-31'): [900, 700, 500, 180, 40, 140, 8, 4],
            pd.Timestamp('2021-12-31'): [800, 600, 400, 160, 30, 130, 6, 2]
        }, index=['Total Revenue', 'Cost Of Revenue', 'Gross Profit', 
                  'Operating Income', 'Interest Expense', 'Income Before Tax', 
                  'Income Tax Expense', 'Net Income'])
    elif statement_type == "balance_sheet":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [2000, 1000, 1000, 100, 500, 300],
            pd.Timestamp('2022-12-31'): [1800, 900, 900, 90, 450, 250],
            pd.Timestamp('2021-12-31'): [1600, 800, 800, 80, 400, 200]
        }, index=['Total Assets', 'Total Liab', 'Total Stockholder Equity', 
                  'Cash And Cash Equivalents', 'Property Plant And Equipment Gross', 
                  'Total Debt'])
    elif statement_type == "cashflow":
        return pd.DataFrame({
            pd.Timestamp('2023-12-31'): [-100, 50, 150, 20],
            pd.Timestamp('2022-12-31'): [-90, 45, 140, 18],
            pd.Timestamp('2021-12-31'): [-80, 40, 130, 16]
        }, index=['Capital Expenditures', 'Depreciation', 'Net Income', 'Change In Cash'])
    return pd.DataFrame()

def create_sample_stock_info() -> dict:
    return {
        "symbol": TEST_TICKER_VALID.upper(),
        "longName": "Apple Inc.",
        "currency": "USD",
        "regularMarketPrice": 170.0,
        "currentPrice": 170.0, # ensure currentPrice is available
        "marketCap": 2.5e12,
        "beta": 1.2,
        "sharesOutstanding": 15e9, # Example shares
        "enterpriseValue": 2.6e12,
        # Add other fields that data_processor might use or pass through
    }

class TestDataProcessor(unittest.TestCase):

    @classmethod
    @patch('epv_valuation_model.data_fetcher.get_stock_info')
    @patch('epv_valuation_model.data_fetcher.get_historical_financials')
    @patch('epv_valuation_model.data_fetcher.get_ticker_object')
    def setUpClass(cls, mock_get_ticker_object, mock_get_historical_financials, mock_get_stock_info):
        """
        Set up class-level fixtures using mocked data_fetcher functions.
        """
        print(f"\nSetting up mocked tests for data_processor.py using {TEST_TICKER_VALID}...")

        # 1. Configure mock for get_ticker_object
        mock_ticker_instance = MagicMock(spec=True) # A generic mock for the ticker object
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_get_ticker_object.return_value = mock_ticker_instance
        
        # 2. Configure mock for get_historical_financials
        # This mock needs to return different data based on the statement_type argument
        cls.sample_raw_is = create_processor_sample_financial_df("income_stmt")
        cls.sample_raw_bs = create_processor_sample_financial_df("balance_sheet")
        cls.sample_raw_cf = create_processor_sample_financial_df("cashflow")

        def side_effect_get_historical_financials(ticker_obj_param, statement_type_param):
            if statement_type_param == "income_stmt":
                return cls.sample_raw_is
            elif statement_type_param == "balance_sheet":
                return cls.sample_raw_bs
            elif statement_type_param == "cashflow":
                return cls.sample_raw_cf
            return pd.DataFrame() # Default empty for unknown types
        
        mock_get_historical_financials.side_effect = side_effect_get_historical_financials

        # 3. Configure mock for get_stock_info
        cls.sample_raw_info = create_sample_stock_info()
        mock_get_stock_info.return_value = cls.sample_raw_info

        # These lines now use the mocked functions implicitly
        cls.ticker_obj_for_setup = data_fetcher.get_ticker_object(TEST_TICKER_VALID) # Will get mock_ticker_instance
        
        # The original code passed cls.ticker_obj to these, we do the same.
        # The mock_get_historical_financials and mock_get_stock_info will use their configured return values/side_effects.
        
        # The following direct calls to data_fetcher inside setUpClass are now effectively
        # calling our top-level patched mocks. We don't need to re-assign to cls.raw_is etc.
        # because they are already set from create_processor_sample_financial_df above.
        # However, the processor itself takes the direct outputs.
        
        # Let's ensure the process_financial_data gets the data from our class attributes
        # that were populated by create_processor_sample_financial_df and create_sample_stock_info.

        cls.processed_data_bundle = data_processor.process_financial_data(
            cls.sample_raw_is, 
            cls.sample_raw_bs, 
            cls.sample_raw_cf, 
            cls.sample_raw_info
        )
        print("Mocked raw data prepared and processed for test class.")
        
        # Assert that mocks were called (optional, but good for verifying setup)
        mock_get_ticker_object.assert_called_once_with(TEST_TICKER_VALID)
        # Check calls for get_historical_financials (will be called by data_processor if not by setup)
        # The original setUpClass called them directly. If data_processor also calls them, these asserts might need adjustment.
        # For now, we assume the processor takes the DataFrames directly.
        # If data_processor itself calls data_fetcher.get_historical_financials, these mocks would catch that.
        # The original setUpClass was:
        # cls.raw_is = data_fetcher.get_historical_financials(cls.ticker_obj, "income_stmt")
        # etc.
        # So we can check these calls.
        expected_financial_calls = [
            call(mock_ticker_instance, "income_stmt"), # These calls are NOT made if processor takes DFs directly
            call(mock_ticker_instance, "balance_sheet"),
            call(mock_ticker_instance, "cashflow")
        ]
        # mock_get_historical_financials.assert_has_calls(expected_financial_calls, any_order=True) # This will fail if processor gets DFs directly.
                                                                                                   # For now, we are providing DFs directly to processor.
        
        # mock_get_stock_info.assert_called_once_with(mock_ticker_instance) # Same as above.

    def test_process_financial_data_structure(self):
        """Test the overall structure of the output from process_financial_data."""
        self.assertIsInstance(self.processed_data_bundle, dict, "Processed data should be a dictionary.")
        expected_keys = ["income_statement", "balance_sheet", "cash_flow", "stock_details", "errors"]
        for key in expected_keys:
            self.assertIn(key, self.processed_data_bundle, f"Key '{key}' missing in processed data.")

        self.assertIsInstance(self.processed_data_bundle["income_statement"], pd.DataFrame)
        self.assertIsInstance(self.processed_data_bundle["balance_sheet"], pd.DataFrame)
        self.assertIsInstance(self.processed_data_bundle["cash_flow"], pd.DataFrame)
        self.assertIsInstance(self.processed_data_bundle["stock_details"], dict)
        self.assertIsInstance(self.processed_data_bundle["errors"], list)
        print("test_process_financial_data_structure PASSED.")

    def test_processed_financial_statement_columns_and_sorting(self):
        """Test that financial statement columns are integer years and sorted descending."""
        for stmt_type in ["income_statement", "balance_sheet", "cash_flow"]:
            df = self.processed_data_bundle[stmt_type]
            if not df.empty: # Only test if DataFrame is not empty
                self.assertTrue(all(isinstance(col, (int, np.integer)) for col in df.columns),
                                f"Columns in {stmt_type} should be integer years.")
                # Check if columns are sorted in descending order
                self.assertTrue(all(df.columns[i] >= df.columns[i+1] for i in range(len(df.columns)-1)),
                                f"Columns in {stmt_type} should be sorted in descending order (most recent year first).")
        print("test_processed_financial_statement_columns_and_sorting PASSED.")

    def test_processed_financial_statement_data_numeric(self):
        """Test that data in processed financial statements is numeric (or NaN)."""
        for stmt_type in ["income_statement", "balance_sheet", "cash_flow"]:
            df = self.processed_data_bundle[stmt_type]
            if not df.empty:
                for col in df.columns:
                    # Check if the dtype is numeric (float or int)
                    # Note: pd.to_numeric(errors='coerce') makes non-convertible to NaN (float)
                    self.assertTrue(pd.api.types.is_numeric_dtype(df[col]),
                                    f"Data in column '{col}' of {stmt_type} should be numeric.")
        print("test_processed_financial_statement_data_numeric PASSED.")

    def test_standardization_of_income_statement_items(self):
        """Test that key income statement items are standardized to config names."""
        income_stmt = self.processed_data_bundle["income_statement"]
        if income_stmt.empty:
            self.skipTest("Processed income statement is empty, cannot test standardization.")

        # Check for a few key standardized names from config.py
        expected_items = [
            config.S_REVENUE,
            config.S_OPERATING_INCOME,
            config.S_NET_INCOME,
            config.S_INTEREST_EXPENSE,
            config.S_TAX_PROVISION,
            config.S_DEPRECIATION_AMORTIZATION_IS # As defined in config
        ]
        found_count = 0
        for item in expected_items:
            if item in income_stmt.index:
                found_count +=1
                print(f"  Found standardized IS item: {item}")
            # else: # Optional: print if not found for debugging during test writing
            #     print(f"  NOTE: Standardized IS item '{item}' NOT found in processed index.")

        # We expect most of these to be found for a major company like AAPL/MSFT
        self.assertGreater(found_count, len(expected_items) // 2,
                           "Less than half of expected standardized income statement items were found. Check mappings.")
        print("test_standardization_of_income_statement_items PASSED (partially, check logs for specific items).")


    def test_standardization_of_balance_sheet_items(self):
        """Test that key balance sheet items are standardized to config names."""
        balance_sheet = self.processed_data_bundle["balance_sheet"]
        if balance_sheet.empty:
            self.skipTest("Processed balance sheet is empty, cannot test standardization.")

        expected_items = [
            config.S_TOTAL_ASSETS,
            config.S_TOTAL_LIABILITIES,
            config.S_TOTAL_STOCKHOLDER_EQUITY,
            config.S_CASH_EQUIVALENTS,
            config.S_GROSS_PPE, # Or S_NET_PPE if Gross is not consistently available/mapped
            config.S_SHORT_LONG_TERM_DEBT, # Or S_TOTAL_DEBT or S_LONG_TERM_DEBT
        ]
        found_count = 0
        for item in expected_items:
            if item in balance_sheet.index:
                found_count +=1
                print(f"  Found standardized BS item: {item}")
            elif item == config.S_GROSS_PPE and config.S_NET_PPE in balance_sheet.index: # Check fallback
                found_count +=1
                print(f"  Found standardized BS item (fallback): {config.S_NET_PPE}")
            # else:
            #     print(f"  NOTE: Standardized BS item '{item}' NOT found in processed index.")

        self.assertGreater(found_count, len(expected_items) // 2,
                           "Less than half of expected standardized balance sheet items were found. Check mappings.")
        print("test_standardization_of_balance_sheet_items PASSED (partially, check logs for specific items).")


    def test_standardization_of_cash_flow_items(self):
        """Test that key cash flow items are standardized to config names."""
        cash_flow = self.processed_data_bundle["cash_flow"]
        if cash_flow.empty:
            self.skipTest("Processed cash flow statement is empty, cannot test standardization.")

        expected_items = [
            config.S_CAPEX,
            config.S_DEPRECIATION_CF, # As defined in config for Cash Flow D&A
            config.S_NET_INCOME, # Often appears on CF statement
            config.S_CHANGE_IN_CASH
        ]
        found_count = 0
        for item in expected_items:
            if item in cash_flow.index:
                found_count +=1
                print(f"  Found standardized CF item: {item}")
            # else:
            #     print(f"  NOTE: Standardized CF item '{item}' NOT found in processed index.")
        self.assertGreater(found_count, len(expected_items) // 2,
                           "Less than half of expected standardized cash flow items were found. Check mappings.")
        print("test_standardization_of_cash_flow_items PASSED (partially, check logs for specific items).")

    def test_processed_stock_details(self):
        """Test the structure and content of processed stock_details."""
        stock_details = self.processed_data_bundle["stock_details"]
        self.assertIsInstance(stock_details, dict)
        self.assertGreater(len(stock_details), 0, "Stock details should not be empty.")

        self.assertEqual(stock_details.get("ticker"), TEST_TICKER_VALID.upper())
        self.assertIn("current_price", stock_details)
        self.assertIsNotNone(stock_details.get("current_price"), "Current price should be present.")
        self.assertIn("market_cap", stock_details)
        self.assertIn("currency", stock_details)
        # Beta can sometimes be None, so we don't assertIsNotNone for it always
        self.assertIn("beta", stock_details)
        print("test_processed_stock_details PASSED.")

    def test_process_financial_data_with_empty_inputs(self):
        """Test process_financial_data with empty DataFrames as input."""
        empty_df = pd.DataFrame()
        empty_info = {}
        processed_empty = data_processor.process_financial_data(empty_df, empty_df, empty_df, empty_info)

        self.assertTrue(processed_empty["income_statement"].empty)
        self.assertTrue(processed_empty["balance_sheet"].empty)
        self.assertTrue(processed_empty["cash_flow"].empty)
        self.assertEqual(len(processed_empty["stock_details"]), 0) # Expect empty dict
        self.assertGreater(len(processed_empty["errors"]), 0, "Should log errors for empty inputs.")
        print("test_process_financial_data_with_empty_inputs PASSED.")

    # Example of how you might test _standardize_df_index directly (optional)
    # def test_standardize_df_index_direct(self):
    #     """Directly test the _standardize_df_index helper function."""
    #     sample_raw_data = {"Total Revenue": [100, 200], "operating income": [10, 20], "Unmapped Item": [1,2]}
    #     sample_df = pd.DataFrame.from_dict(sample_raw_data, orient='index', columns=[2023, 2022])
    #     mapping = {"totalrevenue": config.S_REVENUE, "operatingincome": config.S_OPERATING_INCOME}
        
    #     standardized_df = data_processor._standardize_df_index(sample_df, mapping)
        
    #     self.assertIn(config.S_REVENUE, standardized_df.index)
    #     self.assertIn(config.S_OPERATING_INCOME, standardized_df.index)
    #     self.assertIn("Unmapped Item", standardized_df.index) # Check if unmapped items are preserved
    #     self.assertEqual(standardized_df.loc[config.S_REVENUE, 2023], 100)
    #     print("test_standardize_df_index_direct PASSED.")


if __name__ == '__main__':
    unittest.main()
