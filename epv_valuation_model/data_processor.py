# epv_valuation_model/data_processor.py
# This module processes the raw financial data fetched by data_fetcher.py.
# It standardizes item names (using targets from config.py), cleans data,
# and prepares it for EPV calculations.

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List

# Import configurations from config_manager.py
from .config_manager import get_config

app_config = get_config()

# --- Mappings for Standardizing Financial Item Names ---
# Keys are common yfinance names (lowercase, no spaces/slashes for matching).
# Values are our standard names imported from app_config.financial_item_names.
# This list will likely need to be expanded based on observations.
INCOME_STATEMENT_MAPPING = {
    # Common variations of income statement items and their standardized names from app_config
    # Revenue
    "totalrevenue": app_config.financial_item_names.s_revenue,
    "revenue": app_config.financial_item_names.s_revenue,
    "totalrevenues": app_config.financial_item_names.s_revenue,
    "sales": app_config.financial_item_names.s_revenue,
    "operatingrevenues": app_config.financial_item_names.s_revenue, # From yfinance

    # Cost of Revenue / COGS
    "costofrevenue": app_config.financial_item_names.s_cost_of_revenue,
    "costofgoodssold": app_config.financial_item_names.s_cost_of_revenue,
    "cogs": app_config.financial_item_names.s_cost_of_revenue,

    # Gross Profit (Can be calculated if not present, but map if source has it)
    "grossprofit": "Gross Profit", # Assuming "Gross Profit" is not in app_config or is generic
    "operatingincome": app_config.financial_item_names.s_operating_income,
    "ebit": app_config.financial_item_names.s_ebit, # Could also map to s_operating_income if they are treated synonymously
    "interestexpense": app_config.financial_item_names.s_interest_expense,
    "pretaxincome": app_config.financial_item_names.s_pretax_income, # yfinance often uses "IncomeBeforeTax"
    "incomebeforetax": app_config.financial_item_names.s_pretax_income,
    "incometaxexpense": app_config.financial_item_names.s_tax_provision, # yfinance name
    "taxprovision": app_config.financial_item_names.s_tax_provision,
    "netincome": app_config.financial_item_names.s_net_income,
    "netincomefromcontinuingops": app_config.financial_item_names.s_net_income, # Map to Net Income if no separate item
    # "netincomecontinuingoperations": app_config.financial_item_names.s_net_income_continuing_ops, # If specific
    "researchdevelopment": app_config.financial_item_names.s_research_development,
    "sellinggeneraladministrative": app_config.financial_item_names.s_selling_general_admin,
    "sellinggeneralandadministration": app_config.financial_item_names.s_selling_general_admin, # Common variation
    "depreciationandamortization": app_config.financial_item_names.s_depreciation_amortization_is,
    "depreciation": app_config.financial_item_names.s_depreciation_amortization_is, # Map to same if only one D&A item in app_config
}

BALANCE_SHEET_MAPPING = {
    "totalassets": app_config.financial_item_names.s_total_assets,
    "totalliabilities": app_config.financial_item_names.s_total_liabilities, # yfinance often "Total Liab"
    "totalliab": app_config.financial_item_names.s_total_liabilities,
    "totalstockholderequity": app_config.financial_item_names.s_total_stockholder_equity,
    "cashandcashequivalents": app_config.financial_item_names.s_cash_equivalents,
    "cash": app_config.financial_item_names.s_cash_equivalents,
    "shortterminvestments": app_config.financial_item_names.s_short_term_investments,
    "propertyplantandequipmentgross": app_config.financial_item_names.s_gross_ppe,
    "grosspropertyplantandequipment": app_config.financial_item_names.s_gross_ppe, # Common variation
    "propertyplantandequipmentnet": app_config.financial_item_names.s_net_ppe,
    "netpropertyplantandequipment": app_config.financial_item_names.s_net_ppe, # Common variation
    "accumulateddepreciation": app_config.financial_item_names.s_accumulated_depreciation,
    "nettangibleassets": app_config.financial_item_names.s_net_tangible_assets,
    "totaldebt": app_config.financial_item_names.s_total_debt, # This is often a calculated field, map if yf provides it
    "shortlongtermdebt": app_config.financial_item_names.s_short_long_term_debt,
    "shortandlongtermdebt": app_config.financial_item_names.s_short_long_term_debt, # Common variation
    "currentandlongtermdebt": app_config.financial_item_names.s_short_long_term_debt, # Added variation
    "longtermdebt": app_config.financial_item_names.s_long_term_debt,
    "preferredstock": app_config.financial_item_names.s_preferred_stock_value,
    "stockholdersequity": app_config.financial_item_names.s_total_stockholder_equity, # Added variation
    "minorityinterest": app_config.financial_item_names.s_noncontrolling_interest, # yfinance name
    "noncontrollinginterest": app_config.financial_item_names.s_noncontrolling_interest,
}

CASH_FLOW_MAPPING = {
    "capitalexpenditures": app_config.financial_item_names.s_capex,
    "investmentsinpropertyplantandequipment": app_config.financial_item_names.s_capex, # Added yfinance variation
    "depreciation": app_config.financial_item_names.s_depreciation_cf, # yfinance often uses this on CF statement
    "depreciationandamortization": app_config.financial_item_names.s_depreciation_cf, # Map to same if only one D&A item in app_config for CF
    "changetocashandcashequivalents": app_config.financial_item_names.s_change_in_cash,
    "changeincashandcashequivalents": app_config.financial_item_names.s_change_in_cash, # Common variation
    "changeincash": app_config.financial_item_names.s_change_in_cash,
    "netincome": app_config.financial_item_names.s_net_income, # Often starts CF statement
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
            "currency": stock_info.get("currency", app_config.output.default_currency_symbol) # Use from app_config
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
        # app_config is already defined at the top of the module
        from .data_fetcher import get_ticker_object, get_historical_financials, get_stock_info

        sample_ticker = app_config.data_source.default_ticker # Using default from app_config
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
                for std_name_key in ["s_revenue", "s_operating_income", "s_net_income", "s_interest_expense", "s_tax_provision"]:
                    std_name = getattr(app_config.financial_item_names, std_name_key)
                    if std_name in processed_bundle["income_statement"].index:
                        print(f"  Found: {std_name}")
                    else:
                        print(f"  NOT Found: {std_name} (Check Mappings & Raw Data)")
                if not processed_bundle["income_statement"].empty:
                     print("Processed IS Head:\n", processed_bundle["income_statement"].head())


                print("\nChecking for key standardized items in processed Balance Sheet:")
                for std_name_key in ["s_total_assets", "s_total_liabilities", "s_total_stockholder_equity", "s_gross_ppe", "s_cash_equivalents", "s_total_debt", "s_short_long_term_debt"]:
                    std_name = getattr(app_config.financial_item_names, std_name_key)
                    if std_name in processed_bundle["balance_sheet"].index:
                        print(f"  Found: {std_name}")
                    else:
                        print(f"  NOT Found: {std_name} (Check Mappings & Raw Data)")
                if not processed_bundle["balance_sheet"].empty:
                    print("Processed BS Head:\n", processed_bundle["balance_sheet"].head())


                print("\nChecking for key standardized items in processed Cash Flow Statement:")
                for std_name_key in ["s_capex", "s_depreciation_cf", "s_net_income"]: # s_net_income often on CF
                    std_name = getattr(app_config.financial_item_names, std_name_key)
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
