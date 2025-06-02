# epv_valuation_model/data_fetcher.py
# This module is responsible for fetching financial data for a given stock ticker
# using the yfinance library.

import yfinance as yf
import pandas as pd
import google.generativeai as genai
import io
import re
import os # For caching
import json # For caching stock info
from datetime import datetime, timedelta # For cache expiry
from typing import Optional, Dict, Any
from .config_manager import get_config # Changed import
from .utils import ensure_directory_exists # For creating cache directory
import numpy as np # For np.nan if needed in mock data

# --- Mock Data Definitions ---
MOCK_STOCK_INFO_DICT = {
    "symbol": "MOCK",
    "currentPrice": 150.00,
    "beta": 1.25,
    "sharesOutstanding": 16_000_000_000,
    "marketCap": 150.00 * 16_000_000_000,
    "fiftyTwoWeekHigh": 200.0,
    "fiftyTwoWeekLow": 100.0,
    "currency": "USD",
    "longName": "Mock Inc.",
    "sector": "Technology",
    "regularMarketPrice": 150.00,
    "previousClose": 148.00
}

_mock_years = [2023, 2022, 2021, 2020, 2019, 2018, 2017] # 7 years for normalization

# Index names should correspond to what data_processor.py expects from yfinance
# (usually normally cased, processor standardizes them to lowercase no-space keys for mapping)
MOCK_INCOME_STMT_DF = pd.DataFrame({
    _mock_years[0]: [380e9, 200e9, 120e9, 5e9, 115e9, 25e9, 90e9, 12e9, 30e9, 60e9],
    _mock_years[1]: [360e9, 190e9, 110e9, 4e9, 106e9, 23e9, 83e9, 11e9, 28e9, 55e9],
    _mock_years[2]: [340e9, 180e9, 100e9, 3e9, 97e9, 20e9, 77e9, 10e9, 25e9, 50e9],
    _mock_years[3]: [320e9, 170e9,  90e9, 2e9, 88e9, 18e9, 70e9,  9e9, 22e9, 45e9],
    _mock_years[4]: [300e9, 160e9,  80e9, 2e9, 78e9, 16e9, 62e9,  8e9, 20e9, 40e9],
    _mock_years[5]: [280e9, 150e9,  70e9, 2e9, 68e9, 14e9, 54e9,  7e9, 18e9, 35e9],
    _mock_years[6]: [260e9, 140e9,  60e9, 2e9, 58e9, 12e9, 46e9,  6e9, 16e9, 30e9],
}, index=['Total Revenue', 'Cost Of Revenue', 'Operating Income', 'Interest Expense',
          'Income Before Tax', 'Income Tax Expense', 'Net Income',
          'Depreciation And Amortization', # For IS D&A
          'Research Development', 'Selling General Administrative'])

MOCK_BALANCE_SHEET_DF = pd.DataFrame({
    _mock_years[0]: [350e9, 280e9, 70e9, 50e9, 20e9, 150e9, 100e9, 80e9, 60e9, 30e9, 10e9, 0], # NonControllingInterest 0
    _mock_years[1]: [330e9, 260e9, 70e9, 45e9, 18e9, 140e9, 95e9, 75e9, 55e9, 28e9, 9e9, 0],
    _mock_years[2]: [310e9, 240e9, 70e9, 40e9, 16e9, 130e9, 90e9, 70e9, 50e9, 26e9, 8e9, 0],
    _mock_years[3]: [290e9, 220e9, 70e9, 35e9, 14e9, 120e9, 85e9, 65e9, 45e9, 24e9, 7e9, 0],
    _mock_years[4]: [270e9, 200e9, 70e9, 30e9, 12e9, 110e9, 80e9, 60e9, 40e9, 22e9, 6e9, 0],
    _mock_years[5]: [250e9, 180e9, 70e9, 25e9, 10e9, 100e9, 75e9, 55e9, 35e9, 20e9, 5e9, 0],
    _mock_years[6]: [230e9, 160e9, 70e9, 20e9,  8e9,  90e9, 70e9, 50e9, 30e9, 18e9, 4e9, 0],
}, index=['Total Assets', 'Total Liab', 'Total Stockholder Equity',
          'Cash And Cash Equivalents', 'Short Term Investments',
          'Property Plant And Equipment Gross', # Gross PPE
          'Property Plant And Equipment Net', # Net PPE (mapped from propertyplantandequipmentnet)
          'Net Tangible Assets',
          'Total Debt',
          'Short Long Term Debt', 'Long Term Debt', 'Preferred Stock'])


MOCK_CASH_FLOW_DF = pd.DataFrame({
    _mock_years[0]: [-15e9, 12e9, 5e9, 90e9],
    _mock_years[1]: [-14e9, 11e9, 4e9, 83e9],
    _mock_years[2]: [-13e9, 10e9, 3e9, 77e9],
    _mock_years[3]: [-12e9,  9e9, 2e9, 70e9],
    _mock_years[4]: [-11e9,  8e9, 2e9, 62e9],
    _mock_years[5]: [-10e9,  7e9, 1e9, 54e9],
    _mock_years[6]: [ -9e9,  6e9, 1e9, 46e9],
}, index=['Capital Expenditures', 'Depreciation', # S_DEPRECIATION_CF on CF
          'Change In Cash', 'Net Income'])

class MockTicker:
    def __init__(self, ticker_symbol):
        self.ticker = ticker_symbol
        self._info = MOCK_STOCK_INFO_DICT.copy()
        self._income_stmt = MOCK_INCOME_STMT_DF.copy()
        self._balance_sheet = MOCK_BALANCE_SHEET_DF.copy()
        self._cashflow = MOCK_CASH_FLOW_DF.copy()

    def history(self, period=None, interval=None, start=None, end=None, prepost=False, actions=True, auto_adjust=True, back_adjust=False, proxy=None, rounding=False, tz=None, timeout=None, **kwargs):
        # Return a simple non-empty DataFrame to pass the check in get_ticker_object
        return pd.DataFrame({'Close': [150.0, 151.0]})

    @property
    def info(self):
        return self._info

    @property
    def income_stmt(self):
        # yfinance Ticker().income_stmt is a DataFrame, not a method call
        return self._income_stmt

    @property
    def balance_sheet(self):
        return self._balance_sheet

    @property
    def cashflow(self):
        return self._cashflow
# --- End Mock Data Definitions ---

# --- Configuration ---
# Define the period for which to fetch historical data (e.g., "10y" for 10 years)
# Greenwald's method often suggests 7-10 years for normalization.
DEFAULT_HISTORY_PERIOD = "10y"
# Define a shorter period for more frequent data like quarterly financials if needed,
# though annual is primary for EPV.
# QUARTERLY_HISTORY_PERIOD = "5y" # Example if we needed quarterly

# Standardized names for financial statement items we expect
# This helps in abstracting away the exact names yfinance might use,
# which can sometimes vary or have alternatives.
# We will map yfinance output to these standard names in the processing stage.
# For now, this is more of a reference for what we're looking for.
EXPECTED_INCOME_ITEMS = [
    "Total Revenue", "Cost Of Revenue", "Gross Profit",
    "Operating Income", "EBIT", # EBIT is often synonymous with Operating Income
    "Interest Expense", "Income Before Tax", "Income Tax Expense", "Net Income",
    "Depreciation And Amortization", # Often in Income Statement or Cash Flow
    "Research Development", "Selling General Administrative"
]
EXPECTED_BALANCE_SHEET_ITEMS = [
    "Total Assets", "Total Liab", "Total Stockholder Equity",
    "Cash And Cash Equivalents", "Short Term Investments", # For excess cash
    "Property Plant And Equipment Gross", "Accumulated Depreciation", # For Net PPE if Gross not available directly
    "Net Tangible Assets",
    "Total Debt", # yfinance might not always have this directly, may need to sum short/long term debt
    "Short Long Term Debt", "Long Term Debt",
    "Preferred Stock", "Minority Interest" # (though yfinance calls it Non Controlling Interest)
]
EXPECTED_CASH_FLOW_ITEMS = [
    "Capital Expenditures", "Depreciation", # Depreciation & Amortization
    "Change To Operating Activities" # For context
]

# At the beginning of the file, after imports
_current_mock_run_ticker = None

def get_ticker_object(ticker_symbol: str) -> Optional[yf.Ticker]:
    """
    Retrieves the yfinance Ticker object for a given stock symbol.
    Returns a MockTicker if ticker_symbol is "MOCK".
    Sets a global flag if MOCK is used.
    """
    global _current_mock_run_ticker
    if ticker_symbol.upper() == "MOCK":
        print(f"Returning MockTicker object for {ticker_symbol}")
        _current_mock_run_ticker = "MOCK"
        return MockTicker(ticker_symbol.upper())
    
    _current_mock_run_ticker = None # Reset if not MOCK
    try:
        ticker = yf.Ticker(ticker_symbol)
        # A simple check to see if the ticker is valid by attempting to fetch minimal history
        if not ticker.history(period="1d").empty:
            print(f"Successfully retrieved Ticker object for {ticker_symbol}")
            return ticker
        else:
            # This case might occur for delisted tickers or very obscure ones
            print(f"Could not retrieve valid historical data for ticker: {ticker_symbol}. It might be delisted, invalid, or lack data on yfinance.")
            return None
    except Exception as e:
        # This can catch various issues, including network problems or yfinance internal errors
        print(f"Error creating Ticker object for {ticker_symbol}: {e}")
        return None

def fetch_financials_with_gemini(ticker: str, statement_type: str) -> pd.DataFrame:
    """
    Uses Gemini to fetch financial statement data for a given ticker and statement type.
    Returns a DataFrame if successful, or empty DataFrame if not.
    """
    app_config = get_config()
    if not app_config.data_source.gemini_api_key:
        print("[Gemini Fallback] No Gemini API key configured.")
        return pd.DataFrame()

    genai.configure(api_key=app_config.data_source.gemini_api_key) # Configure once per call, or globally if appropriate
    model_name = "gemini-1.5-flash-latest" # As suggested

    prompt_map = {
        "income_stmt": "annual income statement",
        "balance_sheet": "annual balance sheet",
        "cashflow": "annual cash flow statement"
    }
    statement_name = prompt_map.get(statement_type, statement_type)
    prompt = (
        f"Provide the {statement_name} for {ticker} for the last 3 years. "
        "Return the data as a markdown table with years as columns and line items as rows. "
        "Use standard US GAAP line items. Do not include any explanation, only the table."
    )

    print(f"[Gemini Debug] API Key Used: {app_config.data_source.gemini_api_key[:5] if app_config.data_source.gemini_api_key else 'None'}...") # Debug print for API key

    try:
        model_obj = genai.GenerativeModel(model_name)
        response = model_obj.generate_content(prompt)
        
        # The rest of the parsing logic appears to use response.text, which is fine.
        # Ensure io and re are imported if not already at the top of the file.
        # For this edit, assuming they are, as they are used later.
        # import io # Make sure it's available <-- Remove from here
        # import re # Make sure it's available <-- Remove from here

        # Extract markdown table from response
        # The existing regex might need adjustment if Gemini's output format varies.
        # response.text is the correct attribute for GenerativeModel's response content text.
        table_match = re.search(r'\|.*\|\n(\|[\s\S]+?\|)\n', response.text) 
        if not table_match:
            print("[Gemini Fallback] No table found in Gemini response.")
            print(f"[Gemini Fallback] Raw response text for {ticker} {statement_name}:\n{response.text}") # Print raw response for debugging
            return pd.DataFrame()
        table_md = table_match.group(0)
        # Convert markdown table to DataFrame
        df = pd.read_csv(io.StringIO(table_md), sep='|', engine='python', skipinitialspace=True)
        df = df.drop(df.columns[[0, -1]], axis=1) # Remove empty columns from markdown borders
        df.columns = [c.strip() for c in df.columns]
        df = df.set_index(df.columns[0])
        # Try to convert values to numeric where possible
        for col in df.columns:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', '').str.strip(), errors='ignore')
        return df
    except Exception as e:
        print(f"[Gemini Fallback] Error: {e}")
        # Optionally, print response text on error as well if available
        try:
            if response and hasattr(response, 'text'):
                 print(f"[Gemini Fallback] Raw response text on error: {response.text}")
        except NameError: # If response object doesn't exist due to error before assignment
            pass 
        return pd.DataFrame()

def get_historical_financials(ticker_obj, statement_type: str) -> pd.DataFrame:
    """
    Fetches historical financials using yfinance, with local caching and Gemini fallback.
    """
    ticker_symbol = _get_ticker_symbol_from_obj(ticker_obj)
    if not ticker_symbol:
        print("[Data Fetcher Cache] Could not determine ticker symbol for caching.")
        # Fallback to original non-caching attempt which then might try Gemini
        return _fetch_historical_financials_live(ticker_obj, statement_type)

    app_config = get_config()
    cache_file_path = None
    if app_config.data_source.cache_enabled: # Updated from config.ENABLE_YFINANCE_CACHING
        try:
            ensure_directory_exists(app_config.data_source.yfinance_cache_dir) # Updated
            cache_file_name = f"{ticker_symbol}_{statement_type}.csv"
            cache_file_path = os.path.join(app_config.data_source.yfinance_cache_dir, cache_file_name) # Updated

            if os.path.exists(cache_file_path):
                file_mod_time = datetime.fromtimestamp(os.path.getmtime(cache_file_path))
                if datetime.now() - file_mod_time < timedelta(hours=app_config.data_source.yfinance_cache_expiry_hours): # Updated
                    print(f"[Data Fetcher Cache] Loading '{statement_type}' for {ticker_symbol} from cache.")
                    df = pd.read_csv(cache_file_path, index_col=0)
                    # Ensure columns are integers if they represent years
                    df.columns = [int(col) if col.isdigit() else col for col in df.columns]
                    return df
                else:
                    print(f"[Data Fetcher Cache] Cache expired for {cache_file_name}.")
        except Exception as e:
            print(f"[Data Fetcher Cache] Error during cache read for {ticker_symbol} {statement_type}: {e}")

    # If cache not enabled, not found, expired, or error during read, fetch live
    df = _fetch_historical_financials_live(ticker_obj, statement_type)

    if app_config.data_source.cache_enabled and not df.empty and cache_file_path: # Updated
        try:
            print(f"[Data Fetcher Cache] Saving '{statement_type}' for {ticker_symbol} to cache: {cache_file_path}")
            df.to_csv(cache_file_path)
        except Exception as e:
            print(f"[Data Fetcher Cache] Error saving to cache {cache_file_path}: {e}")
    
    return df

def _fetch_historical_financials_live(ticker_obj, statement_type: str) -> pd.DataFrame:
    """
    Internal function to fetch historical financials live (yfinance then Gemini).
    This was the original content of get_historical_financials.
    """
    try:
        # Try yfinance as usual
        if hasattr(ticker_obj, statement_type):
            data = getattr(ticker_obj, statement_type)
            if callable(data): # e.g. ticker_obj.income_stmt() - though yfinance properties are not callable
                df = data()
            else: # e.g. ticker_obj.income_stmt - direct attribute access
                df = data
            if isinstance(df, pd.DataFrame) and not df.empty:
                print(f"[Data Fetcher Live] Successfully fetched '{statement_type}' for {getattr(ticker_obj, 'ticker', 'N/A')} from yfinance.")
                return df
        # If yfinance returns empty or attribute doesn't exist as expected
        print(f"[Data Fetcher Live] yfinance returned empty or no attribute for {statement_type} for {getattr(ticker_obj, 'ticker', 'N/A')}. Trying Gemini fallback...")
    except Exception as e:
        print(f"[Data Fetcher Live] yfinance failed for {statement_type} for {getattr(ticker_obj, 'ticker', 'N/A')}: {e}. Trying Gemini fallback...")
    
    # Use Gemini fallback
    # Ensure ticker_symbol is a string for Gemini
    ticker_symbol_for_gemini = _get_ticker_symbol_from_obj(ticker_obj)
    if not ticker_symbol_for_gemini: # Should ideally not happen if ticker_obj was valid
         print(f"[Data Fetcher Live] Could not get ticker string for Gemini fallback on {statement_type}.")
         return pd.DataFrame()
    return fetch_financials_with_gemini(ticker_symbol_for_gemini, statement_type)

def fetch_stock_info_with_gemini(ticker: str) -> Dict[str, Any]:
    """
    Uses Gemini to fetch basic stock info for a given ticker. Returns a dict with key fields.
    If no markdown table is found, prints the raw response and returns it for debugging.
    """
    app_config = get_config()
    if not app_config.data_source.gemini_api_key:
        print("[Gemini Fallback] No Gemini API key configured for stock info.")
        return {}

    genai.configure(api_key=app_config.data_source.gemini_api_key)
    model_name = "gemini-1.5-flash-latest"

    prompt = (
        f"Provide the following basic company information for {ticker} as a markdown table with two columns (Field, Value): "
        "Company Name, Sector, Current Price, Market Cap, Beta, Shares Outstanding. "
        "Do not include any explanation, only the table."
    )
    print(f"[Gemini Debug Stock Info] API Key Used: {app_config.data_source.gemini_api_key[:5] if app_config.data_source.gemini_api_key else 'None'}...") # Debug print for API key

    try:
        model_obj = genai.GenerativeModel(model_name)
        response = model_obj.generate_content(prompt)

        # Removed io and re imports from here as they are top-level now
        table_match = re.search(r'\|.*\|\n(\|[\s\S]+?\|)\n', response.text)
        if not table_match:
            print("[Gemini Fallback] No table found in Gemini stock info response. Raw response:")
            print(f"[Gemini Fallback] Raw response text for {ticker} stock info:\n{response.text}") # Print raw response for debugging
            return {"raw_response": response.text} # Return raw response for analysis
        table_md = table_match.group(0)
        df = pd.read_csv(io.StringIO(table_md), sep='|', engine='python', skipinitialspace=True)
        df = df.drop(df.columns[[0, -1]], axis=1)
        df.columns = [c.strip() for c in df.columns]
        df = df.set_index(df.columns[0])
        info = {k.strip(): v.strip() for k, v in df.iloc[:,0].items()}
        # Try to convert numeric fields
        for key in ["Current Price", "Market Cap", "Beta", "Shares Outstanding"]:
            if key in info:
                try:
                    info[key] = float(str(info[key]).replace(',', '').replace('$',''))
                except Exception:
                    pass
        return info
    except Exception as e:
        print(f"[Gemini Fallback] Error fetching stock info: {e}")
        return {}

def get_stock_info(ticker_obj) -> Dict[str, Any]:
    """
    Fetches general stock information, with local caching and Gemini fallback.
    """
    ticker_symbol = _get_ticker_symbol_from_obj(ticker_obj)
    if not ticker_symbol:
        print("[Data Fetcher Cache] Could not determine ticker symbol for stock_info caching.")
        return _fetch_stock_info_live(ticker_obj) # Fallback to live fetch

    app_config = get_config()
    cache_file_path = None
    if app_config.data_source.cache_enabled: # Updated
        try:
            ensure_directory_exists(app_config.data_source.yfinance_cache_dir) # Updated
            cache_file_name = f"{ticker_symbol}_stock_info.json"
            cache_file_path = os.path.join(app_config.data_source.yfinance_cache_dir, cache_file_name) # Updated

            if os.path.exists(cache_file_path):
                file_mod_time = datetime.fromtimestamp(os.path.getmtime(cache_file_path))
                if datetime.now() - file_mod_time < timedelta(hours=app_config.data_source.yfinance_cache_expiry_hours): # Updated
                    print(f"[Data Fetcher Cache] Loading 'stock_info' for {ticker_symbol} from cache.")
                    with open(cache_file_path, 'r') as f:
                        info = json.load(f)
                    # Basic validation: check if it's a dict and has some expected key
                    if isinstance(info, dict) and ('symbol' in info or 'longName' in info):
                        return info
                    else:
                        print(f"[Data Fetcher Cache] Invalid stock_info format in cache for {ticker_symbol}.")
                else:
                    print(f"[Data Fetcher Cache] Cache expired for {cache_file_name}.")
        except Exception as e:
            print(f"[Data Fetcher Cache] Error during cache read for {ticker_symbol} stock_info: {e}")

    # If cache not enabled, not found, expired, or error, fetch live
    info = _fetch_stock_info_live(ticker_obj)

    if app_config.data_source.cache_enabled and info and isinstance(info, dict) and cache_file_path: # Updated
        # Ensure 'raw_response' is not cached if it was from Gemini fallback error.
        # Only cache if we have meaningful data, e.g., 'symbol' or 'longName' is present.
        if 'symbol' in info or 'longName' in info :
            try:
                print(f"[Data Fetcher Cache] Saving 'stock_info' for {ticker_symbol} to cache: {cache_file_path}")
                with open(cache_file_path, 'w') as f:
                    json.dump(info, f, indent=4)
            except Exception as e:
                print(f"[Data Fetcher Cache] Error saving stock_info to cache {cache_file_path}: {e}")
        else:
             print(f"[Data Fetcher Cache] Not caching stock_info for {ticker_symbol} due to missing key fields (e.g. from Gemini error).")
    
    return info

def _fetch_stock_info_live(ticker_obj) -> Dict[str, Any]:
    """
    Internal function to fetch stock info live (yfinance then Gemini).
    This was the original content of get_stock_info, with slight modifications for clarity.
    """
    ticker_symbol_for_fallback = _get_ticker_symbol_from_obj(ticker_obj)

    if not ticker_obj: # Should be caught by _get_ticker_symbol_from_obj if it returns None
        print("[Data Fetcher Live] Ticker object is None, cannot fetch stock info.")
        return {}
    
    current_ticker_name = getattr(ticker_obj, 'ticker', str(ticker_obj)) # For logging

    try:
        # If ticker_obj is a yfinance Ticker, try .info
        if hasattr(ticker_obj, 'info'):
            info = ticker_obj.info
            # Check if info is substantially empty or missing critical price data
            if not info or (isinstance(info, dict) and not info.get('regularMarketPrice') and not info.get('currentPrice') and not info.get('symbol')):
                print(f"[Data Fetcher Live] Warning: .info dictionary for {current_ticker_name} seems incomplete or missing key price/symbol data.")
                # Attempt to get current price from history as a fallback for .info
                hist = ticker_obj.history(period="2d") # Small fetch
                if not hist.empty and 'Close' in hist.columns:
                    # If info was a dict, update it. If not, create one.
                    if not isinstance(info, dict): info = {}
                    info['currentPrice'] = hist['Close'].iloc[-1]
                    print(f"[Data Fetcher Live] Fetched currentPrice from history for {current_ticker_name} as a fallback for .info.")
                    # If symbol was missing from info, try to add it from ticker_obj
                    if 'symbol' not in info and hasattr(ticker_obj, 'ticker'):
                        info['symbol'] = ticker_obj.ticker

                if not info.get('symbol') and not info.get('currentPrice'): # If still missing critical data
                    print(f"[Data Fetcher Live] Could not retrieve .info or fallback price/symbol for {current_ticker_name} from yfinance. Trying Gemini fallback...")
                    if ticker_symbol_for_fallback:
                        return fetch_stock_info_with_gemini(ticker_symbol_for_fallback)
                    else:
                        return {} # Cannot even try Gemini

            # If info seems okay or was successfully augmented
            if isinstance(info, dict) and ('symbol' in info or 'currentPrice' in info or 'longName' in info):
                 print(f"[Data Fetcher Live] Successfully fetched/augmented stock info for {current_ticker_name} from yfinance.")
                 return info
            else: # Should be rare if above checks pass, but as a safeguard
                 print(f"[Data Fetcher Live] yfinance info for {current_ticker_name} still deemed insufficient. Trying Gemini fallback...")
                 if ticker_symbol_for_fallback:
                    return fetch_stock_info_with_gemini(ticker_symbol_for_fallback)
                 return {}


        else: # ticker_obj is not a yfinance Ticker object (e.g. just a string, perhaps for MOCK or direct Gemini test)
            print(f"[Data Fetcher Live] ticker_obj for {current_ticker_name} does not have .info. Assuming direct Gemini call needed.")
            if ticker_symbol_for_fallback:
                return fetch_stock_info_with_gemini(ticker_symbol_for_fallback)
            return {}

    except Exception as e:
        print(f"[Data Fetcher Live] Error fetching stock info for {current_ticker_name} via yfinance: {e}. Trying Gemini fallback...")
        if ticker_symbol_for_fallback:
            return fetch_stock_info_with_gemini(ticker_symbol_for_fallback)
        return {}

def get_risk_free_rate_proxy(treasury_ticker: str = "^TNX") -> Optional[float]:
    """
    Fetches the current yield for a Treasury bond as a proxy for the risk-free rate.
    Returns a mock value of 0.04 if the main ticker being processed is "MOCK".
    """
    # A bit of a hack: check if we are in a "MOCK" run implicitly.
    # This could be improved with a global mock flag or by passing the main ticker.
    # For now, this simplifies testing.
    # A more robust way would be to check a global config or environment variable for "MOCK_MODE".
    # However, to avoid modifying main.py or config.py for this quick test:
    global _current_mock_run_ticker # Kludge to signal mock mode
    app_config = get_config()
    if '_current_mock_run_ticker' in globals() and _current_mock_run_ticker == "MOCK":
        print(f"Using MOCK risk-free rate: {app_config.calculation.default_risk_free_rate}") # Updated
        return app_config.calculation.default_risk_free_rate # Updated

    try:
        tnx_ticker = yf.Ticker(treasury_ticker)
        # Fetching a short period of history to get the latest close
        history = tnx_ticker.history(period="5d") # Use progress=False to suppress download status
        if not history.empty and 'Close' in history.columns:
            # Get the most recent closing price and convert from percentage to decimal
            last_yield = history['Close'].iloc[-1] / 100.0
            print(f"Successfully fetched risk-free rate proxy ({treasury_ticker}): {last_yield:.4f}")
            return last_yield
        else:
            print(f"Could not fetch historical data for risk-free rate proxy: {treasury_ticker}")
            return None
    except Exception as e:
        print(f"Error fetching risk-free rate proxy ({treasury_ticker}): {e}")
        return None

# Helper function to get ticker symbol string from ticker_obj
def _get_ticker_symbol_from_obj(ticker_obj) -> Optional[str]:
    if isinstance(ticker_obj, str):
        return ticker_obj.upper()
    if hasattr(ticker_obj, 'ticker'):
        return ticker_obj.ticker.upper()
    return None

# --- Main execution block for testing this module directly ---
if __name__ == "__main__":
    # Example usage:
    # You can change this to test different tickers
    sample_ticker_symbols = ["AAPL", "MSFT", "KO", "NONEXISTENTTICKER", "BRK-A"]

    for sample_ticker_symbol in sample_ticker_symbols:
        print(f"\n\n--- Testing Data Fetcher for: {sample_ticker_symbol} ---")

        ticker = get_ticker_object(sample_ticker_symbol)

        if ticker:
            # Fetch and display basic stock info
            stock_info = get_stock_info(ticker)
            if stock_info:
                print("\n--- Stock Info ---")
                print(f"Company Name: {stock_info.get('longName', 'N/A')}")
                print(f"Sector: {stock_info.get('sector', 'N/A')}")
                print(f"Current Price: {stock_info.get('currentPrice', stock_info.get('regularMarketPrice', stock_info.get('previousClose', 'N/A')))}")
                print(f"Market Cap: {stock_info.get('marketCap', 'N/A')}")
                print(f"Beta: {stock_info.get('beta', 'N/A')}")
                print(f"Shares Outstanding: {stock_info.get('sharesOutstanding', 'N/A')}")
                # Add more fields if interested, e.g., PE ratio, dividend yield
                print(f"Forward PE: {stock_info.get('forwardPE', 'N/A')}")
                print(f"Trailing PE: {stock_info.get('trailingPE', 'N/A')}")

            # Fetch and display Income Statement (Annual)
            income_statement_df = get_historical_financials(ticker, "income_stmt")
            if not income_statement_df.empty:
                print("\n--- Annual Income Statement (Recent years first) ---")
                print(income_statement_df.iloc[:, :3].head()) # Display first 5 rows of first 3 columns (recent years)
                # Check for key items (names might vary with yfinance updates)
                print("Key Income Statement Items Check:")
                for item in ["Total Revenue", "Operating Income", "EBIT", "Net Income", "Interest Expense", "Income Tax Expense", "Depreciation And Amortization"]:
                    if item in income_statement_df.index:
                        print(f"  Found: {item}")
                    else:
                        # Check for common alternatives if primary name not found
                        if item == "EBIT" and "Operating Income" in income_statement_df.index:
                             print(f"  Found: Operating Income (as proxy for EBIT)")
                        elif item == "Depreciation And Amortization" and "Depreciation" in income_statement_df.index:
                             print(f"  Found: Depreciation (might be D&A)")
                        else:
                             print(f"  NOT Found: {item}")


            # Fetch and display Balance Sheet (Annual)
            balance_sheet_df = get_historical_financials(ticker, "balance_sheet")
            if not balance_sheet_df.empty:
                print("\n--- Annual Balance Sheet (Recent years first) ---")
                print(balance_sheet_df.iloc[:, :3].head())
                print("Key Balance Sheet Items Check:")
                for item in ["Total Assets", "Total Liab", "Total Stockholder Equity", "Property Plant And Equipment Gross", "Cash And Cash Equivalents", "Total Debt", "Short Long Term Debt", "Long Term Debt"]:
                    if item in balance_sheet_df.index:
                        print(f"  Found: {item}")
                    else:
                        # Check for common alternatives
                        if item == "Property Plant And Equipment Gross" and "Net PPE" in balance_sheet_df.index:
                            print(f"  Found: Net PPE (Gross PPE might not be directly available)")
                        elif item == "Total Debt" and ("Short Long Term Debt" in balance_sheet_df.index or "Long Term Debt" in balance_sheet_df.index):
                            print(f"  Found: Components for Total Debt (Short Long Term Debt / Long Term Debt)")
                        else:
                            print(f"  NOT Found: {item}")


            # Fetch and display Cash Flow Statement (Annual)
            cash_flow_df = get_historical_financials(ticker, "cashflow")
            if not cash_flow_df.empty:
                print("\n--- Annual Cash Flow Statement (Recent years first) ---")
                print(cash_flow_df.iloc[:, :3].head())
                print("Key Cash Flow Items Check:")
                for item in ["Capital Expenditures", "Depreciation", "Change In Cash"]: # yfinance uses 'Depreciation' here typically
                     if item in cash_flow_df.index:
                        print(f"  Found: {item}")
                     else:
                        print(f"  NOT Found: {item}")
        else:
            print(f"Could not obtain Ticker object for {sample_ticker_symbol}. Skipping further tests for this ticker.")

    # Test risk-free rate separately as it's not ticker-dependent
    print("\n\n--- Testing Risk-Free Rate Proxy ---")
    rfr = get_risk_free_rate_proxy()
    if rfr is not None:
        print(f"Current 10-Year Treasury Yield (Risk-Free Rate Proxy): {rfr:.4%}")
    else:
        print("Could not fetch risk-free rate proxy.")

    print("\n--- Data Fetcher Module Test Complete ---")
