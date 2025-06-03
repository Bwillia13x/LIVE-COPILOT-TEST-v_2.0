"""
Data Quality Assessment Module for EPV Valuation Model
Provides comprehensive data quality checks and scoring for financial data.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from .config_manager import get_config

class DataQualityChecker:
    """Comprehensive data quality assessment for financial statements."""
    
    def __init__(self):
        self.quality_score = 0
        self.quality_issues = []
        self.quality_warnings = []
        
    def assess_data_quality(self, 
                          income_stmt: pd.DataFrame,
                          balance_sheet: pd.DataFrame, 
                          cash_flow: pd.DataFrame,
                          stock_info: Dict) -> Dict[str, Any]:
        """
        Comprehensive data quality assessment.
        
        Returns:
            Dict containing quality score, issues, and detailed assessment
        """
        self.quality_score = 100  # Start with perfect score
        self.quality_issues = []
        self.quality_warnings = []
        
        # 1. Completeness Assessment
        completeness_score = self._assess_completeness(income_stmt, balance_sheet, cash_flow)
        
        # 2. Consistency Assessment  
        consistency_score = self._assess_consistency(income_stmt, balance_sheet, cash_flow)
        
        # 3. Outlier Detection
        outlier_score = self._detect_outliers(income_stmt, balance_sheet, cash_flow)
        
        # 4. Trend Analysis
        trend_score = self._assess_trends(income_stmt, balance_sheet, cash_flow)
        
        # 5. Balance Sheet Integrity
        balance_score = self._check_balance_sheet_integrity(balance_sheet)
        
        # Calculate weighted final score
        weights = {
            'completeness': 0.25,
            'consistency': 0.25, 
            'outliers': 0.20,
            'trends': 0.15,
            'balance': 0.15
        }
        
        final_score = (
            completeness_score * weights['completeness'] +
            consistency_score * weights['consistency'] +
            outlier_score * weights['outliers'] +
            trend_score * weights['trends'] +
            balance_score * weights['balance']
        )
        
        return {
            'overall_score': final_score,
            'component_scores': {
                'completeness': completeness_score,
                'consistency': consistency_score,
                'outliers': outlier_score,
                'trends': trend_score,
                'balance': balance_score
            },
            'quality_issues': self.quality_issues,
            'quality_warnings': self.quality_warnings,
            'recommendation': self._get_quality_recommendation(final_score)
        }
    
    def _assess_completeness(self, income_stmt: pd.DataFrame, 
                           balance_sheet: pd.DataFrame, 
                           cash_flow: pd.DataFrame) -> float:
        """Assess data completeness for key financial metrics."""
        score = 100
        config = get_config()
        
        # Key items that should be present
        required_is_items = [config.financial_item_names.s_revenue, config.financial_item_names.s_operating_income]
        required_bs_items = [config.financial_item_names.s_total_assets, config.financial_item_names.s_cash_equivalents]
        required_cf_items = [config.financial_item_names.s_capex]
        
        # Check income statement completeness
        missing_is = [item for item in required_is_items if item not in income_stmt.index]
        if missing_is:
            score -= 15 * len(missing_is)
            self.quality_issues.append(f"Missing key income statement items: {missing_is}")
            
        # Check for sufficient historical data (at least 5 years)
        min_years = 5
        for name, df in [("Income Statement", income_stmt), 
                        ("Balance Sheet", balance_sheet), 
                        ("Cash Flow", cash_flow)]:
            if len(df.columns) < min_years:
                score -= 10
                self.quality_warnings.append(f"{name} has only {len(df.columns)} years of data (minimum {min_years} recommended)")
        
        # Check data density (non-null values)
        for name, df in [("Income Statement", income_stmt), 
                        ("Balance Sheet", balance_sheet), 
                        ("Cash Flow", cash_flow)]:
            null_percentage = df.isnull().sum().sum() / (df.shape[0] * df.shape[1])
            if null_percentage > 0.1:  # More than 10% missing
                score -= 15
                self.quality_issues.append(f"{name} has {null_percentage:.1%} missing data")
            elif null_percentage > 0.05:  # More than 5% missing
                score -= 5
                self.quality_warnings.append(f"{name} has {null_percentage:.1%} missing data")
        
        return max(0, score)
    
    def _assess_consistency(self, income_stmt: pd.DataFrame,
                          balance_sheet: pd.DataFrame, 
                          cash_flow: pd.DataFrame) -> float:
        """Check for internal consistency across financial statements."""
        score = 100
        
        try:
            config = get_config()
            # Check if revenue is increasing over time (general expectation)
            if config.financial_item_names.s_revenue in income_stmt.index:
                revenue = income_stmt.loc[config.financial_item_names.s_revenue]
                # Check for unrealistic revenue changes (>200% year-over-year)
                revenue_changes = revenue.pct_change()
                extreme_changes = abs(revenue_changes) > 2.0  # 200% change
                if extreme_changes.any():
                    score -= 10
                    self.quality_warnings.append("Extreme revenue changes detected (>200% YoY)")
            
            # Check for negative values where they shouldn't be
            if config.financial_item_names.s_revenue in income_stmt.index:
                negative_revenue = (income_stmt.loc[config.financial_item_names.s_revenue] < 0).any()
                if negative_revenue:
                    score -= 20
                    self.quality_issues.append("Negative revenue detected")
            
            # Check operating margin consistency
            if (config.financial_item_names.s_revenue in income_stmt.index and 
                config.financial_item_names.s_operating_income in income_stmt.index):
                revenue = income_stmt.loc[config.financial_item_names.s_revenue]
                op_income = income_stmt.loc[config.financial_item_names.s_operating_income]
                op_margins = op_income / revenue
                
                # Check for unrealistic operating margins (>100% or <-100%)
                extreme_margins = (abs(op_margins) > 1.0).any()
                if extreme_margins:
                    score -= 15
                    self.quality_warnings.append("Extreme operating margins detected (>100%)")
        
        except Exception as e:
            self.quality_warnings.append(f"Error in consistency check: {e}")
            score -= 5
            
        return max(0, score)
    
    def _detect_outliers(self, income_stmt: pd.DataFrame,
                        balance_sheet: pd.DataFrame, 
                        cash_flow: pd.DataFrame) -> float:
        """Detect statistical outliers in key financial metrics."""
        score = 100
        
        try:
            config = get_config()
            # Check revenue for outliers using IQR method
            if config.financial_item_names.s_revenue in income_stmt.index:
                revenue = income_stmt.loc[config.financial_item_names.s_revenue]
                q1, q3 = revenue.quantile([0.25, 0.75])
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                outliers = ((revenue < lower_bound) | (revenue > upper_bound)).sum()
                if outliers > 0:
                    score -= min(10, outliers * 2)
                    self.quality_warnings.append(f"Revenue outliers detected: {outliers} data points")
            
            # Similar check for operating income
            if config.financial_item_names.s_operating_income in income_stmt.index:
                op_income = income_stmt.loc[config.financial_item_names.s_operating_income]
                # Check for years with operating losses when others are profitable
                positive_years = (op_income > 0).sum()
                negative_years = (op_income < 0).sum()
                
                if negative_years > 0 and positive_years > 0:
                    loss_ratio = negative_years / len(op_income)
                    if loss_ratio > 0.3:  # More than 30% loss years
                        score -= 10
                        self.quality_warnings.append(f"High proportion of loss years: {loss_ratio:.1%}")
        
        except Exception as e:
            self.quality_warnings.append(f"Error in outlier detection: {e}")
            score -= 5
            
        return max(0, score)
    
    def _assess_trends(self, income_stmt: pd.DataFrame,
                      balance_sheet: pd.DataFrame, 
                      cash_flow: pd.DataFrame) -> float:
        """Assess reasonableness of financial trends."""
        score = 100
        
        try:
            # Check revenue trend
            if config.S_REVENUE in income_stmt.index and len(income_stmt.columns) >= 3:
                revenue = income_stmt.loc[config.S_REVENUE]
                # Calculate trend (positive slope expected for healthy growth)
                years = range(len(revenue))
                correlation = np.corrcoef(years, revenue.values)[0, 1]
                
                if correlation < -0.5:  # Strong negative trend
                    score -= 15
                    self.quality_warnings.append("Strong declining revenue trend detected")
                elif correlation < 0:  # Any negative trend
                    score -= 5
                    self.quality_warnings.append("Declining revenue trend detected")
        
        except Exception as e:
            self.quality_warnings.append(f"Error in trend analysis: {e}")
            score -= 5
            
        return max(0, score)
    
    def _check_balance_sheet_integrity(self, balance_sheet: pd.DataFrame) -> float:
        """Check basic balance sheet accounting integrity."""
        score = 100
        
        try:
            # Check if basic balance sheet equation holds (if data available)
            if (config.S_TOTAL_ASSETS in balance_sheet.index and 
                config.S_TOTAL_LIABILITIES in balance_sheet.index and
                config.S_TOTAL_STOCKHOLDER_EQUITY in balance_sheet.index):
                
                assets = balance_sheet.loc[config.S_TOTAL_ASSETS]
                liabilities = balance_sheet.loc[config.S_TOTAL_LIABILITIES]
                equity = balance_sheet.loc[config.S_TOTAL_STOCKHOLDER_EQUITY]
                
                # Assets should equal Liabilities + Equity
                balance_check = abs((assets - (liabilities + equity)) / assets)
                
                # Allow for small rounding differences (1%)
                if (balance_check > 0.01).any():
                    score -= 20
                    self.quality_issues.append("Balance sheet does not balance (Assets ≠ Liabilities + Equity)")
                elif (balance_check > 0.005).any():
                    score -= 5
                    self.quality_warnings.append("Minor balance sheet imbalances detected")
        
        except Exception as e:
            self.quality_warnings.append(f"Error in balance sheet integrity check: {e}")
            score -= 5
            
        return max(0, score)
    
    def _get_quality_recommendation(self, score: float) -> str:
        """Get recommendation based on quality score."""
        if score >= 90:
            return "EXCELLENT - High confidence in data quality for EPV analysis"
        elif score >= 80:
            return "GOOD - Data quality sufficient for EPV analysis with minor concerns"
        elif score >= 70:
            return "FAIR - Proceed with caution, consider data quality issues in interpretation"
        elif score >= 60:
            return "POOR - Significant data quality concerns, results may be unreliable"
        else:
            return "CRITICAL - Data quality too poor for reliable EPV analysis"


def run_data_quality_assessment(income_stmt: pd.DataFrame,
                              balance_sheet: pd.DataFrame,
                              cash_flow: pd.DataFrame, 
                              stock_info: Dict) -> Dict[str, Any]:
    """
    Convenience function to run complete data quality assessment.
    
    Returns:
        Dict with quality assessment results
    """
    checker = DataQualityChecker()
    return checker.assess_data_quality(income_stmt, balance_sheet, cash_flow, stock_info)


if __name__ == "__main__":
    print("Data Quality Assessment Module")
    print("Usage: Import and call run_data_quality_assessment() with financial data") 