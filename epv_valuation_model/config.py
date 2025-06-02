# epv_valuation_model/config.py
# This file stores configuration settings and constants for the EPV model.

import os
from dotenv import load_dotenv

# --- Project Environment ---
# Load environment variables from .env file (optional, for API keys etc.)
load_dotenv()
print(f"[Config Debug] GEMINI_API_KEY loaded: {os.getenv('GEMINI_API_KEY') is not None}")
API_KEY_ALPHAVANTAGE = os.getenv("ALPHAVANTAGE_API_KEY")
API_KEY_FINANCIALMODELINGPREP = os.getenv("FINANCIALMODELINGPREP_API_KEY")

# --- AI Configuration ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- Data Fetching Configuration ---
DEFAULT_TICKER = "AAPL"  # Default ticker to use if none is provided
DEFAULT_HISTORY_PERIOD_YFINANCE = "10y" # For yfinance fetching
RISK_FREE_RATE_TICKER = "^TNX"  # Ticker for 10-Year Treasury Note Yield (proxy for risk-free rate)

# --- EPV Calculation Constants ---
# Normalization periods
DEFAULT_NORMALIZATION_YEARS = 7  # For operating margins, tax rates in NOPAT, Maintenance Capex ratios
DEFAULT_WACC_NORMALIZATION_YEARS = 5 # For items like effective tax rate in WACC's cost of debt

# WACC assumptions
EQUITY_RISK_PREMIUM = 0.055  # Equity Risk Premium (ERP) - adjust based on current market assessments
DEBT_RISK_PREMIUM = 0.02   # Additional premium over RFR for cost of debt if not directly calculable from financials

# Tax rate assumptions
# Default/fallback effective tax rate if historical calculation fails or is unreliable
DEFAULT_EFFECTIVE_TAX_RATE = 0.21
MIN_EFFECTIVE_TAX_RATE = 0.05 # Minimum plausible average tax rate
MAX_EFFECTIVE_TAX_RATE = 0.40 # Maximum plausible average tax rate

# Cost of Debt sanity check bounds
MIN_PRETAX_COST_OF_DEBT = 0.005 # 0.5%
MAX_PRETAX_COST_OF_DEBT = 0.20  # 20%

# Beta assumption
DEFAULT_BETA = 1.0 # Default beta if not available from data source

# --- Standardized Financial Item Names ---
# These are now defined in FinancialItemNamesConfig within config_manager.py

# --- Reporting & Output Configuration ---
# Example: Directory for saving reports or charts
REPORTS_DIR = "data/reports/"
DEFAULT_CURRENCY_SYMBOL = "$" # For display purposes

# --- Risk Analysis Configuration ---
# Sensitivity Analysis
SENSITIVITY_RANGE_PERCENT = 0.20  # e.g., +/- 20% variation for sensitivity inputs
SENSITIVITY_STEPS = 5             # Number of steps for each variable in sensitivity analysis (e.g., -20%, -10%, 0, +10%, +20%)

# Monte Carlo Simulation
MONTE_CARLO_SIMULATIONS = 10000   # Number of simulations to run
# Define distributions for Monte Carlo inputs here or pass them dynamically
# e.g., MC_OPERATING_MARGIN_MEAN, MC_OPERATING_MARGIN_STD


# --- Logging Configuration (Example) ---
LOG_LEVEL = "INFO" # e.g., DEBUG, INFO, WARNING, ERROR
LOG_FILE_PATH = "data/logs/epv_model.log"

# --- YFinance Caching Configuration ---
ENABLE_YFINANCE_CACHING = True
YFINANCE_CACHE_DIR = "data/yfinance_cache/"
YFINANCE_CACHE_EXPIRY_HOURS = 24

DEFAULT_RISK_FREE_RATE = 0.04  # Used as fallback if risk-free rate cannot be fetched

if __name__ == "__main__":
    print("--- Configuration File ---")
    print(f"Default Ticker: {DEFAULT_TICKER}")
    print(f"Equity Risk Premium: {EQUITY_RISK_PREMIUM:.3f}")
    print(f"Default Normalization Years: {DEFAULT_NORMALIZATION_YEARS}")
    print(f"Risk-Free Rate Ticker: {RISK_FREE_RATE_TICKER}")
    # print(f"Standard name for Revenue: {S_REVENUE}") # Removed, now in FinancialItemNamesConfig
    print(f"Reports Directory: {REPORTS_DIR}")
    # Create directories if they don't exist (example of a startup config task)
    # Note: os.makedirs can create parent directories if they don't exist.
    # For simplicity, this is just a print statement. In main.py, you might actually create them.
    # if not os.path.exists(REPORTS_DIR):
    #     print(f"Note: Reports directory '{REPORTS_DIR}' does not exist. Consider creating it.")
    # if not os.path.exists(os.path.dirname(LOG_FILE_PATH)):
    #     print(f"Note: Log directory '{os.path.dirname(LOG_FILE_PATH)}' does not exist. Consider creating it.")
