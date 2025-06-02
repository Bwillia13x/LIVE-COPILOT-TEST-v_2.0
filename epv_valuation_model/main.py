# epv_valuation_model/main.py
# Main script to run the EPV (Earnings Power Value) valuation model.

import argparse
import sys # For exiting if critical errors occur
import pandas as pd # Added for pd.isna in main_capex fallback
import os
import json
from typing import Optional

# Import from our project modules
# Assuming main.py is in the root of the 'epv_valuation_model' package,
# or that the 'epv_valuation_model' directory is in PYTHONPATH.
# If running from one level up (e.g. project root containing epv_valuation_model dir):
# from epv_valuation_model import data_fetcher, data_processor, epv_calculator, config
# If running main.py directly from within the epv_valuation_model directory:
from . import data_fetcher
from . import data_processor
from . import epv_calculator
from . import config # Our new configuration file
from . import ai_analyzer
from .utils import ensure_directory_exists # Added for main
from . import reporting  # Add this import at the top
from . import risk_analyzer  # Import risk_analyzer for sensitivity analysis
# from . import utils # If utils were used directly in main
# from . import reporting # If reporting were used directly in main

def run_epv_valuation(ticker_symbol: str, use_sample_data_ticker: Optional[str] = None):
    """
    Orchestrates the EPV valuation process for a given ticker symbol.
    Args:
        ticker_symbol (str): The ticker to analyze if not using samples.
        use_sample_data_ticker (Optional[str]): If provided, load raw data for this
                                                ticker from data/fetched_samples/ directory.
    """
    effective_ticker = use_sample_data_ticker.upper() if use_sample_data_ticker else ticker_symbol.upper()
    print(f"\nStarting EPV Valuation for: {effective_ticker}")
    if use_sample_data_ticker:
        print(f"--- USING PRE-SAVED SAMPLE DATA FOR {effective_ticker} ---")
    print("=" * 40)

    # --- 1. Fetch Data ---
    print("\nStep 1: Fetching Data...")

    if use_sample_data_ticker:
        # Load from sample files
        sample_dir = "data/fetched_samples/"
        ensure_directory_exists(sample_dir) # Should exist, but good practice
        
        try:
            raw_income_stmt = pd.read_csv(os.path.join(sample_dir, f"{effective_ticker}_raw_is.csv"), index_col=0)
            raw_balance_sheet = pd.read_csv(os.path.join(sample_dir, f"{effective_ticker}_raw_bs.csv"), index_col=0)
            raw_cash_flow = pd.read_csv(os.path.join(sample_dir, f"{effective_ticker}_raw_cf.csv"), index_col=0)
            with open(os.path.join(sample_dir, f"{effective_ticker}_raw_info.json"), 'r') as f:
                stock_info = json.load(f)
            print(f"Successfully loaded sample data for {effective_ticker} from {sample_dir}")
            # Ensure DataFrame columns are integers if they represent years
            for df in [raw_income_stmt, raw_balance_sheet, raw_cash_flow]:
                if not df.empty:
                    df.columns = [int(col) if isinstance(col, str) and col.isdigit() else col for col in df.columns]

        except FileNotFoundError as e:
            print(f"Fatal Error: Sample data file not found for {effective_ticker} in {sample_dir}. {e}")
            print("Please ensure files like MOCK_raw_is.csv, MOCK_raw_bs.csv, etc. exist.")
            sys.exit(1)
        except Exception as e:
            print(f"Fatal Error: Could not load sample data for {effective_ticker}. Error: {e}")
            sys.exit(1)
        
        # Risk-free rate still needs to be fetched or defaulted if not in samples
        risk_free_rate = data_fetcher.get_risk_free_rate_proxy(config.RISK_FREE_RATE_TICKER)
        if risk_free_rate is None:
            print("Warning: Could not fetch risk-free rate (even with samples). Using default from config.")
            risk_free_rate = getattr(config, 'DEFAULT_RISK_FREE_RATE', 0.04)

    else:
        # Original live data fetching logic
        ticker_obj = data_fetcher.get_ticker_object(ticker_symbol)
        if not ticker_obj:
            print(f"Warning: Could not retrieve ticker object for {ticker_symbol}. Proceeding with Gemini fallback mode.")
            ticker_obj = ticker_symbol  # Pass the string to trigger Gemini fallback

        risk_free_rate = data_fetcher.get_risk_free_rate_proxy(config.RISK_FREE_RATE_TICKER)
        if risk_free_rate is None:
            print("Warning: Could not fetch risk-free rate. Using default from config.")
            risk_free_rate = getattr(config, 'DEFAULT_RISK_FREE_RATE', 0.04)

        raw_income_stmt = data_fetcher.get_historical_financials(ticker_obj, "income_stmt")
        raw_balance_sheet = data_fetcher.get_historical_financials(ticker_obj, "balance_sheet")
        raw_cash_flow = data_fetcher.get_historical_financials(ticker_obj, "cashflow")
        stock_info = data_fetcher.get_stock_info(ticker_obj) if not isinstance(ticker_obj, str) else {}

    if raw_income_stmt.empty or raw_balance_sheet.empty or raw_cash_flow.empty:
        print("Fatal Error: Failed to fetch one or more critical financial data components. Exiting.")
        return None

    # --- AI Company Summary ---
    long_business_summary = stock_info.get("longBusinessSummary")
    ai_company_summary = ai_analyzer.get_company_summary_from_ai(long_business_summary)

    # --- 2. Process Data ---
    print("\nStep 2: Processing Data...")
    # Note: data_processor will use its internal mappings.
    # We should refactor data_processor to use config.S_... names if we want full consistency from config.
    processed_data = data_processor.process_financial_data(
        raw_income_stmt, raw_balance_sheet, raw_cash_flow, stock_info
    )

    if processed_data["errors"]:
        print("Errors encountered during data processing:")
        for error in processed_data["errors"]:
            print(f"- {error}")
        # Decide if errors are fatal
        if "Raw income statement is empty." in processed_data["errors"] or \
           "Raw balance sheet is empty." in processed_data["errors"] or \
           "Raw cash flow statement is empty." in processed_data["errors"]:
            print("Fatal Error: Core financial statements are missing after processing. Exiting.")
            return None

    is_proc = processed_data["income_statement"]
    bs_proc = processed_data["balance_sheet"]
    cf_proc = processed_data["cash_flow"]
    details_proc = processed_data["stock_details"]

    if is_proc.empty or bs_proc.empty or cf_proc.empty or not details_proc:
        print("Fatal Error: Processed data is incomplete. Exiting.")
        return None

    # --- 3. Calculate EPV ---
    # Reminder: We need to refactor epv_calculator to use constants from config.py
    print("\nStep 3: Calculating EPV and Asset Value...")

    # Normalized EBIT
    norm_ebit_tuple = epv_calculator.calculate_normalized_ebit(
        is_proc,
        num_years=config.DEFAULT_NORMALIZATION_YEARS # Using config
    )
    if norm_ebit_tuple is None:
        print("Fatal Error: Normalized EBIT calculation failed. Exiting.")
        return None
    normalized_ebit, avg_op_margin = norm_ebit_tuple

    # Maintenance Capex
    maint_capex = epv_calculator.calculate_maintenance_capex(
        is_proc, bs_proc, cf_proc,
        num_years=config.DEFAULT_NORMALIZATION_YEARS # Using config
    )
    if maint_capex is None:
        print("Warning: Maintenance Capex calculation failed. Trying D&A fallback.")
        if config.S_DEPRECIATION_CF in cf_proc.index:
            maint_capex = abs(cf_proc.loc[config.S_DEPRECIATION_CF].iloc[:config.DEFAULT_NORMALIZATION_YEARS].mean(skipna=True))
            if pd.isna(maint_capex):
                print("Fatal Error: Maint Capex and D&A fallback failed. Exiting.")
                return None
            print(f"Using Avg D&A as Maint Capex proxy: {maint_capex:,.0f}")
        else:
            print("Fatal Error: Maint Capex failed and no D&A fallback in Cash Flow. Exiting.")
            return None

    # NOPAT
    nopat = epv_calculator.calculate_nopat(
        normalized_ebit, is_proc,
        num_years=config.DEFAULT_NORMALIZATION_YEARS # Using config
    )
    if nopat is None:
        print("Fatal Error: NOPAT calculation failed. Exiting.")
        return None

    # WACC
    wacc = epv_calculator.calculate_wacc(
        details_proc, bs_proc, is_proc, risk_free_rate,
        equity_risk_premium=config.EQUITY_RISK_PREMIUM, # Using config
        num_years_tax_rate=config.DEFAULT_WACC_NORMALIZATION_YEARS # Using config
    )
    if wacc is None:
        print("Fatal Error: WACC calculation failed. Exiting.")
        return None

    # EPV Operations
    epv_results = epv_calculator.calculate_epv(nopat, wacc, maint_capex)
    if epv_results is None:
        print("Fatal Error: EPV Operations calculation failed. Exiting.")
        return None
    epv_ops = epv_results["epv_operations"]

    # EPV Equity
    epv_equity = epv_calculator.calculate_epv_equity(epv_ops, bs_proc, details_proc)
    if epv_equity is None:
        print("Fatal Error: EPV Equity calculation failed. Exiting.")
        return None

    # Asset Value (Equity Proxy)
    av_equity = epv_calculator.calculate_asset_value_equity(bs_proc)
    # av_equity can be None, so we don't make it fatal if it fails for summary.

    # --- 4. Display Summary ---
    print("\n" + "="*40)
    report_ticker = details_proc.get('ticker', effective_ticker)
    print(f"EPV VALUATION SUMMARY FOR: {report_ticker}")
    print("="*40)
    currency = details_proc.get('currency', config.DEFAULT_CURRENCY_SYMBOL)
    current_price = details_proc.get('current_price', 'N/A')
    market_cap = details_proc.get('market_cap', 0)

    print(f"Current Market Price: {currency}{current_price:,.2f}" if isinstance(current_price, (int, float)) else f"Current Market Price: {current_price}")
    print(f"Market Cap: {currency}{market_cap:,.0f}" if market_cap else "Market Cap: N/A")
    print(f"Risk-Free Rate Used: {risk_free_rate:.3%}")
    print(f"Equity Risk Premium Used: {config.EQUITY_RISK_PREMIUM:.3%}")
    print(f"--- Key Calculated Metrics ---")
    print(f"Normalized EBIT: {currency}{normalized_ebit:,.0f} (Avg Op Margin: {avg_op_margin:.2%})")
    print(f"Estimated Maintenance Capex: {currency}{maint_capex:,.0f}")
    print(f"NOPAT (Normalized): {currency}{nopat:,.0f}")
    print(f"WACC: {wacc:.2%}")
    print(f"--- Valuation Results ---")
    print(f"EPV (Operations): {currency}{epv_ops:,.0f}")
    print(f"EPV (Equity): {currency}{epv_equity:,.0f}")
    if av_equity is not None:
        print(f"Asset Value (Equity Proxy): {currency}{av_equity:,.0f}")
    else:
        print(f"Asset Value (Equity Proxy): Not Calculated")

    # Margin of Safety & Recommendation (Simple)
    if market_cap and epv_equity:
        margin_of_safety_epv = (epv_equity - market_cap) / epv_equity if epv_equity > 0 else (-1 if epv_equity < 0 else 0)
        print(f"Margin of Safety (vs EPV Equity): {margin_of_safety_epv:.2%}")
        if margin_of_safety_epv > 0.30:
            print("Recommendation: Potentially Undervalued (Buy)")
        elif margin_of_safety_epv < -0.20:
            print("Recommendation: Potentially Overvalued (Sell)")
        else:
            print("Recommendation: Fairly Valued (Hold/Review)")
    print("="*40)
    print("Disclaimer: This is a simplified model for educational purposes. Always do your own thorough research.")

    # --- Enhanced Reporting Output ---
    # Prepare valuation results dict for reporting
    valuation_results = {
        "ticker": report_ticker,
        "epv_equity": epv_equity,
        "market_cap": market_cap,
        "current_price": current_price,
        "margin_of_safety_epv": margin_of_safety_epv if market_cap and epv_equity else None,
        "wacc": wacc,
        "nopat": nopat,
        "epv_operations": epv_ops,
        "asset_value_equity": av_equity,
        "ai_company_summary": ai_company_summary,
        "currency": currency,
        "normalized_ebit": normalized_ebit,
        "avg_op_margin": avg_op_margin,
        "maint_capex": maint_capex,
        "risk_free_rate": risk_free_rate,
        "equity_risk_premium": config.EQUITY_RISK_PREMIUM,
    }

    # Ensure the reports directory exists for this ticker
    report_dir = os.path.join(config.REPORTS_DIR, report_ticker)
    ensure_directory_exists(report_dir)

    # Generate and print text summary
    text_summary_str = reporting.generate_text_summary(valuation_results)
    print("\n" + text_summary_str)

    # Save text summary to file
    summary_filename = f"{report_ticker}_valuation_summary.txt"
    summary_filepath = os.path.join(report_dir, summary_filename)
    try:
        with open(summary_filepath, "w") as f:
            f.write(text_summary_str)
        print(f"Valuation summary saved to: {summary_filepath}")
    except Exception as e:
        print(f"Error saving text summary: {e}")

    # Export valuation results to CSV
    csv_filename = f"{report_ticker}_valuation_results.csv"
    csv_filepath = os.path.join(report_dir, csv_filename)
    reporting.export_valuation_results_to_csv(valuation_results, csv_filepath)

    # --- Historical Data Plots ---
    reporting.plot_historical_trends(
        ticker=report_ticker,
        processed_data=processed_data,
        currency=currency,
        save_dir=report_dir
    )

    # Generate and save valuation comparison plot
    plot_filename = f"{report_ticker}_valuation_comparison.png"
    plot_filepath = os.path.join(report_dir, plot_filename)
    if epv_equity is not None and market_cap is not None:
        reporting.plot_valuation_comparison(
            ticker=report_ticker,
            epv_equity=epv_equity,
            market_cap=market_cap,
            asset_value_equity=av_equity,
            currency=currency,
            save_path=plot_filepath
        )
    else:
        print("Skipping valuation comparison plot due to missing EPV Equity or Market Cap.")

    # --- Sensitivity Analysis and Plotting ---
    sensitivity_output = None
    try:
        # Prepare base inputs for sensitivity analysis
        base_calc_inputs = {
            'risk_free_rate': risk_free_rate,
            'avg_op_margin_base': avg_op_margin,
            'wacc_base': wacc,
            'normalized_ebit_base': normalized_ebit,
            'nopat_base': nopat,
            'maint_capex_base': maint_capex
        }
        vars_to_sensitize = [
            {'name': 'WACC', 'base_value': wacc},
            {'name': 'Avg Op Margin', 'base_value': avg_op_margin}
        ]
        sensitivity_output = risk_analyzer.run_sensitivity_analysis(
            base_calc_inputs, processed_data, vars_to_sensitize
        )
        if sensitivity_output:
            reporting.plot_sensitivity_analysis(
                ticker=report_ticker,
                sensitivity_results=sensitivity_output,
                currency=currency,
                save_dir=report_dir
            )
            # Export sensitivity results to CSV
            reporting.export_sensitivity_results_to_csv(sensitivity_output, report_ticker, report_dir)
            # Tornado plot
            tornado_path = os.path.join(report_dir, f"{report_ticker}_tornado_plot.png")
            reporting.plot_tornado_sensitivity(
                ticker=report_ticker,
                sensitivity_results=sensitivity_output,
                currency=currency,
                save_path=tornado_path
            )
        else:
            print("No sensitivity analysis results to plot or export.")
    except Exception as e:
        print(f"Sensitivity analysis failed: {e}")

    # --- Monte Carlo Simulation and Plotting ---
    try:
        # Only run if all required base inputs are present
        if all(x is not None for x in [avg_op_margin, wacc, normalized_ebit, nopat, maint_capex]):
            mc_variable_configs = [
                {'name': 'avg_op_margin', 'dist': 'normal', 'mean': avg_op_margin, 'std': 0.01},
                {'name': 'beta', 'dist': 'normal', 'mean': details_proc.get('beta', 1.0), 'std': 0.1}
            ]
            mc_results_df = risk_analyzer.run_monte_carlo_simulation(
                base_calc_inputs, processed_data, mc_variable_configs, num_simulations=1000
            )
            if mc_results_df is not None and not mc_results_df.empty:
                # Export to CSV
                mc_csv_path = os.path.join(report_dir, f"{report_ticker}_monte_carlo_results.csv")
                reporting.export_monte_carlo_results_to_csv(mc_results_df, mc_csv_path)
                # Plot histogram
                mc_plot_path = os.path.join(report_dir, f"{report_ticker}_monte_carlo_histogram.png")
                reporting.plot_monte_carlo_histogram(
                    ticker=report_ticker,
                    mc_results_df=mc_results_df,
                    currency=currency,
                    save_path=mc_plot_path
                )
            else:
                print("Monte Carlo simulation did not produce results.")
        else:
            print("Skipping Monte Carlo simulation due to missing base inputs.")
    except Exception as e:
        print(f"Monte Carlo simulation failed: {e}")

    return valuation_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Bruce Greenwald EPV Valuation Model.")
    parser.add_argument(
        "ticker",
        type=str,
        nargs='?', # Make ticker optional if --use-sample-data is provided
        default=None, # Default to None if not provided
        help="Stock ticker symbol to evaluate (e.g., AAPL, MSFT). Required if not using --use-sample-data."
    )
    parser.add_argument(
        "--use-sample-data",
        type=str,
        default=None,
        metavar='SAMPLE_TICKER',
        help="Load data from pre-saved sample files for the given SAMPLE_TICKER (e.g., MOCK) instead of live fetching. Ignores the positional 'ticker' argument if provided."
    )
    # Future: Add arguments for overriding config values, e.g., --risk-free-rate 0.03

    args = parser.parse_args()

    # Determine which ticker to run for
    ticker_to_run = None
    use_samples_for = None

    if args.use_sample_data:
        use_samples_for = args.use_sample_data
        ticker_to_run = args.use_sample_data # The analysis will be for the sample ticker name
        print(f"Running with sample data for ticker: {use_samples_for}")
    elif args.ticker:
        ticker_to_run = args.ticker
        print(f"Running with live data for ticker: {ticker_to_run}")
    else:
        parser.error("You must provide a ticker symbol or use the --use-sample-data SAMPLE_TICKER option.")
        sys.exit(1)

    # Ensure necessary directories exist (example, can be more robust)
    ensure_directory_exists(config.REPORTS_DIR)
    # Ensure log directory parent exists before trying to log to file, if file logging is set up
    log_dir = os.path.dirname(config.LOG_FILE_PATH)
    if log_dir: # Check if LOG_FILE_PATH includes a directory
        ensure_directory_exists(log_dir)

    results = run_epv_valuation(ticker_to_run, use_sample_data_ticker=use_samples_for)

    if results:
        print(f"\nValuation process for {results['ticker']} completed successfully.")
    else:
        print(f"\nValuation process for {args.ticker.upper()} encountered errors or was incomplete.")

