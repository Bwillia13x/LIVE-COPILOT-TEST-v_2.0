# epv_valuation_model/risk_analyzer.py
# This module performs risk analysis, such as sensitivity and Monte Carlo simulations.

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Callable, Tuple

# Import configurations and other necessary modules
# Assuming risk_analyzer.py is in the same package directory
from . import config
from . import epv_calculator # We'll need to call calculation functions

def run_sensitivity_analysis(
    base_inputs: Dict[str, Any],
    processed_data: Dict[str, Any],
    variables_to_sensitize: List[Dict[str, Any]],
    sensitivity_range: float = config.SENSITIVITY_RANGE_PERCENT,
    num_steps: int = config.SENSITIVITY_STEPS
) -> Dict[str, pd.DataFrame]:
    """
    Performs a sensitivity analysis on EPV Equity based on variations in key input variables.

    Args:
        base_inputs (Dict[str, Any]): Dictionary containing the base case values for inputs
                                      that will be used in recalculations, e.g.,
                                      'risk_free_rate', 'avg_op_margin_base', 'wacc_base',
                                      'normalized_ebit_base', 'nopat_base', 'maint_capex_base'.
                                      These are the values calculated by epv_calculator in the base case.
        processed_data (Dict[str, Any]): The output from data_processor.py, containing
                                         cleaned financial statements and stock details.
        variables_to_sensitize (List[Dict[str, Any]]): A list of dictionaries, where each dict defines
                                                       a variable to test. Example:
                                                       [
                                                           {'name': 'WACC', 'base_value': 0.10, 'path_to_change': 'wacc'},
                                                           {'name': 'Avg Op Margin', 'base_value': 0.15, 'path_to_change': 'avg_op_margin'}
                                                       ]
                                                       'path_to_change' indicates how to modify the input for recalculation.
        sensitivity_range (float): The +/- percentage range for sensitivity (e.g., 0.20 for +/- 20%).
        num_steps (int): The number of steps for each variable (e.g., 5 for -20%, -10%, 0%, +10%, +20%).

    Returns:
        Dict[str, pd.DataFrame]: A dictionary where keys are the names of sensitized variables
                                 and values are DataFrames showing the EPV Equity for each variation.
    """
    print("\n--- Starting Sensitivity Analysis ---")
    sensitivity_results = {}

    # Extract necessary components from processed_data
    is_proc = processed_data["income_statement"]
    bs_proc = processed_data["balance_sheet"]
    # cf_proc = processed_data["cash_flow"] # May not be needed directly if maint_capex is a base input
    details_proc = processed_data["stock_details"]

    if num_steps % 2 == 0: # Ensure num_steps is odd to have a middle (base) case
        num_steps +=1
        print(f"Adjusted num_steps to {num_steps} to ensure a middle (base) case.")

    # Generate percentage variations
    # Example: for range 0.20 and 5 steps: -20%, -10%, 0%, +10%, +20% from base
    # This means multipliers of 0.8, 0.9, 1.0, 1.1, 1.2
    variation_multipliers = np.linspace(1 - sensitivity_range, 1 + sensitivity_range, num_steps)

    for var_info in variables_to_sensitize:
        var_name = var_info['name']
        base_value = var_info['base_value']
        # path_to_change = var_info['path_to_change'] # How this variable affects recalculation

        print(f"Sensitizing: {var_name} (Base: {base_value:.4f})")
        results_for_var = []

        for multiplier in variation_multipliers:
            varied_value = base_value * multiplier
            current_epv_equity = None
            temp_nopat = base_inputs['nopat_base'] # Start with base NOPAT
            temp_wacc = base_inputs['wacc_base']   # Start with base WACC
            temp_normalized_ebit = base_inputs['normalized_ebit_base']

            # --- Recalculate EPV based on which variable is being changed ---
            try:
                if var_name == 'WACC':
                    temp_wacc = varied_value # Directly use the varied WACC
                    # NOPAT and EPV Ops depend on this new WACC
                    if temp_wacc <= 0: # WACC cannot be zero or negative
                        print(f"  Skipping WACC = {temp_wacc:.4f} (invalid)")
                        results_for_var.append({'Variation': f"{multiplier-1:.0%}", var_name: varied_value, 'EPV Equity': np.nan})
                        continue

                    # EPV Operations depends on NOPAT and WACC
                    epv_ops_results = epv_calculator.calculate_epv(
                        nopat=base_inputs['nopat_base'], # NOPAT itself doesn't change if only WACC changes
                        wacc=temp_wacc,
                        maint_capex=base_inputs['maint_capex_base'] # Assuming maint_capex is fixed for this sensitivity
                    )
                    if epv_ops_results:
                        current_epv_equity = epv_calculator.calculate_epv_equity(
                            epv_ops_results["epv_operations"], bs_proc, details_proc
                        )

                elif var_name == 'Avg Op Margin':
                    # If Avg Op Margin changes, Normalized EBIT and NOPAT change. WACC remains base.
                    # We need the latest revenue to recalculate EBIT with the new margin
                    latest_revenue = is_proc.loc[config.S_REVENUE].iloc[0]
                    temp_normalized_ebit = latest_revenue * varied_value # varied_value is the new avg_op_margin

                    temp_nopat = epv_calculator.calculate_nopat(
                        temp_normalized_ebit,
                        is_proc,
                        num_years=config.DEFAULT_NORMALIZATION_YEARS
                    )
                    if temp_nopat is None:
                        results_for_var.append({'Variation': f"{multiplier-1:.0%}", var_name: varied_value, 'EPV Equity': np.nan})
                        continue

                    epv_ops_results = epv_calculator.calculate_epv(
                        nopat=temp_nopat,
                        wacc=base_inputs['wacc_base'], # Use base WACC
                        maint_capex=base_inputs['maint_capex_base']
                    )
                    if epv_ops_results:
                        current_epv_equity = epv_calculator.calculate_epv_equity(
                            epv_ops_results["epv_operations"], bs_proc, details_proc
                        )
                
                # Add more elif blocks for other variables like 'Risk-Free Rate', 'Equity Risk Premium', 'Tax Rate'
                # Each would require recalculating the relevant intermediate steps (e.g., WACC, NOPAT)

                results_for_var.append({
                    'Variation': f"{multiplier-1:.0%}", # e.g., -20%, 0%, +20%
                    var_name: varied_value,
                    'EPV Equity': current_epv_equity if current_epv_equity is not None else np.nan
                })

            except Exception as e:
                print(f"  Error during sensitivity calculation for {var_name} at {multiplier-1:.0%}: {e}")
                results_for_var.append({'Variation': f"{multiplier-1:.0%}", var_name: varied_value, 'EPV Equity': np.nan})


        sensitivity_results[var_name] = pd.DataFrame(results_for_var)
        print(f"Finished sensitizing {var_name}.")

    print("--- Sensitivity Analysis Complete ---")
    return sensitivity_results

def run_monte_carlo_simulation(
    base_inputs: Dict[str, Any],
    processed_data: Dict[str, Any],
    mc_configs: List[Dict[str, Any]], # e.g. [{'name': 'avg_op_margin', 'dist': 'normal', 'mean': 0.15, 'std': 0.02}, ...]
    num_simulations: int = config.MONTE_CARLO_SIMULATIONS
) -> pd.DataFrame:
    """
    Performs a Monte Carlo simulation on EPV Equity. (Placeholder)
    This is a more complex function to be developed.
    """
    print("\n--- Starting Monte Carlo Simulation (Placeholder) ---")
    # 1. Define probability distributions for key uncertain inputs (e.g., op margin, beta, ERP).
    # 2. In each simulation iteration:
    #    a. Sample values for these inputs from their distributions.
    #    b. Recalculate intermediate values (Norm EBIT, NOPAT, WACC).
    #    c. Recalculate EPV Equity.
    # 3. Collect all simulated EPV Equity values.
    # 4. Analyze the distribution of EPV Equity (mean, median, std dev, percentiles, histogram).

    simulated_epv_equity_values = []
    
    # Extract necessary components from processed_data
    is_proc = processed_data["income_statement"]
    bs_proc = processed_data["balance_sheet"]
    details_proc = processed_data["stock_details"]
    risk_free_rate = base_inputs['risk_free_rate'] # Assuming this is a fixed input for now

    for i in range(num_simulations):
        if (i + 1) % (num_simulations // 10) == 0: # Print progress
            print(f"  Monte Carlo Simulation: {(i + 1) / num_simulations:.0%
                  } complete ({i+1}/{num_simulations})")

        # --- Sample inputs based on mc_configs ---
        current_params = {} # Store sampled parameters for this iteration
        
        # Example: Sample Operating Margin
        op_margin_config = next((item for item in mc_configs if item["name"] == "avg_op_margin"), None)
        if op_margin_config:
            if op_margin_config['dist'] == 'normal':
                sampled_op_margin = np.random.normal(op_margin_config['mean'], op_margin_config['std'])
            # Add other distributions like 'uniform', 'triangular'
            else: # Default to mean if dist unknown
                sampled_op_margin = op_margin_config['mean']
            current_params['avg_op_margin'] = sampled_op_margin
        else: # Fallback to base
            current_params['avg_op_margin'] = base_inputs['avg_op_margin_base']

        # Example: Sample Beta for WACC
        beta_config = next((item for item in mc_configs if item["name"] == "beta"), None)
        if beta_config:
            if beta_config['dist'] == 'normal':
                sampled_beta = np.random.normal(beta_config['mean'], beta_config['std'])
                sampled_beta = max(0.1, sampled_beta) # Beta typically > 0
            else:
                sampled_beta = beta_config['mean']
            current_params['beta'] = sampled_beta
        else:
            current_params['beta'] = details_proc.get('beta', config.DEFAULT_BETA)


        # --- Recalculate based on sampled inputs ---
        try:
            # 1. Normalized EBIT & NOPAT (using sampled op_margin)
            latest_revenue = is_proc.loc[config.S_REVENUE].iloc[0]
            norm_ebit_sim = latest_revenue * current_params['avg_op_margin']
            nopat_sim = epv_calculator.calculate_nopat(
                norm_ebit_sim, is_proc, num_years=config.DEFAULT_NORMALIZATION_YEARS
            )
            if nopat_sim is None: continue # Skip iteration if NOPAT fails

            # 2. WACC (using sampled beta)
            temp_stock_details = details_proc.copy()
            temp_stock_details['beta'] = current_params['beta']
            wacc_sim = epv_calculator.calculate_wacc(
                temp_stock_details, bs_proc, is_proc, risk_free_rate,
                equity_risk_premium=config.EQUITY_RISK_PREMIUM,
                num_years_tax_rate=config.DEFAULT_WACC_NORMALIZATION_YEARS
            )
            if wacc_sim is None or wacc_sim <= 0: continue # Skip iteration if WACC fails or is invalid

            # 3. EPV Operations & Equity
            epv_ops_results_sim = epv_calculator.calculate_epv(nopat_sim, wacc_sim, base_inputs['maint_capex_base'])
            if epv_ops_results_sim is None: continue

            epv_equity_sim = epv_calculator.calculate_epv_equity(
                epv_ops_results_sim["epv_operations"], bs_proc, details_proc
            )
            if epv_equity_sim is not None:
                simulated_epv_equity_values.append(epv_equity_sim)

        except Exception:
            # print(f"  Skipping MC iteration due to error: {e}")
            continue # Skip iteration on any calculation error

    print("--- Monte Carlo Simulation Processing Complete ---")
    if simulated_epv_equity_values:
        results_df = pd.DataFrame({'Simulated EPV Equity': simulated_epv_equity_values})
        print(f"Generated {len(results_df)} valid EPV Equity simulations.")
        print("Monte Carlo EPV Equity Summary:")
        print(results_df.describe(percentiles=[.05, .10, .25, .50, .75, .90, .95]))
        return results_df
    else:
        print("No valid EPV Equity values were generated in Monte Carlo simulation.")
        return pd.DataFrame()


# --- Main execution block for testing this module directly ---
if __name__ == "__main__":
    print("--- Testing Risk Analyzer ---")
    try:
        # This test requires processed_data and base_case calculation results
        # We'll simulate this by calling the necessary precursor functions
        if 'config' not in sys.modules: import config as cfg # For direct run
        else: cfg = config
        from data_fetcher import get_ticker_object, get_historical_financials, get_stock_info, get_risk_free_rate_proxy
        from data_processor import process_financial_data
        # epv_calculator is already imported at the top of this file
        import sys

        sample_ticker = cfg.DEFAULT_TICKER
        print(f"\nPreparing base case data for {sample_ticker}...")
        ticker_obj = get_ticker_object(sample_ticker)
        rfr = get_risk_free_rate_proxy(cfg.RISK_FREE_RATE_TICKER)

        if ticker_obj and rfr is not None:
            raw_is = get_historical_financials(ticker_obj, "income_stmt")
            raw_bs = get_historical_financials(ticker_obj, "balance_sheet")
            raw_cf = get_historical_financials(ticker_obj, "cashflow")
            raw_info = get_stock_info(ticker_obj)

            if not raw_is.empty and not raw_bs.empty and not raw_cf.empty and raw_info:
                processed_data_bundle = process_financial_data(raw_is, raw_bs, raw_cf, raw_info)
                is_p = processed_data_bundle["income_statement"]
                bs_p = processed_data_bundle["balance_sheet"]
                cf_p = processed_data_bundle["cash_flow"]
                details_p = processed_data_bundle["stock_details"]

                if not is_p.empty and not bs_p.empty and not cf_p.empty and details_p:
                    print("Calculating base case EPV values...")
                    norm_ebit_tuple_base = epv_calculator.calculate_normalized_ebit(is_p, cfg.DEFAULT_NORMALIZATION_YEARS)
                    maint_capex_base = epv_calculator.calculate_maintenance_capex(is_p, bs_p, cf_p, cfg.DEFAULT_NORMALIZATION_YEARS)
                    # Fallback for maint_capex if needed for testing
                    if maint_capex_base is None and cfg.S_DEPRECIATION_CF in cf_p.index:
                        maint_capex_base = abs(cf_p.loc[cfg.S_DEPRECIATION_CF].iloc[:cfg.DEFAULT_NORMALIZATION_YEARS].mean(skipna=True))


                    if norm_ebit_tuple_base and maint_capex_base is not None:
                        norm_ebit_base, avg_op_margin_base = norm_ebit_tuple_base
                        nopat_base = epv_calculator.calculate_nopat(norm_ebit_base, is_p, cfg.DEFAULT_NORMALIZATION_YEARS)
                        wacc_base = epv_calculator.calculate_wacc(details_p, bs_p, is_p, rfr, cfg.EQUITY_RISK_PREMIUM, cfg.DEFAULT_WACC_NORMALIZATION_YEARS)

                        if nopat_base and wacc_base:
                            base_calc_inputs = {
                                'risk_free_rate': rfr,
                                'avg_op_margin_base': avg_op_margin_base,
                                'wacc_base': wacc_base,
                                'normalized_ebit_base': norm_ebit_base,
                                'nopat_base': nopat_base,
                                'maint_capex_base': maint_capex_base
                            }
                            vars_to_sensitize = [
                                {'name': 'WACC', 'base_value': wacc_base},
                                {'name': 'Avg Op Margin', 'base_value': avg_op_margin_base}
                            ]
                            sensitivity_output = run_sensitivity_analysis(
                                base_calc_inputs, processed_data_bundle, vars_to_sensitize
                            )
                            for var_name, df_result in sensitivity_output.items():
                                print(f"\nSensitivity Results for {var_name}:")
                                print(df_result)
                            
                            # --- Test Monte Carlo ---
                            mc_variable_configs = [
                                {'name': 'avg_op_margin', 'dist': 'normal', 'mean': avg_op_margin_base, 'std': 0.01}, # Example: 1% std dev for op margin
                                {'name': 'beta', 'dist': 'normal', 'mean': details_p.get('beta', cfg.DEFAULT_BETA), 'std': 0.1} # Example: 0.1 std dev for beta
                            ]
                            monte_carlo_results_df = run_monte_carlo_simulation(
                                base_calc_inputs, processed_data_bundle, mc_variable_configs, num_simulations=1000 # Reduced for quick test
                            )
                            if not monte_carlo_results_df.empty:
                                print("\nMonte Carlo Simulation Test Output (Sample):")
                                print(monte_carlo_results_df.head())
                            else:
                                print("\nMonte Carlo Simulation did not produce results in test.")

                        else:
                            print("Base NOPAT or WACC calculation failed. Cannot run sensitivity analysis.")
                    else:
                        print("Base Normalized EBIT or Maint Capex calculation failed.")
                else:
                    print("Processed data is incomplete for testing risk analyzer.")
            else:
                print(f"Could not fetch complete raw data for {sample_ticker} to test risk analyzer.")
        else:
            print(f"Could not get ticker or RFR for {sample_ticker} to test risk analyzer.")

    except ImportError as e:
        print(f"ImportError during test: {e}. Ensure all modules are accessible.")
    except Exception as e:
        print(f"An error occurred during the risk_analyzer test: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Risk Analyzer Test Complete ---")

