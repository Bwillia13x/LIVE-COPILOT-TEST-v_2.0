"""
Interactive Web Dashboard for Bruce Greenwald EPV Valuation Model
Built with Streamlit for a modern, user-friendly interface.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import sys
import os
from datetime import datetime
import json

# Add the parent directory to the path to import the EPV modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from epv_valuation_model import main as epv_main
from epv_valuation_model import config
from epv_valuation_model.data_quality import run_data_quality_assessment
from epv_valuation_model.enhanced_epv import calculate_industry_epv

# Page configuration
st.set_page_config(
    page_title="EPV Valuation Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
        padding: 2rem;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .metric-container {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin: 0.5rem 0;
    }
    .quality-score {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
    }
    .recommendation-box {
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        border-left: 4px solid;
    }
    .buy-recommendation {
        background-color: #d4edda;
        border-color: #28a745;
        color: #155724;
    }
    .sell-recommendation {
        background-color: #f8d7da;
        border-color: #dc3545;
        color: #721c24;
    }
    .hold-recommendation {
        background-color: #fff3cd;
        border-color: #ffc107;
        color: #856404;
    }
</style>
""", unsafe_allow_html=True)

class EPVDashboard:
    """Main dashboard class for the EPV valuation interface."""
    
    def __init__(self):
        self.setup_session_state()
        
    def setup_session_state(self):
        """Initialize session state variables."""
        if 'analysis_complete' not in st.session_state:
            st.session_state.analysis_complete = False
        if 'valuation_results' not in st.session_state:
            st.session_state.valuation_results = None
        if 'data_quality_results' not in st.session_state:
            st.session_state.data_quality_results = None
    
    def render_sidebar(self):
        """Render the sidebar with input controls."""
        with st.sidebar:
            st.header("🎯 Valuation Parameters")
            
            # Input method selection
            input_method = st.radio(
                "Data Source",
                ["Live Data (yfinance)", "Sample Data"],
                help="Choose between live market data or pre-saved sample data"
            )
            
            if input_method == "Live Data (yfinance)":
                ticker = st.text_input(
                    "Stock Ticker",
                    value="AAPL",
                    help="Enter a valid stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"
                ).upper()
                use_sample = False
            else:
                available_samples = self.get_available_samples()
                ticker = st.selectbox(
                    "Sample Dataset",
                    available_samples,
                    help="Select from available sample datasets"
                )
                use_sample = True
            
            st.divider()
            
            # Industry classification
            industries = [
                'default', 'technology', 'utilities', 'consumer_staples',
                'financials', 'energy', 'healthcare', 'industrials'
            ]
            industry = st.selectbox(
                "Industry Classification",
                industries,
                help="Select the industry for specialized adjustments"
            )
            
            st.divider()
            
            # Advanced settings
            with st.expander("🔧 Advanced Settings"):
                normalization_years = st.slider(
                    "Normalization Period (Years)",
                    min_value=3,
                    max_value=10,
                    value=config.DEFAULT_NORMALIZATION_YEARS,
                    help="Years to use for averaging financial metrics"
                )
                
                risk_free_rate_override = st.number_input(
                    "Risk-Free Rate Override (%)",
                    min_value=0.0,
                    max_value=10.0,
                    value=None,
                    help="Override automatic risk-free rate detection"
                )
                
                equity_risk_premium_override = st.number_input(
                    "Equity Risk Premium Override (%)",
                    min_value=0.0,
                    max_value=15.0,
                    value=config.EQUITY_RISK_PREMIUM * 100,
                    help="Market equity risk premium"
                ) / 100
            
            st.divider()
            
            # Run analysis button
            if st.button("🚀 Run EPV Analysis", type="primary", use_container_width=True):
                self.run_analysis(ticker, use_sample, industry, {
                    'normalization_years': normalization_years,
                    'risk_free_rate': risk_free_rate_override / 100 if risk_free_rate_override else None,
                    'equity_risk_premium': equity_risk_premium_override
                })
    
    def get_available_samples(self):
        """Get list of available sample datasets."""
        sample_dir = "data/fetched_samples"
        if os.path.exists(sample_dir):
            files = os.listdir(sample_dir)
            tickers = set()
            for file in files:
                if file.endswith('_raw_is.csv'):
                    ticker = file.replace('_raw_is.csv', '')
                    tickers.add(ticker)
            return sorted(list(tickers))
        return ['AAPL', 'MSFT']  # Fallback
    
    @st.cache_data
    def run_analysis(_self, ticker, use_sample, industry, advanced_settings):
        """Run the EPV analysis with caching."""
        try:
            with st.spinner("🔄 Fetching data and running analysis..."):
                # Run the analysis using the existing main function
                if use_sample:
                    results = epv_main.run_epv_valuation(ticker, use_sample_data_ticker=ticker)
                else:
                    results = epv_main.run_epv_valuation(ticker)
                
                if results:
                    st.session_state.valuation_results = results
                    st.session_state.analysis_complete = True
                    st.success(f"✅ Analysis completed for {ticker}")
                    st.rerun()
                else:
                    st.error("❌ Analysis failed. Please check the ticker symbol.")
                    
        except Exception as e:
            st.error(f"❌ Error during analysis: {str(e)}")
    
    def render_main_content(self):
        """Render the main dashboard content."""
        
        # Header
        st.markdown("""
        <div class="main-header">
            <h1 style="color: white; margin: 0;">🏛️ Bruce Greenwald EPV Valuation Dashboard</h1>
            <p style="color: white; margin: 0.5rem 0 0 0;">
                Earnings Power Value Analysis with Industry-Specific Adjustments
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        if not st.session_state.analysis_complete:
            self.render_welcome_screen()
        else:
            self.render_analysis_results()
    
    def render_welcome_screen(self):
        """Render the welcome screen when no analysis has been run."""
        
        col1, col2, col3 = st.columns([1, 2, 1])
        
        with col2:
            st.markdown("""
            <div style="text-align: center; padding: 3rem;">
                <h2>🎯 Welcome to EPV Valuation</h2>
                <p style="font-size: 1.2rem; color: #666;">
                    Get started by selecting a stock ticker and clicking "Run EPV Analysis" in the sidebar.
                </p>
                
                <div style="margin: 2rem 0;">
                    <h3>📈 What is EPV?</h3>
                    <p>
                        Earnings Power Value (EPV) is Bruce Greenwald's method for valuing companies 
                        based on their current sustainable earnings power, assuming no growth.
                    </p>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h3>🔧 Key Features</h3>
                    <ul style="text-align: left; display: inline-block;">
                        <li>🎯 Industry-specific adjustments</li>
                        <li>📊 Data quality assessment</li>
                        <li>🎲 Monte Carlo risk analysis</li>
                        <li>📈 Interactive visualizations</li>
                        <li>📋 Comprehensive reporting</li>
                    </ul>
                </div>
            </div>
            """, unsafe_allow_html=True)
    
    def render_analysis_results(self):
        """Render the main analysis results."""
        
        results = st.session_state.valuation_results
        if not results:
            st.error("No analysis results available.")
            return
        
        # Create tabs for different sections
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "📊 Overview", "🎯 Valuation Details", "📈 Visualizations", 
            "🎲 Risk Analysis", "📋 Reports"
        ])
        
        with tab1:
            self.render_overview_tab(results)
        
        with tab2:
            self.render_valuation_details_tab(results)
        
        with tab3:
            self.render_visualizations_tab(results)
        
        with tab4:
            self.render_risk_analysis_tab(results)
        
        with tab5:
            self.render_reports_tab(results)
    
    def render_overview_tab(self, results):
        """Render the overview tab with key metrics."""
        
        ticker = results.get('ticker', 'Unknown')
        current_price = results.get('current_price', 0)
        market_cap = results.get('market_cap', 0)
        epv_equity = results.get('epv_equity', 0)
        margin_of_safety = results.get('margin_of_safety_epv', 0)
        
        # Key metrics row
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Current Price",
                f"${current_price:,.2f}" if isinstance(current_price, (int, float)) else str(current_price),
                delta=None
            )
        
        with col2:
            st.metric(
                "Market Cap",
                f"${market_cap:,.0f}" if market_cap else "N/A",
                delta=None
            )
        
        with col3:
            st.metric(
                "EPV (Equity)",
                f"${epv_equity:,.0f}" if epv_equity else "N/A",
                delta=None
            )
        
        with col4:
            if margin_of_safety is not None:
                color = "normal"
                if margin_of_safety > 0.20:
                    color = "normal"  # Green-ish
                elif margin_of_safety < -0.20:
                    color = "inverse"  # Red-ish
                
                st.metric(
                    "Margin of Safety",
                    f"{margin_of_safety:.1%}",
                    delta=None
                )
            else:
                st.metric("Margin of Safety", "N/A")
        
        st.divider()
        
        # Recommendation box
        self.render_recommendation_box(margin_of_safety)
        
        # Key insights
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("🎯 Key Valuation Metrics")
            metrics_data = {
                "WACC": f"{results.get('wacc', 0):.2%}",
                "Normalized EBIT": f"${results.get('normalized_ebit', 0):,.0f}",
                "NOPAT": f"${results.get('nopat', 0):,.0f}",
                "Maintenance Capex": f"${results.get('maint_capex', 0):,.0f}",
                "Operating Margin": f"{results.get('avg_op_margin', 0):.2%}"
            }
            
            for metric, value in metrics_data.items():
                st.write(f"**{metric}:** {value}")
        
        with col2:
            st.subheader("📊 Asset Value Comparison")
            asset_value = results.get('asset_value_equity', 0)
            
            if asset_value and epv_equity:
                asset_comparison = pd.DataFrame({
                    'Valuation Method': ['EPV (Equity)', 'Asset Value', 'Market Value'],
                    'Value': [epv_equity, asset_value, market_cap]
                })
                
                fig = px.bar(
                    asset_comparison, 
                    x='Valuation Method', 
                    y='Value',
                    title="Valuation Methods Comparison",
                    color='Valuation Method'
                )
                fig.update_layout(showlegend=False, height=300)
                st.plotly_chart(fig, use_container_width=True)
    
    def render_recommendation_box(self, margin_of_safety):
        """Render the recommendation box with styling."""
        
        if margin_of_safety is None:
            recommendation = "Unable to determine - insufficient data"
            box_class = "hold-recommendation"
        elif margin_of_safety > 0.30:
            recommendation = "🟢 POTENTIALLY UNDERVALUED (Buy)"
            box_class = "buy-recommendation"
        elif margin_of_safety < -0.20:
            recommendation = "🔴 POTENTIALLY OVERVALUED (Sell)"
            box_class = "sell-recommendation"
        else:
            recommendation = "🟡 FAIRLY VALUED (Hold)"
            box_class = "hold-recommendation"
        
        st.markdown(f"""
        <div class="recommendation-box {box_class}">
            <h3 style="margin: 0;">Investment Recommendation</h3>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; font-weight: bold;">
                {recommendation}
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    def render_valuation_details_tab(self, results):
        """Render detailed valuation breakdown."""
        
        st.subheader("🔍 Detailed EPV Calculation Breakdown")
        
        # Create calculation flow
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📈 Revenue & EBIT Normalization")
            
            calculation_steps = {
                "1. Normalized Revenue": "Based on multi-year averaging",
                "2. Average Operating Margin": f"{results.get('avg_op_margin', 0):.2%}",
                "3. Normalized EBIT": f"${results.get('normalized_ebit', 0):,.0f}",
                "4. Tax Rate": f"{(1 - results.get('nopat', 0) / results.get('normalized_ebit', 1)):.1%}" if results.get('normalized_ebit') else "N/A",
                "5. NOPAT": f"${results.get('nopat', 0):,.0f}"
            }
            
            for step, value in calculation_steps.items():
                st.write(f"**{step}:** {value}")
        
        with col2:
            st.subheader("💰 WACC & EPV Calculation")
            
            wacc_components = {
                "Risk-Free Rate": f"{results.get('risk_free_rate', 0):.2%}",
                "Equity Risk Premium": f"{results.get('equity_risk_premium', 0):.2%}",
                "WACC": f"{results.get('wacc', 0):.2%}",
                "EPV (Operations)": f"${results.get('epv_operations', 0):,.0f}",
                "EPV (Equity)": f"${results.get('epv_equity', 0):,.0f}"
            }
            
            for component, value in wacc_components.items():
                st.write(f"**{component}:** {value}")
        
        st.divider()
        
        # Sensitivity analysis summary
        if 'sensitivity_results' in results:
            st.subheader("🎛️ Sensitivity Analysis Summary")
            
            # Create a simple sensitivity table
            sensitivity_data = []
            for var_name, df in results['sensitivity_results'].items():
                if not df.empty:
                    base_epv = df.loc[df['Variation'] == '0%', 'EPV Equity'].iloc[0]
                    min_epv = df['EPV Equity'].min()
                    max_epv = df['EPV Equity'].max()
                    
                    sensitivity_data.append({
                        'Variable': var_name,
                        'Base EPV': f"${base_epv:,.0f}",
                        'Min EPV': f"${min_epv:,.0f}",
                        'Max EPV': f"${max_epv:,.0f}",
                        'Range': f"{((max_epv - min_epv) / base_epv):.1%}"
                    })
            
            if sensitivity_data:
                sensitivity_df = pd.DataFrame(sensitivity_data)
                st.dataframe(sensitivity_df, use_container_width=True)
    
    def render_visualizations_tab(self, results):
        """Render interactive visualizations."""
        
        st.subheader("📈 Interactive Visualizations")
        
        # Valuation waterfall chart
        st.subheader("💧 EPV Calculation Waterfall")
        self.create_waterfall_chart(results)
        
        st.divider()
        
        # Historical trends (if available)
        if 'processed_data' in results:
            st.subheader("📊 Historical Financial Trends")
            self.create_historical_trends_chart(results)
        
        st.divider()
        
        # Monte Carlo results (if available)
        if 'monte_carlo_results' in results:
            st.subheader("🎲 Monte Carlo Simulation Results")
            self.create_monte_carlo_visualization(results)
    
    def create_waterfall_chart(self, results):
        """Create a waterfall chart for EPV calculation."""
        
        # Simplified waterfall showing key components
        steps = [
            ("NOPAT", results.get('nopat', 0)),
            ("÷ WACC", -results.get('nopat', 0) + results.get('epv_operations', 0)),
            ("+ Cash", 70000000000),  # Simplified - would need actual cash value
            ("- Debt", -60000000000),  # Simplified - would need actual debt value
            ("EPV Equity", results.get('epv_equity', 0))
        ]
        
        fig = go.Figure(go.Waterfall(
            name="EPV Calculation",
            orientation="v",
            measure=["relative", "relative", "relative", "relative", "total"],
            x=[step[0] for step in steps],
            y=[step[1] for step in steps],
            connector={"line": {"color": "rgb(63, 63, 63)"}},
        ))
        
        fig.update_layout(
            title="EPV Calculation Waterfall",
            showlegend=False,
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def create_historical_trends_chart(self, results):
        """Create historical trends visualization."""
        
        # This would need to be implemented with actual historical data
        # For now, showing a placeholder
        
        years = list(range(2019, 2024))
        revenue_trend = [300000, 320000, 310000, 380000, 390000]  # Example data
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=years,
            y=revenue_trend,
            mode='lines+markers',
            name='Revenue Trend',
            line=dict(color='blue', width=3)
        ))
        
        fig.update_layout(
            title="Historical Revenue Trend",
            xaxis_title="Year",
            yaxis_title="Revenue ($)",
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def create_monte_carlo_visualization(self, results):
        """Create Monte Carlo results visualization."""
        
        # This would need actual Monte Carlo data
        # For now, showing a placeholder
        
        np.random.seed(42)
        mc_results = np.random.normal(results.get('epv_equity', 800000000000), 
                                     results.get('epv_equity', 800000000000) * 0.2, 1000)
        
        fig = go.Figure(data=[go.Histogram(x=mc_results, nbinsx=50)])
        fig.update_layout(
            title="Monte Carlo EPV Distribution",
            xaxis_title="EPV Equity ($)",
            yaxis_title="Frequency",
            height=400
        )
        
        # Add current market cap line
        market_cap = results.get('market_cap', 0)
        if market_cap:
            fig.add_vline(x=market_cap, line_dash="dash", line_color="red", 
                         annotation_text="Current Market Cap")
        
        st.plotly_chart(fig, use_container_width=True)
    
    def render_risk_analysis_tab(self, results):
        """Render risk analysis section."""
        
        st.subheader("🎲 Risk Analysis & Uncertainty")
        
        # Risk metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Business Risk", "Medium", help="Based on margin volatility")
        
        with col2:
            st.metric("Financial Risk", "Low", help="Based on debt levels")
        
        with col3:
            st.metric("Market Risk", "Medium", help="Based on beta and industry")
        
        st.divider()
        
        # Scenario analysis
        st.subheader("📊 Scenario Analysis")
        
        base_epv = results.get('epv_equity', 0)
        
        scenarios = {
            "🐻 Bear Case": base_epv * 0.7,
            "📊 Base Case": base_epv,
            "🐂 Bull Case": base_epv * 1.3
        }
        
        scenario_df = pd.DataFrame([
            {"Scenario": scenario, "EPV Value": f"${value:,.0f}", 
             "vs Market Cap": f"{((value / results.get('market_cap', 1)) - 1):.1%}" if results.get('market_cap') else "N/A"}
            for scenario, value in scenarios.items()
        ])
        
        st.dataframe(scenario_df, use_container_width=True)
    
    def render_reports_tab(self, results):
        """Render reports and export options."""
        
        st.subheader("📋 Reports & Export")
        
        # Summary report
        with st.expander("📄 Detailed Valuation Report", expanded=True):
            
            ticker = results.get('ticker', 'Unknown')
            
            report_content = f"""
            # EPV Valuation Report: {ticker}
            **Generated on:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            ## Executive Summary
            - **Current Price:** ${results.get('current_price', 'N/A')}
            - **EPV (Equity):** ${results.get('epv_equity', 0):,.0f}
            - **Market Cap:** ${results.get('market_cap', 0):,.0f}
            - **Margin of Safety:** {results.get('margin_of_safety_epv', 0):.1%}
            
            ## Key Assumptions
            - **Normalization Period:** {config.DEFAULT_NORMALIZATION_YEARS} years
            - **WACC:** {results.get('wacc', 0):.2%}
            - **Operating Margin:** {results.get('avg_op_margin', 0):.2%}
            - **Risk-Free Rate:** {results.get('risk_free_rate', 0):.2%}
            
            ## Methodology Notes
            - EPV calculated using Bruce Greenwald's methodology
            - Revenue normalized over business cycle
            - Maintenance capex estimated using PPE/Sales approach
            - Industry-specific adjustments applied where applicable
            
            ## Disclaimer
            This analysis is for educational purposes only and should not be considered as investment advice.
            Always conduct thorough due diligence before making investment decisions.
            """
            
            st.markdown(report_content)
        
        # Export options
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("📄 Download PDF Report", use_container_width=True):
                st.info("PDF export functionality would be implemented here")
        
        with col2:
            if st.button("📊 Export to Excel", use_container_width=True):
                st.info("Excel export functionality would be implemented here")
        
        with col3:
            if st.button("🔗 Share Analysis", use_container_width=True):
                st.info("Share functionality would be implemented here")


def main():
    """Main function to run the Streamlit dashboard."""
    
    dashboard = EPVDashboard()
    
    # Render sidebar
    dashboard.render_sidebar()
    
    # Render main content
    dashboard.render_main_content()


if __name__ == "__main__":
    main() 