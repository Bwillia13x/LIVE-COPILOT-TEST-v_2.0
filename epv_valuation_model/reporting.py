# epv_valuation_model/reporting.py
# This module is responsible for generating textual summaries and graphical outputs.

import matplotlib.pyplot as plt
import pandas as pd
import os
import numpy as np
from typing import Dict, Any, Optional, List

# Import configurations from config_manager.py
from .config_manager import get_config # Changed import
from . import utils

def generate_text_summary(valuation_results: Dict[str, Any]) -> str:
    app_config = get_config()
    """
    Generates a formatted textual summary of the EPV valuation results.

    Args:
        valuation_results (Dict[str, Any]): A dictionary containing the final valuation
                                            outputs, typically from main.py or a similar orchestrator.
                                            Expected keys include: 'ticker', 'current_price', 'currency',
                                            'market_cap', 'epv_equity', 'asset_value_equity',
                                            'margin_of_safety_epv', 'wacc', 'nopat', 'epv_operations',
                                            'normalized_ebit', 'avg_op_margin', 'maint_capex',
                                            'risk_free_rate', 'equity_risk_premium'.

    Returns:
        str: A multi-line string containing the formatted summary.
    """
    summary = []
    summary.append("=" * 60)
    summary.append(f"EPV VALUATION REPORT: {valuation_results.get('ticker', 'N/A')}")
    summary.append("=" * 60)

    # Add AI-generated company summary if available
    ai_summary = valuation_results.get('ai_company_summary')
    if ai_summary:
        summary.append("\n--- AI-Generated Company Summary ---")
        summary.append(ai_summary)
        summary.append("-" * 60)

    currency = valuation_results.get('currency', app_config.output.default_currency_symbol) # Updated
    cp = valuation_results.get('current_price', 'N/A')
    mc = valuation_results.get('market_cap', 0)
    ee = valuation_results.get('epv_equity', 0)
    av = valuation_results.get('asset_value_equity') # Can be None
    mos = valuation_results.get('margin_of_safety_epv') # Can be None

    summary.append("\n--- Market Data ---")
    summary.append(f"Current Market Price:       {currency}{cp:,.2f}" if isinstance(cp, (int, float)) else f"Current Market Price:       {cp}")
    summary.append(f"Market Capitalization:      {currency}{mc:,.0f}" if mc else "Market Capitalization:      N/A")

    summary.append("\n--- Core EPV Assumptions & Inputs ---")
    summary.append(f"Risk-Free Rate Used:        {valuation_results.get('risk_free_rate', 0):.3%}")
    summary.append(f"Equity Risk Premium Used:   {valuation_results.get('equity_risk_premium', app_config.calculation.equity_risk_premium):.3%}") # Updated
    summary.append(f"Calculated WACC:            {valuation_results.get('wacc', 0):.2%}")
    summary.append(f"Normalized Avg Op Margin:   {valuation_results.get('avg_op_margin', 0):.2%}")
    summary.append(f"Normalized EBIT:            {currency}{valuation_results.get('normalized_ebit', 0):,.0f}")
    summary.append(f"Normalized NOPAT:           {currency}{valuation_results.get('nopat', 0):,.0f}")
    summary.append(f"Estimated Maintenance Capex:{currency}{valuation_results.get('maint_capex', 0):,.0f}")


    summary.append("\n--- Valuation Results ---")
    summary.append(f"EPV (Operations):           {currency}{valuation_results.get('epv_operations', 0):,.0f}")
    summary.append(f"EPV (Equity):               {currency}{ee:,.0f}" if ee is not None else "EPV (Equity):               N/A")
    if av is not None:
        summary.append(f"Asset Value (Equity Proxy): {currency}{av:,.0f}")
    else:
        summary.append("Asset Value (Equity Proxy): Not Calculated / Available")

    summary.append("\n--- Margin of Safety & Conclusion ---")
    if mos is not None:
        summary.append(f"Margin of Safety (vs EPV):  {mos:.2%}")
        recommendation = "Fairly Valued (Hold/Review)"
        if mos > 0.30: recommendation = "Potentially Undervalued (Buy)"
        elif mos < -0.20: recommendation = "Potentially Overvalued (Sell)"
        summary.append(f"Initial Recommendation:     {recommendation}")
    else:
        summary.append("Margin of Safety (vs EPV):  N/A (Market Cap or EPV Equity missing)")
        summary.append("Initial Recommendation:     Requires Review")


    summary.append("\n" + "-" * 60)
    summary.append("Disclaimer: For educational purposes only. Not financial advice.")
    summary.append("Always conduct your own thorough research before making investment decisions.")
    summary.append("-" * 60)

    return "\n".join(summary)

def plot_valuation_comparison(
    ticker: str,
    epv_equity: float,
    market_cap: float,
    asset_value_equity: Optional[float],
    currency: Optional[str] = None, # Updated
    save_path: Optional[str] = None
) -> None:
    app_config = get_config()
    if currency is None:
        currency = app_config.output.default_currency_symbol # Updated
    """
    Generates and optionally saves a bar chart comparing EPV Equity, Market Cap, and Asset Value.

    Args:
        ticker (str): The stock ticker symbol.
        epv_equity (float): Calculated EPV of Equity.
        market_cap (float): Current market capitalization.
        asset_value_equity (Optional[float]): Calculated Asset Value of Equity. Can be None.
        currency (str): Currency symbol for y-axis label.
        save_path (Optional[str]): If provided, saves the plot to this file path.
    """
    print(f"\n--- Generating Valuation Comparison Plot for {ticker} ---")
    labels = ['EPV Equity', 'Market Cap']
    values = [epv_equity, market_cap]
    colors = ['skyblue', 'lightcoral']

    if asset_value_equity is not None:
        labels.append('Asset Value (Equity)')
        values.append(asset_value_equity)
        colors.append('lightgreen')

    if not values or all(v is None or pd.isna(v) for v in values):
        print(f"Warning: No valid data to plot for {ticker}.")
        return

    # Filter out None or NaN values before plotting to avoid errors
    valid_indices = [i for i, v in enumerate(values) if v is not None and not pd.isna(v)]
    labels = [labels[i] for i in valid_indices]
    values = [values[i] for i in valid_indices]
    colors = [colors[i] for i in valid_indices]

    if not values: # Check again after filtering
        print(f"Warning: No valid numeric data to plot for {ticker} after filtering.")
        return

    x_pos = np.arange(len(labels))

    plt.figure(figsize=(8, 6))
    bars = plt.bar(x_pos, values, align='center', alpha=0.7, color=colors)

    plt.ylabel(f'Value ({currency})')
    plt.xticks(x_pos, labels)
    plt.title(f'Valuation Comparison: {ticker}')
    plt.grid(axis='y', linestyle='--', alpha=0.7)

    # Add value labels on top of bars
    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2.0, yval + 0.01 * max(values, default=0), # Adjust offset based on max value
                 f'{currency}{yval:,.0f}', ha='center', va='bottom')


    if save_path:
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.savefig(save_path)
            print(f"Plot saved to {save_path}")
        except Exception as e:
            print(f"Error saving plot to {save_path}: {e}")
    else:
        plt.show() # Display the plot if not saving

    plt.close() # Close the plot figure to free memory

def plot_sensitivity_analysis(
    ticker: str,
    sensitivity_results: Dict[str, pd.DataFrame],
    currency: Optional[str] = None, # Updated
    save_dir: Optional[str] = None
) -> None:
    app_config = get_config()
    if currency is None:
        currency = app_config.output.default_currency_symbol # Updated
    """
    Generates and optionally saves line plots for sensitivity analysis results.

    Args:
        ticker (str): The stock ticker symbol.
        sensitivity_results (Dict[str, pd.DataFrame]): Output from risk_analyzer.run_sensitivity_analysis.
        currency (str): Currency symbol.
        save_dir (Optional[str]): Directory to save the plots. If None, plots are shown.
    """
    if not sensitivity_results:
        print("No sensitivity results to plot.")
        return

    print(f"\n--- Generating Sensitivity Analysis Plots for {ticker} ---")
    for var_name, df_result in sensitivity_results.items():
        if df_result.empty or 'EPV Equity' not in df_result.columns or var_name not in df_result.columns:
            print(f"Skipping plot for '{var_name}' due to missing data in results DataFrame.")
            continue

        plt.figure(figsize=(10, 6))
        plt.plot(df_result[var_name], df_result['EPV Equity'], marker='o', linestyle='-')
        plt.title(f'Sensitivity of EPV Equity to Changes in {var_name} for {ticker}')
        plt.xlabel(f'{var_name} Value')
        plt.ylabel(f'EPV Equity ({currency})')
        plt.grid(True, linestyle='--', alpha=0.7)
        # Format y-axis for large numbers
        current_values = plt.gca().get_yticks()
        plt.gca().set_yticklabels([f'{currency}{x:,.0f}' for x in current_values])
        # Format x-axis for percent variables
        if var_name in ['WACC', 'Avg Op Margin', 'Equity Risk Premium', 'Tax Rate']:
            current_x_values = plt.gca().get_xticks()
            plt.gca().set_xticklabels([f'{x:.2%}' for x in current_x_values])
        else:
            current_x_values = plt.gca().get_xticks()
            plt.gca().set_xticklabels([f'{x:,.0f}' for x in current_x_values])
        if save_dir:
            try:
                utils.ensure_directory_exists(save_dir)
                plot_filename = f"{ticker}_sensitivity_{var_name.replace(' ', '_')}.png"
                filepath = os.path.join(save_dir, plot_filename)
                plt.savefig(filepath)
                print(f"Sensitivity plot for {var_name} saved to {filepath}")
            except Exception as e:
                print(f"Error saving sensitivity plot for {var_name}: {e}")
            plt.close()
        else:
            plt.show()
            plt.close()

def export_valuation_results_to_csv(valuation_results: Dict[str, Any], save_path: str) -> None:
    """
    Exports the main valuation results dictionary to a flat CSV file.
    """
    try:
        # Flatten dict for single-row DataFrame
        df = pd.DataFrame([valuation_results])
        df.to_csv(save_path, index=False)
        print(f"Valuation results exported to CSV: {save_path}")
    except Exception as e:
        print(f"Error exporting valuation results to CSV: {e}")

def export_sensitivity_results_to_csv(sensitivity_results: Dict[str, pd.DataFrame], ticker: str, save_dir: str) -> None:
    """
    Exports each sensitivity DataFrame to a CSV file in the given directory.
    """
    if not sensitivity_results:
        print("No sensitivity results to export.")
        return
    utils.ensure_directory_exists(save_dir)
    for var_name, df in sensitivity_results.items():
        if df.empty:
            print(f"Skipping export for '{var_name}' (empty DataFrame).")
            continue
        filename = f"{ticker}_sensitivity_{var_name.replace(' ', '_')}.csv"
        filepath = os.path.join(save_dir, filename)
        try:
            df.to_csv(filepath, index=False)
            print(f"Sensitivity results for {var_name} exported to CSV: {filepath}")
        except Exception as e:
            print(f"Error exporting sensitivity results for {var_name} to CSV: {e}")

def plot_monte_carlo_histogram(
    ticker: str,
    mc_results_df: pd.DataFrame,
    currency: Optional[str] = None, # Updated
    save_path: Optional[str] = None
) -> None:
    app_config = get_config()
    if currency is None:
        currency = app_config.output.default_currency_symbol # Updated
    """
    Plots and optionally saves a histogram of simulated EPV Equity values from Monte Carlo results.
    """
    if mc_results_df is None or mc_results_df.empty or 'Simulated EPV Equity' not in mc_results_df.columns:
        print("No Monte Carlo results to plot.")
        return
    plt.figure(figsize=(10, 6))
    plt.hist(mc_results_df['Simulated EPV Equity'], bins=30, color='skyblue', edgecolor='black', alpha=0.7)
    plt.title(f'Monte Carlo Simulation: EPV Equity Distribution for {ticker}')
    plt.xlabel(f'EPV Equity ({currency})')
    plt.ylabel('Frequency')
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    # Format x-axis for large numbers
    current_x_values = plt.gca().get_xticks()
    plt.gca().set_xticklabels([f'{currency}{x:,.0f}' for x in current_x_values])
    if save_path:
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.savefig(save_path)
            print(f"Monte Carlo histogram saved to: {save_path}")
        except Exception as e:
            print(f"Error saving Monte Carlo histogram: {e}")
        plt.close()
    else:
        plt.show()
        plt.close()

def export_monte_carlo_results_to_csv(mc_results_df: pd.DataFrame, save_path: str) -> None:
    """
    Exports the Monte Carlo simulation results DataFrame to a CSV file.
    """
    if mc_results_df is None or mc_results_df.empty:
        print("No Monte Carlo results to export.")
        return
    try:
        mc_results_df.to_csv(save_path, index=False)
        print(f"Monte Carlo results exported to CSV: {save_path}")
    except Exception as e:
        print(f"Error exporting Monte Carlo results to CSV: {e}")

def plot_historical_trends(
    ticker: str,
    processed_data: Dict[str, Any],
    currency: Optional[str] = None, # Updated
    save_dir: Optional[str] = None
) -> None:
    app_config = get_config()
    if currency is None:
        currency = app_config.output.default_currency_symbol # Updated
    """
    Plots and saves historical trends for key metrics from processed financial statements.
    """
    is_proc = processed_data.get('income_statement')
    if is_proc is None or is_proc.empty:
        print("No income statement data for historical plots.")
        return
    metrics = [
        (app_config.financial_item_names.s_revenue, 'Total Revenue'), # Updated
        (app_config.financial_item_names.s_operating_income, 'Operating Income'), # Updated
        (app_config.financial_item_names.s_net_income, 'Net Income'), # Updated
    ]
    # Plot each metric
    for metric_key, metric_label in metrics:
        if metric_key in is_proc.index:
            plt.figure(figsize=(10, 6))
            plt.plot(is_proc.columns, is_proc.loc[metric_key], marker='o', linestyle='-')
            plt.title(f'{metric_label} Trend for {ticker}')
            plt.xlabel('Year')
            plt.ylabel(f'{metric_label} ({currency})')
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.gca().set_xticks(is_proc.columns)
            plt.gca().set_xticklabels([str(y) for y in is_proc.columns])
            plt.gca().set_yticklabels([f'{currency}{x:,.0f}' for x in plt.gca().get_yticks()])
            if save_dir:
                utils.ensure_directory_exists(save_dir)
                plot_filename = f"{ticker}_historical_{metric_label.replace(' ', '_')}.png"
                filepath = os.path.join(save_dir, plot_filename)
                plt.savefig(filepath)
                print(f"Historical plot for {metric_label} saved to {filepath}")
                plt.close()
            else:
                plt.show()
                plt.close()
    # Operating Margin
    if app_config.financial_item_names.s_revenue in is_proc.index and \
       app_config.financial_item_names.s_operating_income in is_proc.index: # Updated
        op_margin = is_proc.loc[app_config.financial_item_names.s_operating_income] / is_proc.loc[app_config.financial_item_names.s_revenue] # Updated
        plt.figure(figsize=(10, 6))
        plt.plot(is_proc.columns, op_margin, marker='o', linestyle='-')
        plt.title(f'Operating Margin Trend for {ticker}')
        plt.xlabel('Year')
        plt.ylabel('Operating Margin')
        plt.grid(True, linestyle='--', alpha=0.7)
        plt.gca().set_xticks(is_proc.columns)
        plt.gca().set_xticklabels([str(y) for y in is_proc.columns])
        plt.gca().set_yticklabels([f'{x:.2%}' for x in plt.gca().get_yticks()])
        if save_dir:
            utils.ensure_directory_exists(save_dir)
            plot_filename = f"{ticker}_historical_Operating_Margin.png"
            filepath = os.path.join(save_dir, plot_filename)
            plt.savefig(filepath)
            print(f"Historical plot for Operating Margin saved to {filepath}")
            plt.close()
        else:
            plt.show()
            plt.close()

def plot_tornado_sensitivity(
    ticker: str,
    sensitivity_results: Dict[str, pd.DataFrame],
    currency: Optional[str] = None, # Updated
    save_path: Optional[str] = None
) -> None:
    app_config = get_config()
    if currency is None:
        currency = app_config.output.default_currency_symbol # Updated
    """
    Plots and saves a tornado chart showing the range of EPV Equity for each sensitivity variable.
    For each variable, a horizontal bar is drawn from min to max EPV Equity, with the base value marked.
    Value labels are added for min, max, and base. A legend is included for clarity.
    Args:
        ticker (str): The stock ticker symbol.
        sensitivity_results (Dict[str, pd.DataFrame]): Output from risk_analyzer.run_sensitivity_analysis.
        currency (str): Currency symbol for axis labels.
        save_path (Optional[str]): If provided, saves the plot to this file path.
    """
    if not sensitivity_results:
        print("No sensitivity results for tornado plot.")
        return
    var_names = []
    min_vals = []
    max_vals = []
    base_vals = []
    for var, df in sensitivity_results.items():
        if df.empty or 'EPV Equity' not in df.columns:
            continue
        var_names.append(var)
        min_vals.append(df['EPV Equity'].min())
        max_vals.append(df['EPV Equity'].max())
        # Try to get the base (0% variation) value
        base_row = df[df['Variation'] == '0%']
        if not base_row.empty:
            base_vals.append(base_row['EPV Equity'].values[0])
        else:
            base_vals.append(df['EPV Equity'].iloc[len(df)//2])
    if not var_names:
        print("No valid sensitivity data for tornado plot.")
        return
    ranges = [abs(max_v - min_v) for min_v, max_v in zip(min_vals, max_vals)]
    sorted_idx = np.argsort(ranges)[::-1]
    var_names = [var_names[i] for i in sorted_idx]
    min_vals = [min_vals[i] for i in sorted_idx]
    max_vals = [max_vals[i] for i in sorted_idx]
    base_vals = [base_vals[i] for i in sorted_idx]
    plt.figure(figsize=(11, 7))
    for i, var in enumerate(var_names):
        # Draw the tornado bar
        plt.plot([min_vals[i], max_vals[i]], [var, var], color='deepskyblue', linewidth=12, solid_capstyle='butt', label='Range' if i == 0 else "")
        # Mark the base value
        plt.plot(base_vals[i], var, marker='o', color='black', markersize=10, label='Base Value' if i == 0 else "")
        # Add value labels
        plt.text(min_vals[i], var, f'{currency}{min_vals[i]:,.0f}', va='center', ha='right', fontsize=9, color='navy')
        plt.text(max_vals[i], var, f'{currency}{max_vals[i]:,.0f}', va='center', ha='left', fontsize=9, color='navy')
        plt.text(base_vals[i], var, f'{currency}{base_vals[i]:,.0f}', va='bottom', ha='center', fontsize=9, color='black', fontweight='bold')
    plt.title(f'Tornado Plot: Sensitivity of EPV Equity for {ticker}')
    plt.xlabel(f'EPV Equity ({currency})')
    plt.ylabel('Variable')
    plt.grid(axis='x', linestyle='--', alpha=0.7)
    plt.gca().set_yticks(var_names)
    plt.gca().set_yticklabels(var_names)
    plt.gca().set_xticklabels([f'{currency}{x:,.0f}' for x in plt.gca().get_xticks()])
    handles, labels = plt.gca().get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    plt.legend(by_label.values(), by_label.keys(), loc='lower right')
    plt.tight_layout()
    if save_path:
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.savefig(save_path)
            print(f"Tornado plot saved to: {save_path}")
        except Exception as e:
            print(f"Error saving tornado plot: {e}")
        plt.close()
    else:
        plt.show()
        plt.close()

# --- Main execution block for testing this module directly ---
if __name__ == "__main__":
    print("--- Testing Reporting Module ---")

    # Sample valuation results (mimicking output from main.py or epv_calculator)
    sample_results = {
        'ticker': 'XYZ',
        'current_price': 150.75,
        'currency': '$',
        'market_cap': 150750000000, # 150.75B
        'epv_equity': 180000000000, # 180B
        'asset_value_equity': 95000000000, # 95B
        'margin_of_safety_epv': (180e9 - 150.75e9) / 180e9 if 180e9 else 0,
        'wacc': 0.085,
        'nopat': 15300000000, # 180B * 0.085
        'epv_operations': 175000000000, # Example
        'normalized_ebit': 20000000000, # Example
        'avg_op_margin': 0.20, # Example
        'maint_capex': 2000000000, # Example
        'risk_free_rate': 0.03,
        'equity_risk_premium': 0.055,
    }

    # 1. Test Text Summary
    summary_text = generate_text_summary(sample_results)
    print("\n--- Generated Text Summary ---")
    print(summary_text)

    # 2. Test Plotting
    # Define a path to save the plot (optional)
    # Ensure the 'data/reports/' directory exists or is created by the function
    plot_file_name = f"{sample_results['ticker']}_valuation_comparison.png"
    # Construct path relative to this script or use absolute path
    # For simplicity, saving in a 'reports_test' subdir of where script is run
    # In main.py, we'd use config.REPORTS_DIR
    test_reports_dir = "reports_test_output" 
    if not os.path.exists(test_reports_dir):
        os.makedirs(test_reports_dir, exist_ok=True)
    
    save_location = os.path.join(test_reports_dir, plot_file_name)


    plot_valuation_comparison(
        ticker=sample_results['ticker'],
        epv_equity=sample_results['epv_equity'],
        market_cap=sample_results['market_cap'],
        asset_value_equity=sample_results['asset_value_equity'],
        currency=sample_results['currency'],
        save_path=save_location # Set to None to display instead of saving
    )
    
    # Test with missing asset value
    sample_results_no_av = sample_results.copy()
    sample_results_no_av['asset_value_equity'] = None
    sample_results_no_av['ticker'] = "ABC_NO_AV"
    plot_file_name_no_av = f"{sample_results_no_av['ticker']}_valuation_comparison.png"
    save_location_no_av = os.path.join(test_reports_dir, plot_file_name_no_av)

    plot_valuation_comparison(
        ticker=sample_results_no_av['ticker'],
        epv_equity=sample_results_no_av['epv_equity'],
        market_cap=sample_results_no_av['market_cap'],
        asset_value_equity=sample_results_no_av['asset_value_equity'],
        currency=sample_results_no_av['currency'],
        save_path=save_location_no_av
    )

    print("\n--- Reporting Module Test Complete ---")
    print(f"Check '{test_reports_dir}/' for plot outputs if save_path was used.")

