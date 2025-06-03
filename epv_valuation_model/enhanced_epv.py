"""
Enhanced EPV Calculation Module
Provides advanced EPV calculations with industry adjustments and sophisticated normalization.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from .config_manager import get_config
from . import epv_calculator

# Industry-specific multipliers and adjustments
INDUSTRY_ADJUSTMENTS = {
    'technology': {
        'rd_adjustment': 0.7,  # Treat 70% of R&D as growth capex
        'depreciation_multiplier': 1.5,  # Higher depreciation for tech assets
        'cyclical_factor': 1.2,  # Higher volatility adjustment
        'growth_persistence': 0.3  # 30% of historical growth assumed sustainable
    },
    'utilities': {
        'rd_adjustment': 0.1,  # Minimal R&D adjustment
        'depreciation_multiplier': 0.8,  # Lower depreciation for long-lived assets
        'cyclical_factor': 0.8,  # Lower volatility
        'regulatory_discount': 0.05  # 5% discount for regulatory risk
    },
    'consumer_staples': {
        'rd_adjustment': 0.4,
        'depreciation_multiplier': 1.0,
        'cyclical_factor': 0.9,
        'brand_premium': 0.1  # 10% premium for brand value
    },
    'financials': {
        'provision_normalization': True,  # Special handling for loan loss provisions
        'cyclical_factor': 1.4,  # Higher volatility adjustment
        'regulatory_buffer': 0.1  # 10% regulatory capital buffer
    },
    'energy': {
        'depletion_adjustment': True,  # Account for resource depletion
        'commodity_cycle_factor': 1.6,  # Very high volatility
        'reserve_life_adjustment': True
    },
    'default': {
        'rd_adjustment': 0.5,
        'depreciation_multiplier': 1.0,
        'cyclical_factor': 1.0
    }
}

class EnhancedEPVCalculator:
    """Advanced EPV calculator with industry-specific adjustments."""
    
    def __init__(self, industry: str = 'default'):
        self.industry = industry.lower().replace(' ', '_')
        self.adjustments = INDUSTRY_ADJUSTMENTS.get(self.industry, INDUSTRY_ADJUSTMENTS['default'])
        
    def calculate_enhanced_epv(self,
                             income_stmt: pd.DataFrame,
                             balance_sheet: pd.DataFrame,
                             cash_flow: pd.DataFrame,
                             stock_details: Dict,
                             market_data: Dict) -> Dict[str, Any]:
        """
        Calculate EPV with advanced industry-specific adjustments.
        
        Returns:
            Dict containing enhanced EPV calculations and components
        """
        
        # 1. Advanced Revenue Normalization
        normalized_revenue = self._normalize_revenue_advanced(income_stmt)
        
        # 2. Enhanced EBIT Calculation
        enhanced_ebit_data = self._calculate_enhanced_ebit(income_stmt, normalized_revenue)
        
        # 3. Advanced Maintenance Capex with Industry Adjustments
        enhanced_maintenance_capex = self._calculate_enhanced_maintenance_capex(
            income_stmt, balance_sheet, cash_flow
        )
        
        # 4. Industry-Adjusted Tax Rate
        industry_tax_rate = self._calculate_industry_adjusted_tax_rate(income_stmt)
        
        # 5. Calculate Enhanced NOPAT
        enhanced_nopat = enhanced_ebit_data['normalized_ebit'] * (1 - industry_tax_rate)
        
        # 6. Risk-Adjusted WACC
        risk_adjusted_wacc = self._calculate_risk_adjusted_wacc(
            stock_details, market_data, enhanced_ebit_data
        )
        
        # 7. Calculate EPV with Adjustments
        base_epv = enhanced_nopat / risk_adjusted_wacc
        
        # 8. Apply Industry-Specific Adjustments
        industry_adjusted_epv = self._apply_industry_adjustments(
            base_epv, enhanced_ebit_data, income_stmt, balance_sheet
        )
        
        # 9. Calculate Confidence Intervals
        confidence_intervals = self._calculate_confidence_intervals(
            industry_adjusted_epv, enhanced_ebit_data, risk_adjusted_wacc
        )
        
        return {
            'enhanced_epv': industry_adjusted_epv,
            'base_epv': base_epv,
            'normalized_revenue': normalized_revenue,
            'enhanced_ebit': enhanced_ebit_data,
            'enhanced_maintenance_capex': enhanced_maintenance_capex,
            'industry_tax_rate': industry_tax_rate,
            'enhanced_nopat': enhanced_nopat,
            'risk_adjusted_wacc': risk_adjusted_wacc,
            'confidence_intervals': confidence_intervals,
            'industry_adjustments_applied': self.adjustments,
            'methodology_notes': self._get_methodology_notes()
        }
    
    def _normalize_revenue_advanced(self, income_stmt: pd.DataFrame) -> float:
        """Advanced revenue normalization considering cyclicality and trends."""
        
        config = get_config()
        if config.financial_item_names.s_revenue not in income_stmt.index:
            return None
            
        revenue_series = income_stmt.loc[config.financial_item_names.s_revenue]
        
        # Method 1: Business Cycle Adjustment
        cycle_factor = self.adjustments.get('cyclical_factor', 1.0)
        
        # Method 2: Trend-Adjusted Average
        if len(revenue_series) >= 5:
            # Use weighted average giving more weight to recent years
            weights = np.array([0.4, 0.3, 0.2, 0.1])[:len(revenue_series)]
            weights = weights / weights.sum()  # Normalize weights
            trend_adjusted = np.average(revenue_series.values[:len(weights)], weights=weights)
        else:
            trend_adjusted = revenue_series.mean()
        
        # Method 3: Remove One-Time Events (simple heuristic)
        # Remove years with >50% change as potential one-time events
        revenue_changes = revenue_series.pct_change().abs()
        normal_revenue = revenue_series[revenue_changes < 0.5]
        
        if len(normal_revenue) >= 3:
            cleaned_average = normal_revenue.mean()
        else:
            cleaned_average = revenue_series.mean()
        
        # Combine methods with industry-specific weighting
        if self.industry in ['technology', 'energy']:
            # Higher weight on trend for volatile industries
            normalized = 0.5 * trend_adjusted + 0.5 * cleaned_average
        else:
            # More weight on cleaned average for stable industries
            normalized = 0.3 * trend_adjusted + 0.7 * cleaned_average
        
        # Apply cycle adjustment
        return normalized / cycle_factor
    
    def _calculate_enhanced_ebit(self, income_stmt: pd.DataFrame, 
                               normalized_revenue: float) -> Dict[str, Any]:
        """Calculate enhanced EBIT with industry-specific adjustments."""
        
        config = get_config()
        if config.financial_item_names.s_operating_income not in income_stmt.index:
            return None
            
        # Standard EBIT calculation
        ebit_series = income_stmt.loc[config.financial_item_names.s_operating_income]
        revenue_series = income_stmt.loc[config.financial_item_names.s_revenue]
        
        # Calculate operating margins
        operating_margins = ebit_series / revenue_series
        
        # Enhanced margin normalization
        enhanced_margins = self._normalize_operating_margins(operating_margins)
        
        # Apply R&D adjustments for certain industries
        rd_adjusted_margin = enhanced_margins
        if config.financial_item_names.s_research_development in income_stmt.index and 'rd_adjustment' in self.adjustments:
            rd_expense = income_stmt.loc[config.financial_item_names.s_research_development]
            avg_rd_expense = rd_expense.mean()
            
            # Treat portion of R&D as growth investment
            rd_adjustment_factor = self.adjustments['rd_adjustment']
            rd_add_back = avg_rd_expense * rd_adjustment_factor / normalized_revenue
            rd_adjusted_margin = enhanced_margins + rd_add_back
        
        normalized_ebit = normalized_revenue * rd_adjusted_margin
        
        return {
            'normalized_ebit': normalized_ebit,
            'enhanced_margin': rd_adjusted_margin,
            'raw_margin': enhanced_margins,
            'margin_volatility': operating_margins.std(),
            'margin_trend': np.corrcoef(range(len(operating_margins)), operating_margins)[0,1] if len(operating_margins) > 2 else 0
        }
    
    def _normalize_operating_margins(self, margins: pd.Series) -> float:
        """Advanced operating margin normalization."""
        
        # Remove outliers (beyond 2 standard deviations)
        mean_margin = margins.mean()
        std_margin = margins.std()
        
        outlier_threshold = 2 * std_margin
        clean_margins = margins[abs(margins - mean_margin) <= outlier_threshold]
        
        if len(clean_margins) < 3:
            clean_margins = margins  # Fall back to all data if too few points
        
        # Weighted average with higher weight on recent years
        if len(clean_margins) >= 3:
            weights = np.exp(np.linspace(0, 1, len(clean_margins)))  # Exponential weighting
            weights = weights / weights.sum()
            return np.average(clean_margins.values, weights=weights)
        else:
            return clean_margins.mean()
    
    def _calculate_enhanced_maintenance_capex(self,
                                            income_stmt: pd.DataFrame,
                                            balance_sheet: pd.DataFrame, 
                                            cash_flow: pd.DataFrame) -> Dict[str, Any]:
        """Enhanced maintenance capex calculation with industry adjustments."""
        
        # Start with standard calculation
        standard_maintenance_capex = epv_calculator.calculate_maintenance_capex(
            income_stmt, balance_sheet, cash_flow
        )
        
        if standard_maintenance_capex is None:
            return None
        
        # Industry-specific adjustments
        depreciation_multiplier = self.adjustments.get('depreciation_multiplier', 1.0)
        
        # Enhanced calculation considering asset intensity
        if config.S_DEPRECIATION_CF in cash_flow.index:
            avg_depreciation = abs(cash_flow.loc[config.S_DEPRECIATION_CF].mean())
            
            # Maintenance capex should be related to depreciation but adjusted for:
            # 1. Asset intensity of the industry
            # 2. Technology replacement cycles
            # 3. Regulatory requirements
            
            enhanced_maintenance_capex = avg_depreciation * depreciation_multiplier
            
            # Sanity check: maintenance capex shouldn't be dramatically different from depreciation
            ratio_check = enhanced_maintenance_capex / avg_depreciation
            if ratio_check > 3.0 or ratio_check < 0.3:
                enhanced_maintenance_capex = standard_maintenance_capex
                
        else:
            enhanced_maintenance_capex = standard_maintenance_capex
        
        return {
            'enhanced_maintenance_capex': enhanced_maintenance_capex,
            'standard_maintenance_capex': standard_maintenance_capex,
            'depreciation_multiplier_used': depreciation_multiplier,
            'industry_adjustment_applied': depreciation_multiplier != 1.0
        }
    
    def _calculate_industry_adjusted_tax_rate(self, income_stmt: pd.DataFrame) -> float:
        """Calculate industry-adjusted tax rate."""
        
        # Standard tax rate calculation
        if (config.S_PRETAX_INCOME in income_stmt.index and 
            config.S_TAX_PROVISION in income_stmt.index):
            
            pretax_income = income_stmt.loc[config.S_PRETAX_INCOME]
            tax_provision = income_stmt.loc[config.S_TAX_PROVISION]
            
            # Only use years with positive pretax income for tax rate calculation
            positive_years = pretax_income > 0
            if positive_years.any():
                effective_rates = (tax_provision[positive_years] / pretax_income[positive_years])
                avg_tax_rate = effective_rates.mean()
            else:
                avg_tax_rate = config.DEFAULT_EFFECTIVE_TAX_RATE
        else:
            avg_tax_rate = config.DEFAULT_EFFECTIVE_TAX_RATE
        
        # Industry-specific adjustments
        if self.industry == 'utilities' and 'regulatory_discount' in self.adjustments:
            # Utilities often have lower effective rates due to regulatory structure
            avg_tax_rate *= (1 - self.adjustments['regulatory_discount'])
        
        # Bounds checking
        return max(config.MIN_EFFECTIVE_TAX_RATE, 
                  min(config.MAX_EFFECTIVE_TAX_RATE, avg_tax_rate))
    
    def _calculate_risk_adjusted_wacc(self,
                                    stock_details: Dict,
                                    market_data: Dict,
                                    ebit_data: Dict) -> float:
        """Calculate risk-adjusted WACC with industry considerations."""
        
        # Standard WACC calculation
        base_wacc = epv_calculator.calculate_wacc(
            stock_details, {}, {}, market_data.get('risk_free_rate', 0.04)
        )
        
        if base_wacc is None:
            base_wacc = 0.10  # Default WACC
        
        # Industry risk adjustments
        industry_risk_premium = 0
        
        if self.industry == 'technology':
            # Higher risk for technology companies
            industry_risk_premium = 0.01
        elif self.industry == 'utilities':
            # Lower risk for utilities
            industry_risk_premium = -0.005
        elif self.industry == 'energy':
            # Higher risk for energy/commodity companies
            industry_risk_premium = 0.015
        
        # Business quality adjustment based on margin volatility
        margin_volatility = ebit_data.get('margin_volatility', 0)
        volatility_adjustment = min(0.02, margin_volatility * 0.1)  # Cap at 2%
        
        risk_adjusted_wacc = base_wacc + industry_risk_premium + volatility_adjustment
        
        return max(0.05, min(0.25, risk_adjusted_wacc))  # Reasonable bounds
    
    def _apply_industry_adjustments(self,
                                  base_epv: float,
                                  ebit_data: Dict,
                                  income_stmt: pd.DataFrame,
                                  balance_sheet: pd.DataFrame) -> float:
        """Apply final industry-specific adjustments to EPV."""
        
        adjusted_epv = base_epv
        
        # Brand premium for consumer companies
        if 'brand_premium' in self.adjustments:
            adjusted_epv *= (1 + self.adjustments['brand_premium'])
        
        # Regulatory discount for utilities
        if 'regulatory_discount' in self.adjustments:
            adjusted_epv *= (1 - self.adjustments['regulatory_discount'])
        
        # Technology obsolescence discount
        if self.industry == 'technology':
            # Discount for technology obsolescence risk
            tech_discount = 0.05  # 5% discount for tech obsolescence
            adjusted_epv *= (1 - tech_discount)
        
        return adjusted_epv
    
    def _calculate_confidence_intervals(self,
                                     epv_value: float,
                                     ebit_data: Dict,
                                     wacc: float) -> Dict[str, float]:
        """Calculate confidence intervals for EPV estimate."""
        
        # Base standard error estimation
        margin_volatility = ebit_data.get('margin_volatility', 0.05)
        
        # Confidence intervals based on margin volatility and industry
        industry_uncertainty = {
            'utilities': 0.15,      # 15% uncertainty
            'consumer_staples': 0.20,
            'technology': 0.35,     # 35% uncertainty for tech
            'energy': 0.40,         # 40% uncertainty for energy
            'financials': 0.30
        }.get(self.industry, 0.25)  # 25% default uncertainty
        
        # Combine margin volatility and industry uncertainty
        total_uncertainty = np.sqrt(margin_volatility**2 + industry_uncertainty**2)
        
        # Calculate confidence intervals (assuming normal distribution)
        confidence_95 = 1.96 * total_uncertainty * epv_value
        confidence_80 = 1.28 * total_uncertainty * epv_value
        
        return {
            'epv_low_95': epv_value - confidence_95,
            'epv_high_95': epv_value + confidence_95,
            'epv_low_80': epv_value - confidence_80,
            'epv_high_80': epv_value + confidence_80,
            'total_uncertainty': total_uncertainty,
            'confidence_score': max(0, min(100, 100 * (1 - total_uncertainty)))
        }
    
    def _get_methodology_notes(self) -> List[str]:
        """Get notes about methodology and adjustments applied."""
        
        notes = [
            f"Industry classification: {self.industry}",
            "Enhanced revenue normalization applied",
            "Operating margin outlier removal performed",
            "Industry-specific risk adjustments applied"
        ]
        
        if 'rd_adjustment' in self.adjustments:
            notes.append(f"R&D adjustment factor: {self.adjustments['rd_adjustment']}")
        
        if 'depreciation_multiplier' in self.adjustments:
            notes.append(f"Depreciation multiplier: {self.adjustments['depreciation_multiplier']}")
        
        if 'cyclical_factor' in self.adjustments:
            notes.append(f"Cyclical adjustment factor: {self.adjustments['cyclical_factor']}")
        
        return notes


def calculate_industry_epv(income_stmt: pd.DataFrame,
                         balance_sheet: pd.DataFrame,
                         cash_flow: pd.DataFrame,
                         stock_details: Dict,
                         market_data: Dict,
                         industry: str = 'default') -> Dict[str, Any]:
    """
    Convenience function for industry-specific EPV calculation.
    
    Args:
        income_stmt: Processed income statement data
        balance_sheet: Processed balance sheet data  
        cash_flow: Processed cash flow data
        stock_details: Stock information dictionary
        market_data: Market data including risk-free rate
        industry: Industry classification
        
    Returns:
        Dict with enhanced EPV calculations
    """
    calculator = EnhancedEPVCalculator(industry)
    return calculator.calculate_enhanced_epv(
        income_stmt, balance_sheet, cash_flow, stock_details, market_data
    )


if __name__ == "__main__":
    print("Enhanced EPV Calculation Module")
    print("Supports industry-specific adjustments and advanced normalization")
    print("Available industries:", list(INDUSTRY_ADJUSTMENTS.keys())) 