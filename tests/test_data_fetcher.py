# tests/test_data_fetcher.py
# Unit tests for the data_fetcher.py module.

import unittest
from unittest.mock import patch, MagicMock
import pandas as pd
import yfinance as yf # For type checking primarily

# Import functions to be tested
from epv_valuation_model import data_fetcher
from epv_valuation_model import config # For RISK_FREE_RATE_TICKER if needed

# Define a known stable ticker for live tests
# Using a ticker from config might be good if we define one for testing there
TEST_TICKER_VALID = "MSFT" # Microsoft, generally stable data
TEST_TICKER_INVALID = "NONEXISTENTTICKERXYZ123"
RISK_FREE_RATE_PROXY_TICKER = config.RISK_FREE_RATE_TICKER # e.g., "^TNX"

# Helper to create a sample financial statement DataFrame
def create_sample_financial_df() -> pd.DataFrame:
    return pd.DataFrame({
        '2023-01-01': [100, 200, 50],
        '2022-01-01': [90, 180, 45]
    }, index=['Total Revenue', 'Operating Income', 'Net Income']) # Example rows

class TestDataFetcher(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """
        Set up any class-level fixtures.
        For example, fetch a ticker object once if many tests use it.
        However, for yfinance, it might be better to get fresh objects in tests
        to avoid state issues, or mock responses.
        For now, we'll fetch in individual tests where needed.
        """
        print(f"\nStarting tests for data_fetcher.py using {TEST_TICKER_VALID}...")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_ticker_object_valid(self, mock_yfinance_ticker_class):
        """Test fetching a Ticker object for a valid symbol with mocking."""
        # Configure the mock Ticker *instance*
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        
        # Mock the .history() method to return a non-empty DataFrame
        mock_history_df = pd.DataFrame({'Close': [100]}) 
        mock_ticker_instance.history.return_value = mock_history_df

        # Configure the mock Ticker *class* to return our instance
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID)
        
        mock_yfinance_ticker_class.assert_called_once_with(TEST_TICKER_VALID)
        self.assertIsNotNone(ticker_obj, f"Ticker object for {TEST_TICKER_VALID} should not be None.")
        self.assertIsInstance(ticker_obj, MagicMock) # It's our mock instance
        self.assertEqual(ticker_obj.ticker, TEST_TICKER_VALID.upper(), "Ticker symbol mismatch.")
        # Verify that history was called as expected by the function under test
        mock_ticker_instance.history.assert_called_once_with(period="1d")
        print(f"test_get_ticker_object_valid for {TEST_TICKER_VALID} PASSED (mocked).")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_ticker_object_invalid(self, mock_yfinance_ticker_class):
        """Test fetching a Ticker object for an invalid symbol with mocking."""
        # Configure the mock Ticker *instance*
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_INVALID.upper()

        # Mock the .history() method to return an empty DataFrame
        mock_empty_df = pd.DataFrame()
        mock_ticker_instance.history.return_value = mock_empty_df
        
        # Configure the mock Ticker *class* to return our instance
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_INVALID)

        mock_yfinance_ticker_class.assert_called_once_with(TEST_TICKER_INVALID)
        self.assertIsNone(ticker_obj, f"Ticker object for {TEST_TICKER_INVALID} should be None (mocked).")
        # Verify that history was called
        mock_ticker_instance.history.assert_called_once_with(period="1d")
        print(f"test_get_ticker_object_invalid for {TEST_TICKER_INVALID} PASSED (mocked).")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_stock_info_valid_ticker(self, mock_yfinance_ticker_class):
        """Test fetching stock info for a valid ticker with mocking."""
        # --- Mock setup for get_ticker_object part ---
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_ticker_instance.history.return_value = pd.DataFrame({'Close': [100]}) # Non-empty
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        # --- Mock setup for get_stock_info part (called with the instance above) ---
        sample_stock_info = {
            "symbol": TEST_TICKER_VALID.upper(),
            "regularMarketPrice": 150.00,
            "currency": "USD",
            "marketCap": 2000e9,
            # Add other relevant fields if data_fetcher.get_stock_info or its callers depend on them
        }
        mock_ticker_instance.info = sample_stock_info # Set the .info attribute

        # --- Call the function under test ---
        actual_ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID) 
        self.assertIs(actual_ticker_obj, mock_ticker_instance) 

        stock_info = data_fetcher.get_stock_info(actual_ticker_obj)
        
        # --- Assertions ---
        self.assertIsInstance(stock_info, dict, "Stock info should be a dictionary.")
        self.assertGreater(len(stock_info), 0, "Stock info dictionary should not be empty.")
        self.assertEqual(stock_info.get("symbol"), TEST_TICKER_VALID.upper())
        self.assertEqual(stock_info.get("regularMarketPrice"), 150.00)
        self.assertIs(stock_info, sample_stock_info) 
        print(f"test_get_stock_info_valid_ticker for {TEST_TICKER_VALID} PASSED (mocked).")

    def test_get_stock_info_no_ticker_obj(self):
        """Test get_stock_info with a None ticker object."""
        stock_info = data_fetcher.get_stock_info(None)
        self.assertIsInstance(stock_info, dict)
        self.assertEqual(len(stock_info), 0, "Stock info should be empty for None ticker.")
        print("test_get_stock_info_no_ticker_obj PASSED.")


    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_historical_financials_income_stmt(self, mock_yfinance_ticker_class):
        """Test fetching annual income statement with mocking."""
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_ticker_instance.history.return_value = pd.DataFrame({'Close': [100]}) # For get_ticker_object
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        sample_df = create_sample_financial_df()
        mock_ticker_instance.financials = sample_df # This is what get_historical_financials accesses for income_stmt

        actual_ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID)
        self.assertIs(actual_ticker_obj, mock_ticker_instance)

        income_stmt_df = data_fetcher.get_historical_financials(actual_ticker_obj, "income_stmt")
        self.assertIsInstance(income_stmt_df, pd.DataFrame, "Income statement should be a DataFrame.")
        self.assertFalse(income_stmt_df.empty, f"Income statement for {TEST_TICKER_VALID} should not be empty (mocked).")
        self.assertIs(income_stmt_df, sample_df)
        print(f"test_get_historical_financials_income_stmt for {TEST_TICKER_VALID} PASSED (mocked).")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_historical_financials_balance_sheet(self, mock_yfinance_ticker_class):
        """Test fetching annual balance sheet with mocking."""
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_ticker_instance.history.return_value = pd.DataFrame({'Close': [100]}) # For get_ticker_object
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        sample_df = create_sample_financial_df() # Using generic sample for structure
        # Update index for more realistic balance sheet items if necessary for deeper assertions
        sample_df.index = ['Total Assets', 'Total Liab', 'Total Stockholder Equity'] 
        mock_ticker_instance.balance_sheet = sample_df

        actual_ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID)
        self.assertIs(actual_ticker_obj, mock_ticker_instance)

        balance_sheet_df = data_fetcher.get_historical_financials(actual_ticker_obj, "balance_sheet")
        self.assertIsInstance(balance_sheet_df, pd.DataFrame, "Balance sheet should be a DataFrame.")
        self.assertFalse(balance_sheet_df.empty, f"Balance sheet for {TEST_TICKER_VALID} should not be empty (mocked).")
        self.assertIs(balance_sheet_df, sample_df)
        print(f"test_get_historical_financials_balance_sheet for {TEST_TICKER_VALID} PASSED (mocked).")


    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_historical_financials_cash_flow(self, mock_yfinance_ticker_class):
        """Test fetching annual cash flow statement with mocking."""
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_ticker_instance.history.return_value = pd.DataFrame({'Close': [100]}) # For get_ticker_object
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        sample_df = create_sample_financial_df() # Using generic sample for structure
        sample_df.index = ['Capital Expenditures', 'Depreciation', 'Net Income']
        mock_ticker_instance.cashflow = sample_df

        actual_ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID)
        self.assertIs(actual_ticker_obj, mock_ticker_instance)

        cash_flow_df = data_fetcher.get_historical_financials(actual_ticker_obj, "cashflow")
        self.assertIsInstance(cash_flow_df, pd.DataFrame, "Cash flow statement should be a DataFrame.")
        self.assertFalse(cash_flow_df.empty, f"Cash flow statement for {TEST_TICKER_VALID} should not be empty (mocked).")
        self.assertIs(cash_flow_df, sample_df)
        print(f"test_get_historical_financials_cash_flow for {TEST_TICKER_VALID} PASSED (mocked).")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_historical_financials_invalid_statement_type(self, mock_yfinance_ticker_class):
        """Test fetching financials with an invalid statement type with mocking."""
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = TEST_TICKER_VALID.upper()
        mock_ticker_instance.history.return_value = pd.DataFrame({'Close': [100]}) # For get_ticker_object
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        # We don't need to set financials, balance_sheet, or cashflow on the mock_ticker_instance
        # as the function should return an empty DataFrame for an invalid type before accessing them.

        actual_ticker_obj = data_fetcher.get_ticker_object(TEST_TICKER_VALID)
        self.assertIs(actual_ticker_obj, mock_ticker_instance)

        df = data_fetcher.get_historical_financials(actual_ticker_obj, "invalid_statement_type_xyz")
        self.assertIsInstance(df, pd.DataFrame)
        self.assertTrue(df.empty, "DataFrame should be empty for invalid statement type (mocked).")
        print("test_get_historical_financials_invalid_statement_type PASSED (mocked).")

    def test_get_historical_financials_no_ticker_obj(self):
        """Test get_historical_financials with a None ticker object."""
        df = data_fetcher.get_historical_financials(None, "income_stmt")
        self.assertIsInstance(df, pd.DataFrame)
        self.assertTrue(df.empty, "DataFrame should be empty for None ticker.")
        print("test_get_historical_financials_no_ticker_obj PASSED.")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker')
    def test_get_risk_free_rate_proxy(self, mock_yfinance_ticker_class):
        """Test fetching the risk-free rate proxy with mocking."""
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = RISK_FREE_RATE_PROXY_TICKER
        
        # Mock the .history() method to return a DataFrame with a 'Close' value
        # The function get_risk_free_rate_proxy uses the last 'Close' value
        sample_rfr_close_value = 3.5 # Represents 3.5%
        mock_history_df = pd.DataFrame({'Close': [3.0, 3.2, sample_rfr_close_value]})
        mock_ticker_instance.history.return_value = mock_history_df

        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        rfr = data_fetcher.get_risk_free_rate_proxy(RISK_FREE_RATE_PROXY_TICKER)
        
        mock_yfinance_ticker_class.assert_called_once_with(RISK_FREE_RATE_PROXY_TICKER)
        mock_ticker_instance.history.assert_called_once_with(period="5d") # Corrected assertion
        
        self.assertIsNotNone(rfr, "Risk-free rate should not be None (mocked).")
        self.assertIsInstance(rfr, float, "Risk-free rate should be a float (mocked).")
        self.assertAlmostEqual(rfr, sample_rfr_close_value / 100.0, places=4)
        print(f"test_get_risk_free_rate_proxy for {RISK_FREE_RATE_PROXY_TICKER} PASSED (mocked, Value: {rfr:.4%}).")

    @patch('epv_valuation_model.data_fetcher.yf.Ticker') # Also mock invalid ticker for consistency
    def test_get_risk_free_rate_proxy_invalid_ticker(self, mock_yfinance_ticker_class):
        """Test fetching risk-free rate with an invalid treasury ticker with mocking."""
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.ticker = "INVALID^TREASURY"
        # Simulate history call returning empty df or raising error for an invalid ticker scenario
        mock_ticker_instance.history.return_value = pd.DataFrame() # Empty DataFrame
        mock_yfinance_ticker_class.return_value = mock_ticker_instance

        rfr = data_fetcher.get_risk_free_rate_proxy("INVALID^TREASURY")
        self.assertIsNone(rfr, "Risk-free rate should be None for an invalid treasury ticker (mocked).")
        mock_yfinance_ticker_class.assert_called_once_with("INVALID^TREASURY")
        mock_ticker_instance.history.assert_called_once_with(period="5d") # Corrected assertion
        print("test_get_risk_free_rate_proxy_invalid_ticker PASSED (mocked).")


if __name__ == '__main__':
    # This allows running the tests directly from this file:
    # python -m tests.test_data_fetcher (if tests is a package)
    # or python test_data_fetcher.py (if in the tests directory and epv_valuation_model is in PYTHONPATH)
    unittest.main()
