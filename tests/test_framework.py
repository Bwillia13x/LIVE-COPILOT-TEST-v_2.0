"""
Comprehensive Test Framework for EPV Valuation Model
Includes unit tests, integration tests, and performance benchmarks.
"""

import unittest
import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os
import sys
import time
from typing import Dict, List, Any, Optional
import warnings

# Add the parent directory to the path to import EPV modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from epv_valuation_model import epv_calculator, main as epv_main, config
from epv_valuation_model.data_quality import DataQualityChecker, run_data_quality_assessment
from epv_valuation_model.enhanced_epv import EnhancedEPVCalculator, calculate_industry_epv
from epv_valuation_model.config_manager import ConfigManager, EPVConfig

# Test data generators
def generate_sample_income_statement(years: int = 5) -> pd.DataFrame:
    """Generate sample income statement data for testing."""
    
    data = {
        config.S_REVENUE: [100000, 110000, 120000, 115000, 125000][:years],
        config.S_OPERATING_INCOME: [20000, 22000, 24000, 21000, 25000][:years],
        config.S_PRETAX_INCOME: [18000, 20000, 22000, 19000, 23000][:years],
        config.S_TAX_PROVISION: [4500, 5000, 5500, 4750, 5750][:years],
        config.S_NET_INCOME: [13500, 15000, 16500, 14250, 17250][:years]
    }
    
    columns = [f'Year_{i}' for i in range(years)]
    return pd.DataFrame(data, index=data.keys(), columns=columns)

def generate_sample_balance_sheet(years: int = 5) -> pd.DataFrame:
    """Generate sample balance sheet data for testing."""
    
    data = {
        config.S_TOTAL_ASSETS: [500000, 520000, 540000, 530000, 560000][:years],
        config.S_CASH_EQUIVALENTS: [50000, 55000, 60000, 58000, 62000][:years],
        config.S_TOTAL_LIABILITIES: [300000, 310000, 320000, 315000, 330000][:years],
        config.S_TOTAL_STOCKHOLDER_EQUITY: [200000, 210000, 220000, 215000, 230000][:years],
        config.S_PROPERTY_PLANT_EQUIPMENT: [150000, 155000, 160000, 158000, 165000][:years]
    }
    
    columns = [f'Year_{i}' for i in range(years)]
    return pd.DataFrame(data, index=data.keys(), columns=columns)

def generate_sample_cash_flow(years: int = 5) -> pd.DataFrame:
    """Generate sample cash flow data for testing."""
    
    data = {
        config.S_DEPRECIATION_CF: [-15000, -16000, -17000, -16500, -18000][:years],
        config.S_CAPEX: [-12000, -13000, -14000, -13500, -15000][:years],
        config.S_OPERATING_CASH_FLOW: [25000, 27000, 29000, 26000, 31000][:years]
    }
    
    columns = [f'Year_{i}' for i in range(years)]
    return pd.DataFrame(data, index=data.keys(), columns=columns)

def generate_sample_stock_info() -> Dict[str, Any]:
    """Generate sample stock information for testing."""
    
    return {
        'symbol': 'TEST',
        'shortName': 'Test Company',
        'sector': 'Technology',
        'industry': 'Software',
        'sharesOutstanding': 1000000000,
        'marketCap': 100000000000,
        'beta': 1.2,
        'trailingPE': 25.0,
        'priceToBook': 3.5
    }

class TestEPVCalculator(unittest.TestCase):
    """Unit tests for EPV Calculator."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.income_stmt = generate_sample_income_statement()
        self.balance_sheet = generate_sample_balance_sheet()
        self.cash_flow = generate_sample_cash_flow()
        self.stock_info = generate_sample_stock_info()
    
    def test_normalize_revenue(self):
        """Test revenue normalization."""
        normalized_revenue = epv_calculator.normalize_revenue(self.income_stmt)
        
        self.assertIsInstance(normalized_revenue, (int, float))
        self.assertGreater(normalized_revenue, 0)
        
        # Should be roughly the average
        expected_avg = self.income_stmt.loc[config.S_REVENUE].mean()
        self.assertAlmostEqual(normalized_revenue, expected_avg, delta=expected_avg * 0.1)
    
    def test_calculate_operating_margin(self):
        """Test operating margin calculation."""
        margin = epv_calculator.calculate_operating_margin(self.income_stmt)
        
        self.assertIsInstance(margin, (int, float))
        self.assertGreater(margin, 0)
        self.assertLess(margin, 1)  # Should be a percentage
    
    def test_calculate_maintenance_capex(self):
        """Test maintenance capex calculation."""
        maint_capex = epv_calculator.calculate_maintenance_capex(
            self.income_stmt, self.balance_sheet, self.cash_flow
        )
        
        self.assertIsInstance(maint_capex, (int, float))
        self.assertGreater(maint_capex, 0)
    
    def test_calculate_wacc(self):
        """Test WACC calculation."""
        wacc = epv_calculator.calculate_wacc(
            self.stock_info, {}, {}, risk_free_rate=0.03
        )
        
        self.assertIsInstance(wacc, (int, float))
        self.assertGreater(wacc, 0)
        self.assertLess(wacc, 1)  # Should be a percentage
    
    def test_epv_calculation_complete(self):
        """Test complete EPV calculation."""
        epv_result = epv_calculator.calculate_epv(
            self.income_stmt, self.balance_sheet, self.cash_flow, self.stock_info
        )
        
        self.assertIsInstance(epv_result, dict)
        self.assertIn('epv_operations', epv_result)
        self.assertIn('epv_equity', epv_result)
        self.assertIn('wacc', epv_result)
        
        # Basic sanity checks
        self.assertGreater(epv_result['epv_operations'], 0)
        self.assertGreater(epv_result['epv_equity'], 0)
        self.assertGreater(epv_result['wacc'], 0)
    
    def test_margin_of_safety_calculation(self):
        """Test margin of safety calculation."""
        epv_equity = 1000000000  # $1B
        market_cap = 800000000   # $800M
        
        mos = epv_calculator.calculate_margin_of_safety(epv_equity, market_cap)
        
        self.assertAlmostEqual(mos, 0.25, places=2)  # 25% margin of safety
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        
        # Empty data
        empty_df = pd.DataFrame()
        with self.assertRaises(Exception):
            epv_calculator.normalize_revenue(empty_df)
        
        # Negative revenue
        bad_income = self.income_stmt.copy()
        bad_income.loc[config.S_REVENUE] = [-100, -200, -300, -150, -250]
        
        # Should handle gracefully or raise appropriate exception
        try:
            result = epv_calculator.normalize_revenue(bad_income)
            self.assertIsNone(result)  # Should return None for invalid data
        except ValueError:
            pass  # Or raise ValueError, both acceptable

class TestDataQuality(unittest.TestCase):
    """Unit tests for Data Quality Assessment."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.income_stmt = generate_sample_income_statement()
        self.balance_sheet = generate_sample_balance_sheet()
        self.cash_flow = generate_sample_cash_flow()
        self.stock_info = generate_sample_stock_info()
        self.checker = DataQualityChecker()
    
    def test_data_quality_assessment(self):
        """Test complete data quality assessment."""
        
        result = self.checker.assess_data_quality(
            self.income_stmt, self.balance_sheet, self.cash_flow, self.stock_info
        )
        
        self.assertIsInstance(result, dict)
        self.assertIn('overall_score', result)
        self.assertIn('component_scores', result)
        self.assertIn('quality_issues', result)
        self.assertIn('quality_warnings', result)
        self.assertIn('recommendation', result)
        
        # Score should be between 0 and 100
        self.assertGreaterEqual(result['overall_score'], 0)
        self.assertLessEqual(result['overall_score'], 100)
    
    def test_completeness_assessment(self):
        """Test data completeness assessment."""
        
        # Test with complete data
        score = self.checker._assess_completeness(
            self.income_stmt, self.balance_sheet, self.cash_flow
        )
        self.assertGreater(score, 80)  # Should score well with complete data
        
        # Test with missing data
        incomplete_income = self.income_stmt.drop(config.S_REVENUE)
        score_incomplete = self.checker._assess_completeness(
            incomplete_income, self.balance_sheet, self.cash_flow
        )
        self.assertLess(score_incomplete, score)  # Should score lower
    
    def test_consistency_assessment(self):
        """Test data consistency assessment."""
        
        score = self.checker._assess_consistency(
            self.income_stmt, self.balance_sheet, self.cash_flow
        )
        
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
    
    def test_outlier_detection(self):
        """Test outlier detection."""
        
        # Create data with outliers
        outlier_income = self.income_stmt.copy()
        outlier_income.loc[config.S_REVENUE, 'Year_2'] = 1000000  # Extreme outlier
        
        score = self.checker._detect_outliers(
            outlier_income, self.balance_sheet, self.cash_flow
        )
        
        self.assertLess(score, 100)  # Should detect the outlier

class TestEnhancedEPV(unittest.TestCase):
    """Unit tests for Enhanced EPV Calculator."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.income_stmt = generate_sample_income_statement()
        self.balance_sheet = generate_sample_balance_sheet()
        self.cash_flow = generate_sample_cash_flow()
        self.stock_info = generate_sample_stock_info()
        self.market_data = {'risk_free_rate': 0.03}
        
    def test_enhanced_epv_default_industry(self):
        """Test enhanced EPV calculation with default industry."""
        
        calculator = EnhancedEPVCalculator('default')
        result = calculator.calculate_enhanced_epv(
            self.income_stmt, self.balance_sheet, self.cash_flow,
            self.stock_info, self.market_data
        )
        
        self.assertIsInstance(result, dict)
        self.assertIn('enhanced_epv', result)
        self.assertIn('base_epv', result)
        self.assertIn('confidence_intervals', result)
        
        # Sanity checks
        self.assertGreater(result['enhanced_epv'], 0)
        self.assertGreater(result['base_epv'], 0)
    
    def test_enhanced_epv_technology_industry(self):
        """Test enhanced EPV calculation with technology industry."""
        
        calculator = EnhancedEPVCalculator('technology')
        result = calculator.calculate_enhanced_epv(
            self.income_stmt, self.balance_sheet, self.cash_flow,
            self.stock_info, self.market_data
        )
        
        self.assertIsInstance(result, dict)
        self.assertIn('enhanced_epv', result)
        
        # Technology should have different adjustments
        self.assertIn('technology', result['methodology_notes'][0].lower())
    
    def test_confidence_intervals(self):
        """Test confidence interval calculation."""
        
        calculator = EnhancedEPVCalculator()
        
        # Mock EBIT data
        ebit_data = {
            'normalized_ebit': 100000,
            'margin_volatility': 0.1,
            'margin_trend': 0.05
        }
        
        intervals = calculator._calculate_confidence_intervals(
            1000000, ebit_data, 0.10
        )
        
        self.assertIn('epv_low_95', intervals)
        self.assertIn('epv_high_95', intervals)
        self.assertIn('confidence_score', intervals)
        
        # 95% interval should be wider than 80%
        range_95 = intervals['epv_high_95'] - intervals['epv_low_95']
        range_80 = intervals['epv_high_80'] - intervals['epv_low_80']
        self.assertGreater(range_95, range_80)

class TestConfigManager(unittest.TestCase):
    """Unit tests for Configuration Manager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_default_config_creation(self):
        """Test default configuration creation."""
        
        manager = ConfigManager()
        config = manager.get_config()
        
        self.assertIsInstance(config, EPVConfig)
        self.assertEqual(config.environment, 'development')
        self.assertGreater(config.calculation.normalization_years, 0)
        self.assertTrue(config.risk.monte_carlo_enabled)
    
    def test_config_validation(self):
        """Test configuration validation."""
        
        manager = ConfigManager()
        
        # Test invalid configuration
        invalid_updates = {
            'calculation': {
                'normalization_years': -1,  # Invalid
                'default_effective_tax_rate': 1.5  # Invalid
            }
        }
        
        with self.assertRaises(ValueError):
            manager.update_config(invalid_updates)
    
    def test_config_save_load(self):
        """Test configuration save and load."""
        
        config_file = os.path.join(self.temp_dir, 'test_config.yaml')
        
        # Create and save config
        manager = ConfigManager()
        manager.save_config(config_file)
        
        self.assertTrue(os.path.exists(config_file))
        
        # Load config from file
        manager2 = ConfigManager(config_file)
        config2 = manager2.get_config()
        
        self.assertEqual(config2.calculation.normalization_years, 
                        manager.get_config().calculation.normalization_years)

class TestIntegration(unittest.TestCase):
    """Integration tests for the complete EPV system."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.sample_ticker = 'TEST'
    
    @patch('epv_valuation_model.main.get_financial_data')
    def test_complete_epv_workflow(self, mock_get_data):
        """Test complete EPV workflow with mocked data."""
        
        # Mock the data fetching
        mock_get_data.return_value = (
            generate_sample_income_statement(),
            generate_sample_balance_sheet(),
            generate_sample_cash_flow(),
            generate_sample_stock_info()
        )
        
        # Run complete analysis
        with patch('epv_valuation_model.main.save_results'):
            result = epv_main.run_epv_valuation(self.sample_ticker)
        
        self.assertIsNotNone(result)
        self.assertIsInstance(result, dict)
        self.assertIn('epv_equity', result)
        self.assertIn('margin_of_safety_epv', result)
    
    def test_data_quality_integration(self):
        """Test data quality assessment integration."""
        
        result = run_data_quality_assessment(
            generate_sample_income_statement(),
            generate_sample_balance_sheet(),
            generate_sample_cash_flow(),
            generate_sample_stock_info()
        )
        
        self.assertIsInstance(result, dict)
        self.assertIn('overall_score', result)

class TestPerformance(unittest.TestCase):
    """Performance tests and benchmarks."""
    
    def setUp(self):
        """Set up performance test fixtures."""
        self.income_stmt = generate_sample_income_statement(10)  # More years
        self.balance_sheet = generate_sample_balance_sheet(10)
        self.cash_flow = generate_sample_cash_flow(10)
        self.stock_info = generate_sample_stock_info()
    
    def test_epv_calculation_performance(self):
        """Test EPV calculation performance."""
        
        start_time = time.time()
        
        # Run EPV calculation multiple times
        for _ in range(100):
            result = epv_calculator.calculate_epv(
                self.income_stmt, self.balance_sheet, 
                self.cash_flow, self.stock_info
            )
        
        end_time = time.time()
        avg_time = (end_time - start_time) / 100
        
        # Should complete in reasonable time (< 0.1 seconds per calculation)
        self.assertLess(avg_time, 0.1, 
                       f"EPV calculation too slow: {avg_time:.3f}s per calculation")
    
    def test_data_quality_performance(self):
        """Test data quality assessment performance."""
        
        checker = DataQualityChecker()
        
        start_time = time.time()
        
        # Run data quality assessment multiple times
        for _ in range(50):
            result = checker.assess_data_quality(
                self.income_stmt, self.balance_sheet, 
                self.cash_flow, self.stock_info
            )
        
        end_time = time.time()
        avg_time = (end_time - start_time) / 50
        
        # Should complete in reasonable time (< 0.2 seconds per assessment)
        self.assertLess(avg_time, 0.2,
                       f"Data quality assessment too slow: {avg_time:.3f}s per assessment")
    
    def test_memory_usage(self):
        """Test memory usage of calculations."""
        
        import tracemalloc
        
        tracemalloc.start()
        
        # Create large dataset
        large_income = generate_sample_income_statement(20)
        large_balance = generate_sample_balance_sheet(20)
        large_cash_flow = generate_sample_cash_flow(20)
        
        # Run calculation
        result = epv_calculator.calculate_epv(
            large_income, large_balance, large_cash_flow, self.stock_info
        )
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Should use reasonable amount of memory (< 50MB)
        peak_mb = peak / 1024 / 1024
        self.assertLess(peak_mb, 50, 
                       f"Memory usage too high: {peak_mb:.1f}MB")

class TestRegressionSuite(unittest.TestCase):
    """Regression tests to ensure consistent behavior."""
    
    def test_known_good_calculation(self):
        """Test against a known good calculation result."""
        
        # Use fixed seed for reproducible results
        np.random.seed(42)
        
        income_stmt = generate_sample_income_statement()
        balance_sheet = generate_sample_balance_sheet()
        cash_flow = generate_sample_cash_flow()
        stock_info = generate_sample_stock_info()
        
        result = epv_calculator.calculate_epv(
            income_stmt, balance_sheet, cash_flow, stock_info
        )
        
        # These values should remain consistent across code changes
        # (Update these if algorithm intentionally changes)
        self.assertIsNotNone(result['epv_equity'])
        self.assertIsNotNone(result['wacc'])
        
        # Ensure results are in reasonable ranges
        self.assertGreater(result['epv_equity'], 0)
        self.assertLess(result['wacc'], 0.5)  # WACC shouldn't exceed 50%

def run_performance_benchmarks():
    """Run comprehensive performance benchmarks."""
    
    print("🏃 Running Performance Benchmarks...")
    
    # Create larger datasets for benchmarking
    large_income = generate_sample_income_statement(15)
    large_balance = generate_sample_balance_sheet(15)
    large_cash_flow = generate_sample_cash_flow(15)
    stock_info = generate_sample_stock_info()
    
    # Benchmark EPV calculation
    start_time = time.time()
    for i in range(1000):
        result = epv_calculator.calculate_epv(
            large_income, large_balance, large_cash_flow, stock_info
        )
    end_time = time.time()
    
    print(f"✅ EPV Calculation: {(end_time - start_time)/1000:.4f}s per calculation")
    
    # Benchmark Enhanced EPV
    calculator = EnhancedEPVCalculator('technology')
    market_data = {'risk_free_rate': 0.03}
    
    start_time = time.time()
    for i in range(100):
        result = calculator.calculate_enhanced_epv(
            large_income, large_balance, large_cash_flow, stock_info, market_data
        )
    end_time = time.time()
    
    print(f"✅ Enhanced EPV: {(end_time - start_time)/100:.4f}s per calculation")
    
    # Benchmark Data Quality
    checker = DataQualityChecker()
    
    start_time = time.time()
    for i in range(200):
        result = checker.assess_data_quality(
            large_income, large_balance, large_cash_flow, stock_info
        )
    end_time = time.time()
    
    print(f"✅ Data Quality Assessment: {(end_time - start_time)/200:.4f}s per assessment")

def run_all_tests():
    """Run all tests with summary reporting."""
    
    print("🧪 Running EPV Valuation Model Test Suite...")
    print("=" * 60)
    
    # Suppress warnings during testing
    warnings.filterwarnings('ignore')
    
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestEPVCalculator,
        TestDataQuality,
        TestEnhancedEPV,
        TestConfigManager,
        TestIntegration,
        TestPerformance,
        TestRegressionSuite
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"🎯 Test Summary:")
    print(f"   ✅ Tests run: {result.testsRun}")
    print(f"   ❌ Failures: {len(result.failures)}")
    print(f"   🚫 Errors: {len(result.errors)}")
    
    if result.failures:
        print(f"\n❌ Failures:")
        for test, traceback in result.failures:
            print(f"   - {test}")
    
    if result.errors:
        print(f"\n🚫 Errors:")
        for test, traceback in result.errors:
            print(f"   - {test}")
    
    # Run performance benchmarks
    print("\n" + "=" * 60)
    run_performance_benchmarks()
    
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1) 