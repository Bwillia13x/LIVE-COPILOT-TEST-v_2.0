"""
Enhanced Command Line Interface for EPV Valuation Model
Provides a user-friendly CLI with comprehensive options and interactive features.
"""

import argparse
import sys
import os
from typing import Dict, List, Optional
import json
from datetime import datetime

# Rich for beautiful CLI output
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.prompt import Prompt, Confirm
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.syntax import Syntax
    from rich.tree import Tree
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

from . import main as epv_main
from .config_manager import get_config
from .data_quality import run_data_quality_assessment
from .enhanced_epv import calculate_industry_epv

class EPVCommandLineInterface:
    """Enhanced CLI for EPV valuation with interactive features."""
    
    def __init__(self):
        self.console = Console() if RICH_AVAILABLE else None
        
    def print_rich(self, content, style=None):
        """Print with rich formatting if available, otherwise plain text."""
        if self.console:
            if style:
                self.console.print(content, style=style)
            else:
                self.console.print(content)
        else:
            print(content)
    
    def create_parser(self) -> argparse.ArgumentParser:
        """Create comprehensive argument parser."""
        
        parser = argparse.ArgumentParser(
            description="Bruce Greenwald EPV Valuation Model - Enhanced CLI",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  %(prog)s --ticker AAPL --industry technology
  %(prog)s --sample-data MSFT --output-format json
  %(prog)s --interactive
  %(prog)s --batch-analysis tickers.txt
  %(prog)s --data-quality-check AAPL
            """
        )
        
        # Core functionality
        core_group = parser.add_argument_group('Core Analysis')
        core_group.add_argument(
            '--ticker', '-t',
            type=str,
            help='Stock ticker symbol (e.g., AAPL, MSFT)'
        )
        core_group.add_argument(
            '--sample-data', '-s',
            type=str,
            metavar='TICKER',
            help='Use sample data for specified ticker'
        )
        core_group.add_argument(
            '--industry', '-i',
            choices=['default', 'technology', 'utilities', 'consumer_staples', 
                    'financials', 'energy', 'healthcare', 'industrials'],
            default='default',
            help='Industry classification for specialized adjustments'
        )
        
        # Advanced options
        advanced_group = parser.add_argument_group('Advanced Options')
        # Get config for defaults
        config = get_config()
        
        advanced_group.add_argument(
            '--normalization-years',
            type=int,
            default=config.calculation.normalization_years,
            help='Years to use for financial metric normalization'
        )
        advanced_group.add_argument(
            '--risk-free-rate',
            type=float,
            help='Override risk-free rate (as decimal, e.g., 0.04 for 4%%)'
        )
        advanced_group.add_argument(
            '--equity-risk-premium',
            type=float,
            default=config.calculation.equity_risk_premium,
            help='Equity risk premium (as decimal)'
        )
        advanced_group.add_argument(
            '--confidence-level',
            type=float,
            choices=[0.80, 0.90, 0.95, 0.99],
            default=0.95,
            help='Confidence level for uncertainty analysis'
        )
        
        # Output options
        output_group = parser.add_argument_group('Output Options')
        output_group.add_argument(
            '--output-format', '-f',
            choices=['table', 'json', 'csv', 'detailed'],
            default='table',
            help='Output format for results'
        )
        output_group.add_argument(
            '--output-file', '-o',
            type=str,
            help='Save results to file'
        )
        output_group.add_argument(
            '--no-charts',
            action='store_true',
            help='Skip chart generation'
        )
        output_group.add_argument(
            '--quiet', '-q',
            action='store_true',
            help='Suppress progress messages'
        )
        output_group.add_argument(
            '--verbose', '-v',
            action='store_true',
            help='Enable verbose output'
        )
        
        # Special modes
        special_group = parser.add_argument_group('Special Modes')
        special_group.add_argument(
            '--interactive',
            action='store_true',
            help='Run in interactive mode'
        )
        special_group.add_argument(
            '--batch-analysis',
            type=str,
            metavar='FILE',
            help='Run batch analysis on multiple tickers from file'
        )
        special_group.add_argument(
            '--data-quality-check',
            type=str,
            metavar='TICKER',
            help='Run data quality assessment only'
        )
        special_group.add_argument(
            '--compare-tickers',
            nargs='+',
            metavar='TICKER',
            help='Compare multiple tickers side by side'
        )
        special_group.add_argument(
            '--config-wizard',
            action='store_true',
            help='Run configuration wizard'
        )
        
        return parser
    
    def run_interactive_mode(self):
        """Run interactive mode with user prompts."""
        
        self.print_welcome_banner()
        
        while True:
            self.print_rich("\n🎯 EPV Valuation Menu", style="bold blue")
            
            options = [
                "1. Single Stock Analysis",
                "2. Batch Analysis", 
                "3. Data Quality Check",
                "4. Compare Stocks",
                "5. Configuration",
                "6. Exit"
            ]
            
            for option in options:
                self.print_rich(f"   {option}")
            
            if RICH_AVAILABLE:
                choice = Prompt.ask("\nSelect option", choices=["1", "2", "3", "4", "5", "6"])
            else:
                choice = input("\nSelect option (1-6): ").strip()
            
            if choice == "1":
                self.interactive_single_analysis()
            elif choice == "2":
                self.interactive_batch_analysis()
            elif choice == "3":
                self.interactive_data_quality_check()
            elif choice == "4":
                self.interactive_compare_stocks()
            elif choice == "5":
                self.interactive_configuration()
            elif choice == "6":
                self.print_rich("👋 Goodbye!", style="green")
                break
            else:
                self.print_rich("❌ Invalid choice. Please try again.", style="red")
    
    def interactive_single_analysis(self):
        """Interactive single stock analysis."""
        
        if RICH_AVAILABLE:
            ticker = Prompt.ask("📊 Enter stock ticker").upper()
            use_sample = Confirm.ask("Use sample data instead of live data?", default=False)
            
            industries = ['default', 'technology', 'utilities', 'consumer_staples', 
                         'financials', 'energy', 'healthcare', 'industrials']
            industry = Prompt.ask("🏭 Select industry", choices=industries, default="default")
        else:
            ticker = input("Enter stock ticker: ").upper().strip()
            use_sample = input("Use sample data? (y/n): ").lower().startswith('y')
            industry = input("Industry (default): ").strip() or "default"
        
        self.run_single_analysis(ticker, use_sample, industry)
    
    def interactive_batch_analysis(self):
        """Interactive batch analysis setup."""
        
        if RICH_AVAILABLE:
            file_path = Prompt.ask("📁 Enter path to ticker file")
        else:
            file_path = input("Enter path to ticker file: ").strip()
        
        if os.path.exists(file_path):
            self.run_batch_analysis(file_path)
        else:
            self.print_rich("❌ File not found!", style="red")
    
    def interactive_data_quality_check(self):
        """Interactive data quality check."""
        
        if RICH_AVAILABLE:
            ticker = Prompt.ask("📊 Enter stock ticker for quality check").upper()
        else:
            ticker = input("Enter stock ticker: ").upper().strip()
        
        self.run_data_quality_check_only(ticker)
    
    def interactive_compare_stocks(self):
        """Interactive stock comparison."""
        
        if RICH_AVAILABLE:
            tickers_input = Prompt.ask("📊 Enter tickers separated by commas")
        else:
            tickers_input = input("Enter tickers separated by commas: ").strip()
        
        tickers = [t.strip().upper() for t in tickers_input.split(',')]
        if len(tickers) >= 2:
            self.run_comparison_analysis(tickers)
        else:
            self.print_rich("❌ Please enter at least 2 tickers", style="red")
    
    def interactive_configuration(self):
        """Interactive configuration setup."""
        
        self.print_rich("🔧 Configuration Menu", style="bold blue")
        self.print_rich("Configuration features would be implemented here...")
    
    def run_single_analysis(self, ticker: str, use_sample: bool, industry: str):
        """Run analysis for a single ticker."""
        
        try:
            if not self.console or self.console.is_terminal:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=self.console
                ) as progress:
                    task = progress.add_task(f"Analyzing {ticker}...", total=None)
                    
                    if use_sample:
                        results = epv_main.run_epv_valuation(ticker, use_sample_data_ticker=ticker)
                    else:
                        results = epv_main.run_epv_valuation(ticker)
            else:
                self.print_rich(f"🔄 Analyzing {ticker}...")
                if use_sample:
                    results = epv_main.run_epv_valuation(ticker, use_sample_data_ticker=ticker)
                else:
                    results = epv_main.run_epv_valuation(ticker)
            
            if results:
                self.display_results(results, 'table')
                self.print_rich("✅ Analysis completed successfully!", style="green")
            else:
                self.print_rich(f"❌ Failed to analyze {ticker}", style="red")
                
        except Exception as e:
            self.print_rich(f"❌ Error analyzing {ticker}: {e}", style="red")
    
    def run_batch_analysis(self, file_path: str):
        """Run batch analysis from file."""
        
        try:
            with open(file_path, 'r') as f:
                tickers = [line.strip().upper() for line in f if line.strip()]
            
            self.print_rich(f"🚀 Starting batch analysis for {len(tickers)} tickers...", style="blue")
            
            results = []
            for ticker in tickers:
                try:
                    self.print_rich(f"📊 Analyzing {ticker}...")
                    result = epv_main.run_epv_valuation(ticker)
                    if result:
                        results.append(result)
                        self.print_rich(f"✅ {ticker} completed", style="green")
                    else:
                        self.print_rich(f"❌ {ticker} failed", style="red")
                except Exception as e:
                    self.print_rich(f"❌ {ticker} error: {e}", style="red")
            
            # Display summary
            self.display_batch_summary(results)
            
        except Exception as e:
            self.print_rich(f"❌ Error in batch analysis: {e}", style="red")
    
    def run_data_quality_check_only(self, ticker: str):
        """Run data quality check only."""
        
        try:
            self.print_rich(f"🔍 Running data quality check for {ticker}...", style="blue")
            
            # This would need to be implemented to fetch data and run quality check
            self.print_rich("📊 Data quality analysis would be displayed here...")
            
        except Exception as e:
            self.print_rich(f"❌ Error in data quality check: {e}", style="red")
    
    def run_comparison_analysis(self, tickers: List[str]):
        """Run comparison analysis for multiple tickers."""
        
        self.print_rich(f"📊 Comparing {len(tickers)} stocks...", style="blue")
        
        results = []
        for ticker in tickers:
            try:
                result = epv_main.run_epv_valuation(ticker)
                if result:
                    results.append(result)
            except Exception as e:
                self.print_rich(f"❌ Error analyzing {ticker}: {e}", style="red")
        
        if len(results) >= 2:
            self.display_comparison_results(results)
        else:
            self.print_rich("❌ Need at least 2 successful analyses for comparison", style="red")
    
    def display_results(self, results: Dict, format_type: str):
        """Display results in specified format."""
        
        if format_type == 'table' and RICH_AVAILABLE:
            self.display_results_table(results)
        elif format_type == 'json':
            self.display_results_json(results)
        else:
            self.display_results_simple(results)
    
    def display_results_table(self, results: Dict):
        """Display results in rich table format."""
        
        table = Table(title=f"EPV Analysis Results - {results.get('ticker', 'Unknown')}")
        table.add_column("Metric", style="cyan", no_wrap=True)
        table.add_column("Value", style="magenta")
        table.add_column("Description", style="green")
        
        # Key metrics
        metrics = [
            ("Ticker", results.get('ticker', 'N/A'), "Stock symbol"),
            ("Current Price", f"${results.get('current_price', 0):,.2f}", "Current market price"),
            ("Market Cap", f"${results.get('market_cap', 0):,.0f}", "Current market capitalization"),
            ("EPV (Equity)", f"${results.get('epv_equity', 0):,.0f}", "Earnings Power Value"),
            ("Margin of Safety", f"{results.get('margin_of_safety_epv', 0):.1%}", "EPV vs Market Cap"),
            ("WACC", f"{results.get('wacc', 0):.2%}", "Weighted Average Cost of Capital"),
            ("Operating Margin", f"{results.get('avg_op_margin', 0):.2%}", "Average operating margin"),
            ("NOPAT", f"${results.get('nopat', 0):,.0f}", "Net Operating Profit After Tax")
        ]
        
        for metric, value, description in metrics:
            table.add_row(metric, value, description)
        
        self.console.print(table)
        
        # Recommendation
        margin_of_safety = results.get('margin_of_safety_epv', 0)
        if margin_of_safety > 0.30:
            recommendation = "🟢 POTENTIALLY UNDERVALUED"
            style = "green"
        elif margin_of_safety < -0.20:
            recommendation = "🔴 POTENTIALLY OVERVALUED"
            style = "red"
        else:
            recommendation = "🟡 FAIRLY VALUED"
            style = "yellow"
        
        panel = Panel(
            recommendation,
            title="Investment Recommendation",
            border_style=style
        )
        self.console.print(panel)
    
    def display_results_json(self, results: Dict):
        """Display results in JSON format."""
        
        # Clean results for JSON output
        clean_results = {}
        for key, value in results.items():
            if isinstance(value, (str, int, float, bool, type(None))):
                clean_results[key] = value
        
        if RICH_AVAILABLE:
            syntax = Syntax(json.dumps(clean_results, indent=2), "json", theme="monokai")
            self.console.print(syntax)
        else:
            print(json.dumps(clean_results, indent=2))
    
    def display_results_simple(self, results: Dict):
        """Display results in simple text format."""
        
        print(f"\n=== EPV Analysis Results - {results.get('ticker', 'Unknown')} ===")
        print(f"Current Price: ${results.get('current_price', 0):,.2f}")
        print(f"Market Cap: ${results.get('market_cap', 0):,.0f}")
        print(f"EPV (Equity): ${results.get('epv_equity', 0):,.0f}")
        print(f"Margin of Safety: {results.get('margin_of_safety_epv', 0):.1%}")
        print(f"WACC: {results.get('wacc', 0):.2%}")
        print(f"Operating Margin: {results.get('avg_op_margin', 0):.2%}")
    
    def display_batch_summary(self, results: List[Dict]):
        """Display summary of batch analysis results."""
        
        if not results:
            self.print_rich("❌ No successful analyses to display", style="red")
            return
        
        if RICH_AVAILABLE:
            table = Table(title="Batch Analysis Summary")
            table.add_column("Ticker", style="cyan")
            table.add_column("Current Price", style="magenta")
            table.add_column("EPV (Equity)", style="green")
            table.add_column("Margin of Safety", style="yellow")
            table.add_column("Recommendation", style="bold")
            
            for result in results:
                margin_of_safety = result.get('margin_of_safety_epv', 0)
                if margin_of_safety > 0.30:
                    recommendation = "🟢 UNDERVALUED"
                elif margin_of_safety < -0.20:
                    recommendation = "🔴 OVERVALUED"
                else:
                    recommendation = "🟡 FAIR VALUE"
                
                table.add_row(
                    result.get('ticker', 'N/A'),
                    f"${result.get('current_price', 0):,.2f}",
                    f"${result.get('epv_equity', 0):,.0f}",
                    f"{margin_of_safety:.1%}",
                    recommendation
                )
            
            self.console.print(table)
        else:
            print(f"\n=== Batch Analysis Summary ({len(results)} stocks) ===")
            for result in results:
                print(f"{result.get('ticker', 'N/A')}: EPV ${result.get('epv_equity', 0):,.0f}, "
                      f"MoS {result.get('margin_of_safety_epv', 0):.1%}")
    
    def display_comparison_results(self, results: List[Dict]):
        """Display comparison results."""
        
        if RICH_AVAILABLE:
            table = Table(title="Stock Comparison")
            table.add_column("Metric", style="cyan")
            
            for result in results:
                table.add_column(result.get('ticker', 'N/A'), style="magenta")
            
            metrics = [
                ('Current Price', 'current_price', '${:,.2f}'),
                ('Market Cap', 'market_cap', '${:,.0f}'),
                ('EPV (Equity)', 'epv_equity', '${:,.0f}'),
                ('Margin of Safety', 'margin_of_safety_epv', '{:.1%}'),
                ('WACC', 'wacc', '{:.2%}'),
                ('Operating Margin', 'avg_op_margin', '{:.2%}')
            ]
            
            for metric_name, key, format_str in metrics:
                row = [metric_name]
                for result in results:
                    value = result.get(key, 0)
                    if isinstance(value, (int, float)):
                        row.append(format_str.format(value))
                    else:
                        row.append(str(value))
                table.add_row(*row)
            
            self.console.print(table)
        else:
            print(f"\n=== Stock Comparison ===")
            tickers = [r.get('ticker', 'N/A') for r in results]
            print(f"Comparing: {', '.join(tickers)}")
            
            for result in results:
                print(f"\n{result.get('ticker', 'N/A')}:")
                print(f"  EPV: ${result.get('epv_equity', 0):,.0f}")
                print(f"  Margin of Safety: {result.get('margin_of_safety_epv', 0):.1%}")
    
    def print_welcome_banner(self):
        """Print welcome banner."""
        
        if RICH_AVAILABLE:
            banner = """
[bold blue]🏛️  Bruce Greenwald EPV Valuation Model[/bold blue]
[green]Enhanced Command Line Interface[/green]

[italic]Earnings Power Value Analysis with Industry-Specific Adjustments[/italic]
            """
            panel = Panel(banner, border_style="blue")
            self.console.print(panel)
        else:
            print("=" * 60)
            print("🏛️  Bruce Greenwald EPV Valuation Model")
            print("   Enhanced Command Line Interface")
            print("=" * 60)


def main():
    """Main CLI entry point."""
    
    cli = EPVCommandLineInterface()
    parser = cli.create_parser()
    
    # If no arguments provided, show help
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    args = parser.parse_args()
    
    # Handle special modes
    if args.interactive:
        cli.run_interactive_mode()
        return
    
    if args.config_wizard:
        cli.print_rich("🔧 Configuration wizard would be implemented here...")
        return
    
    if args.data_quality_check:
        cli.run_data_quality_check_only(args.data_quality_check)
        return
    
    if args.batch_analysis:
        cli.run_batch_analysis(args.batch_analysis)
        return
    
    if args.compare_tickers:
        cli.run_comparison_analysis(args.compare_tickers)
        return
    
    # Handle single ticker analysis
    if args.ticker:
        cli.run_single_analysis(args.ticker, False, args.industry)
    elif args.sample_data:
        cli.run_single_analysis(args.sample_data, True, args.industry)
    else:
        parser.print_help()


if __name__ == "__main__":
    main() 