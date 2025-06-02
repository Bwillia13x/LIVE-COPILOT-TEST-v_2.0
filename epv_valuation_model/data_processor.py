# epv_valuation_model/data_processor.py
# This module processes the raw financial data fetched by data_fetcher.py.
# It standardizes item names (using targets from config.py), cleans data,
# and prepares it for EPV calculations.

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List

# Import configurations from config.py
# If running from project root (e.g. python -m epv_valuation_model.main):
from . import config
# If running this file directly for testing and config.py is in the same directory:
# import config


# --- Mappings for Standardizing Financial Item Names ---
# Keys are common yfinance names (lowercase, no spaces/slashes for matching).
# Values are our standard names imported from config.py.
# This list will likely need to be expanded based on observations.
INCOME_STATEMENT_MAPPING = {
    # Common variations of income statement items and their standardized names from config.py
    # Revenue
    "totalrevenue": config.S_REVENUE,
    "revenue": config.S_REVENUE,
    "totalrevenues": config.S_REVENUE,
    "sales": config.S_REVENUE,
    "operatingrevenues": config.S_REVENUE, # From yfinance

    # Cost of Revenue / COGS
    "costofrevenue": config.S_COST_OF_REVENUE,
    "costofgoodssold": config.S_COST_OF_REVENUE,
    "cogs": config.S_COST_OF_REVENUE,

    # Gross Profit (Can be calculated if not present, but map if source has it)
    "grossprofit": "Gross Profit", # Assuming "Gross Profit" is not in config or is generic
    "operatingincome": config.S_OPERATING_INCOME,
    "ebit": config.S_EBIT, # Could also map to S_OPERATING_INCOME if they are treated synonymously
    "interestexpense": config.S_INTEREST_EXPENSE,
    "pretaxincome": config.S_PRETAX_INCOME, # yfinance often uses "IncomeBeforeTax"
    "incomebeforetax": config.S_PRETAX_INCOME,
    "incometaxexpense": config.S_TAX_PROVISION, # yfinance name
    "taxprovision": config.S_TAX_PROVISION,
    "netincome": config.S_NET_INCOME,
    "netincomefromcontinuingops": config.S_NET_INCOME, # Map to Net Income if no separate item
    # "netincomecontinuingoperations": config.S_NET_INCOME_CONTINUING_OPS, # If specific
    "researchdevelopment": config.S_RESEARCH_DEVELOPMENT,
    "sellinggeneraladministrative": config.S_SELLING_GENERAL_ADMIN,
    "sellinggeneralandadministration": config.S_SELLING_GENERAL_ADMIN, # Common variation
    "depreciationandamortization": config.S_DEPRECIATION_AMORTIZATION_IS,
    "depreciation": config.S_DEPRECIATION_AMORTIZATION_IS, # Map to same if only one D&A item in config
}

BALANCE_SHEET_MAPPING = {
    "totalassets": config.S_TOTAL_ASSETS,
    "totalliabilities": config.S_TOTAL_LIABILITIES, # yfinance often "Total Liab"
    "totalliab": config.S_TOTAL_LIABILITIES,
    "totalstockholderequity": config.S_TOTAL_STOCKHOLDER_EQUITY,
    "cashandcashequivalents": config.S_CASH_EQUIVALENTS,
    "cash": config.S_CASH_EQUIVALENTS,
    "shortterminvestments": config.S_SHORT_TERM_INVESTMENTS,
    "propertyplantandequipmentgross": config.S_GROSS_PPE,
    "grosspropertyplantandequipment": config.S_GROSS_PPE, # Common variation
    "propertyplantandequipmentnet": config.S_NET_PPE,
    "netpropertyplantandequipment": config.S_NET_PPE, # Common variation
    "accumulateddepreciation": config.S_ACCUMULATED_DEPRECIATION,
    "nettangibleassets": config.S_NET_TANGIBLE_ASSETS,
    "totaldebt": config.S_TOTAL_DEBT, # This is often a calculated field, map if yf provides it
    "shortlongtermdebt": config.S_SHORT_LONG_TERM_DEBT,
    "shortandlongtermdebt": config.S_SHORT_LONG_TERM_DEBT, # Common variation
    "longtermdebt": config.S_LONG_TERM_DEBT,
    "preferredstock": config.S_PREFERRED_STOCK_VALUE,
    "minorityinterest": config.S_NONCONTROLLING_INTEREST, # yfinance name
    "noncontrollinginterest": config.S_NONCONTROLLING_INTEREST,
}

CASH_FLOW_MAPPING = {
    "capitalexpenditures": config.S_CAPEX,
    "depreciation": config.S_DEPRECIATION_CF, # yfinance often uses this on CF statement
    "depreciationandamortization": config.S_DEPRECIATION_CF, # Map to same if only one D&A item in config for CF
    "changetocashandcashequivalents": config.S_CHANGE_IN_CASH,
    "changeincashandcashequivalents": config.S_CHANGE_IN_CASH, # Common variation
    "changeincash": config.S_CHANGE_IN_CASH,
    "netincome": config.S_NET_INCOME, # Often starts CF statement
}

def _standardize_df_index(df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
    """
    Standardizes the index of a financial DataFrame based on the provided mapping.
    It performs a case-insensitive match for yfinance item names after removing spaces/slashes.
    """
    if df.empty:
        return df

    standardized_index_map = {} # Stores {original_index_name: standard_name}
    # Create a lookup for original index names: {lower_no_space_original_name: original_name_proper_case}
    original_index_lookup = {
        idx.lower().replace(" ", "").replace("/", "").replace("(", "").replace(")", ""): idx
        for idx in df.index
    }

    for yf_key_lower, standard_name_from_config in mapping.items():
        # yf_key_lower is already pre-processed (lower, no spaces)
        if yf_key_lower in original_index_lookup:
            original_index_proper_case = original_index_lookup[yf_key_lower]
            standardized_index_map[original_index_proper_case] = standard_name_from_config
        # else:
            # print(f"Debug: yfinance key '{yf_key_lower}' not found in DataFrame index for mapping to '{standard_name_from_config}'")

    # Rename the index using the map
    df_renamed = df.rename(index=standardized_index_map)

    # Filter to keep only rows that were successfully mapped to a standard name
    # This ensures the processed DataFrames only contain items we explicitly expect.
    # df_filtered = df_renamed[df_renamed.index.isin(mapping.values())]
    # Alternative: Keep all rows but only the mapped ones get new names.
    # The calculator will then only look for standardized names.

    # Identify rows that were not mapped (optional: for debugging)
    # unmapped_rows = [idx for idx in df.index if idx not in standardized_index_map]
    # if unmapped_rows:
    #     print(f"Warning: Unmapped rows remaining in DataFrame (original names): {unmapped_rows[:5]}...")


    return df_renamed

def _clean_financial_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans a financial DataFrame:
    1. Converts column names (dates) to integer years.
    2. Ensures all data is numeric (NaN for errors/missing).
    3. Sorts columns by year, most recent first.
    """
    if df.empty:
        return df

    new_columns = {}
    for col in df.columns:
        if isinstance(col, pd.Timestamp):
            new_columns[col] = col.year
        else:
            new_columns[col] = col
    df = df.rename(columns=new_columns)

    for col in df.columns: # Ensure data is numeric
        df[col] = pd.to_numeric(df[col], errors='coerce')

    df = df.sort_index(axis=1, ascending=False)
    return df

def process_financial_data(
    raw_income_stmt: pd.DataFrame,
    raw_balance_sheet: pd.DataFrame,
    raw_cash_flow: pd.DataFrame,
    stock_info: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Processes raw financial data and stock information into a structured format.
    """
    processed_data = {
        "income_statement": pd.DataFrame(),
        "balance_sheet": pd.DataFrame(),
        "cash_flow": pd.DataFrame(),
        "stock_details": {},
        "errors": []
    }
    print("\n--- Starting Data Processing (using config for standardization targets) ---")

    if not raw_income_stmt.empty:
        print("Processing Income Statement...")
        income_stmt = _standardize_df_index(raw_income_stmt, INCOME_STATEMENT_MAPPING)
        income_stmt = _clean_financial_dataframe(income_stmt)
        
        # Deduplicate index, keeping the first occurrence
        if not income_stmt.empty and income_stmt.index.has_duplicates:
            print(f"Warning: Duplicate indices found in processed Income Statement. Keeping first occurrences.")
            # Store original column order if needed, though _clean_financial_dataframe sorts by year
            # original_cols = income_stmt.columns 
            income_stmt = income_stmt[~income_stmt.index.duplicated(keep='first')]
            # income_stmt = income_stmt.loc[:, original_cols] # Reapply original col order if it was important before sorting

        processed_data["income_statement"] = income_stmt
        print("Income Statement processing complete.")
    else:
        processed_data["errors"].append("Raw income statement is empty.")
        print("Warning: Raw income statement is empty.")

    if not raw_balance_sheet.empty:
        print("Processing Balance Sheet...")
        balance_sheet = _standardize_df_index(raw_balance_sheet, BALANCE_SHEET_MAPPING)
        balance_sheet = _clean_financial_dataframe(balance_sheet)

        # Deduplicate index, keeping the first occurrence
        if not balance_sheet.empty and balance_sheet.index.has_duplicates:
            print(f"Warning: Duplicate indices found in processed Balance Sheet. Keeping first occurrences.")
            balance_sheet = balance_sheet[~balance_sheet.index.duplicated(keep='first')]

        processed_data["balance_sheet"] = balance_sheet
        print("Balance Sheet processing complete.")
    else:
        processed_data["errors"].append("Raw balance sheet is empty.")
        print("Warning: Raw balance sheet is empty.")

    if not raw_cash_flow.empty:
        print("Processing Cash Flow Statement...")
        cash_flow = _standardize_df_index(raw_cash_flow, CASH_FLOW_MAPPING)
        cash_flow = _clean_financial_dataframe(cash_flow)

        # Deduplicate index, keeping the first occurrence
        if not cash_flow.empty and cash_flow.index.has_duplicates:
            print(f"Warning: Duplicate indices found in processed Cash Flow Statement. Keeping first occurrences.")
            cash_flow = cash_flow[~cash_flow.index.duplicated(keep='first')]

        processed_data["cash_flow"] = cash_flow
        print("Cash Flow Statement processing complete.")
    else:
        processed_data["errors"].append("Raw cash flow statement is empty.")
        print("Warning: Raw cash flow statement is empty.")

    print("Processing Stock Details...")
    if stock_info:
        processed_data["stock_details"] = {
            "ticker": stock_info.get("symbol", "N/A"),
            "current_price": stock_info.get("currentPrice", stock_info.get("regularMarketPrice", stock_info.get("previousClose"))),
            "beta": stock_info.get("beta"),
            "shares_outstanding": stock_info.get("sharesOutstanding"),
            "market_cap": stock_info.get("marketCap"),
            "fifty_two_week_high": stock_info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": stock_info.get("fiftyTwoWeekLow"),
            "currency": stock_info.get("currency", config.DEFAULT_CURRENCY_SYMBOL) # Use from config
        }
        print("Stock Details processing complete.")
    else:
        processed_data["errors"].append("Stock info is empty.")
        print("Warning: Stock info is empty.")

    print("--- Data Processing Complete ---")
    return processed_data

# --- Main execution block for testing this module directly ---
if __name__ == "__main__":
    print("--- Testing Data Processor (Refactored to use Config) ---")
    # Ensure sys is imported for sys.modules check if not already at top level
    import sys 
    
    try:
        # If running this file directly, ensure config.py can be imported
        # When run with `python -m epv_valuation_model.data_processor`, `.` is the project root.
        # `epv_valuation_model.config` would be the way to access it.
        # However, for direct script execution `python data_processor.py` (if cwd is epv_valuation_model), relative works.
        from . import config as cfg # Use relative import for config
        from .data_fetcher import get_ticker_object, get_historical_financials, get_stock_info # Use relative import

        sample_ticker = cfg.DEFAULT_TICKER # Using default from config
        ticker_obj = get_ticker_object(sample_ticker)

        if ticker_obj:
            raw_is = get_historical_financials(ticker_obj, "income_stmt")
            raw_bs = get_historical_financials(ticker_obj, "balance_sheet")
            raw_cf = get_historical_financials(ticker_obj, "cashflow")
            raw_info = get_stock_info(ticker_obj)

            if not raw_is.empty and not raw_bs.empty and not raw_cf.empty and raw_info:
                print(f"\n--- Raw Data for {sample_ticker} (for context) ---")
                print("Sample Raw Income Statement Index:", raw_is.index[:5].tolist())
                print("Sample Raw Balance Sheet Index:", raw_bs.index[:5].tolist())
                print("Sample Raw Cash Flow Index:", raw_cf.index[:5].tolist())

                processed_bundle = process_financial_data(raw_is, raw_bs, raw_cf, raw_info)

                print("\n--- Processed Data Bundle ---")
                print("Stock Details:", processed_bundle["stock_details"])

                # Check if key standardized items exist in processed statements
                print("\nChecking for key standardized items in processed Income Statement:")
                for std_name in [cfg.S_REVENUE, cfg.S_OPERATING_INCOME, cfg.S_NET_INCOME, cfg.S_INTEREST_EXPENSE, cfg.S_TAX_PROVISION]:
                    if std_name in processed_bundle["income_statement"].index:
                        print(f"  Found: {std_name}")
                    else:
                        print(f"  NOT Found: {std_name} (Check Mappings & Raw Data)")
                if not processed_bundle["income_statement"].empty:
                     print("Processed IS Head:\n", processed_bundle["income_statement"].head())


                print("\nChecking for key standardized items in processed Balance Sheet:")
                for std_name in [cfg.S_TOTAL_ASSETS, cfg.S_TOTAL_LIABILITIES, cfg.S_TOTAL_STOCKHOLDER_EQUITY, cfg.S_GROSS_PPE, cfg.S_CASH_EQUIVALENTS, cfg.S_TOTAL_DEBT, cfg.S_SHORT_LONG_TERM_DEBT]:
                    if std_name in processed_bundle["balance_sheet"].index:
                        print(f"  Found: {std_name}")
                    else:
                        print(f"  NOT Found: {std_name} (Check Mappings & Raw Data)")
                if not processed_bundle["balance_sheet"].empty:
                    print("Processed BS Head:\n", processed_bundle["balance_sheet"].head())


                print("\nChecking for key standardized items in processed Cash Flow Statement:")
                for std_name in [cfg.S_CAPEX, cfg.S_DEPRECIATION_CF, cfg.S_NET_INCOME]: # S_NET_INCOME often on CF
                    if std_name in processed_bundle["cash_flow"].index:
                        print(f"  Found: {std_name}")
                    else:
                        print(f"  NOT Found: {std_name} (Check Mappings & Raw Data)")
                if not processed_bundle["cash_flow"].empty:
                    print("Processed CF Head:\n", processed_bundle["cash_flow"].head())


                if processed_bundle["errors"]:
                    print("\nProcessing Errors Encountered:")
                    for error in processed_bundle["errors"]:
                        print(f"- {error}")
            else:
                print(f"Could not fetch complete raw data for {sample_ticker} to test processing.")
        else:
            print(f"Could not get ticker object for {sample_ticker} to test processing.")

    except ImportError as e:
        print(f"ImportError during test: {e}. Ensure all modules (config, data_fetcher) are accessible.")
    except Exception as e:
        print(f"An error occurred during the data_processor test: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Data Processor Test Complete ---")
