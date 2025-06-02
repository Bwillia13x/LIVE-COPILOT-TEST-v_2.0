"""
Enhanced Configuration Management for EPV Valuation Model
Provides centralized configuration with environment-specific settings and validation.
"""

import os
import json
import yaml
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from pathlib import Path
import logging

@dataclass
class DataSourceConfig:
    """Data source configuration."""
    default_provider: str = "yfinance"
    cache_enabled: bool = True
    cache_duration_days: int = 1
    rate_limit_delay: float = 1.0
    backup_providers: List[str] = None
    
    def __post_init__(self):
        if self.backup_providers is None:
            self.backup_providers = ["alpha_vantage", "polygon"]

@dataclass
class CalculationConfig:
    """Calculation methodology configuration."""
    normalization_years: int = 5
    min_years_required: int = 3
    default_effective_tax_rate: float = 0.25
    min_effective_tax_rate: float = 0.10
    max_effective_tax_rate: float = 0.45
    equity_risk_premium: float = 0.065
    risk_free_rate_source: str = "fred"  # FRED, yahoo, manual
    default_risk_free_rate: float = 0.04
    
    # Advanced calculation settings
    outlier_detection_enabled: bool = True
    outlier_std_threshold: float = 2.0
    revenue_smoothing_enabled: bool = True
    margin_normalization_method: str = "weighted_average"  # simple, weighted_average, trend_adjusted

@dataclass  
class IndustryConfig:
    """Industry-specific configuration."""
    auto_detect_industry: bool = True
    industry_adjustments_enabled: bool = True
    custom_industry_rules: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.custom_industry_rules is None:
            self.custom_industry_rules = {}

@dataclass
class RiskConfig:
    """Risk analysis configuration."""
    monte_carlo_enabled: bool = True
    monte_carlo_iterations: int = 10000
    confidence_levels: List[float] = None
    stress_test_scenarios: List[str] = None
    
    def __post_init__(self):
        if self.confidence_levels is None:
            self.confidence_levels = [0.80, 0.90, 0.95]
        if self.stress_test_scenarios is None:
            self.stress_test_scenarios = ["recession", "growth_slowdown", "margin_compression"]

@dataclass
class OutputConfig:
    """Output and reporting configuration."""
    default_output_format: str = "detailed"
    chart_generation_enabled: bool = True
    report_template: str = "comprehensive"
    export_formats: List[str] = None
    decimal_precision: int = 2
    
    def __post_init__(self):
        if self.export_formats is None:
            self.export_formats = ["pdf", "excel", "json"]

@dataclass
class PerformanceConfig:
    """Performance and optimization configuration."""
    parallel_processing_enabled: bool = True
    max_workers: int = 4
    memory_optimization_enabled: bool = True
    calculation_caching_enabled: bool = True

@dataclass
class LoggingConfig:
    """Logging configuration."""
    log_level: str = "INFO"
    log_file_enabled: bool = True
    log_file_path: str = "logs/epv_model.log"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    max_log_file_size_mb: int = 10
    log_backup_count: int = 5

@dataclass
class EPVConfig:
    """Main configuration class combining all configuration sections."""
    data_source: DataSourceConfig
    calculation: CalculationConfig
    industry: IndustryConfig
    risk: RiskConfig
    output: OutputConfig
    performance: PerformanceConfig
    logging: LoggingConfig
    
    # Environment and metadata
    environment: str = "development"
    version: str = "2.0"
    config_file_path: Optional[str] = None

class ConfigManager:
    """Enhanced configuration manager with validation and environment support."""
    
    def __init__(self, config_file: Optional[str] = None, environment: str = "development"):
        self.environment = environment
        self.config_file = config_file
        self.config = self._load_config()
        self._setup_logging()
        
    def _load_config(self) -> EPVConfig:
        """Load configuration from file or create default."""
        
        # Try to load from file if specified
        if self.config_file and os.path.exists(self.config_file):
            return self._load_from_file(self.config_file)
        
        # Try to load from environment-specific file
        env_config_paths = [
            f"config/{self.environment}.yaml",
            f"config/{self.environment}.json", 
            f"epv_config_{self.environment}.yaml",
            f"epv_config_{self.environment}.json"
        ]
        
        for path in env_config_paths:
            if os.path.exists(path):
                return self._load_from_file(path)
        
        # Create default configuration
        return self._create_default_config()
    
    def _load_from_file(self, file_path: str) -> EPVConfig:
        """Load configuration from YAML or JSON file."""
        
        try:
            with open(file_path, 'r') as f:
                if file_path.endswith('.yaml') or file_path.endswith('.yml'):
                    data = yaml.safe_load(f)
                else:
                    data = json.load(f)
            
            return self._dict_to_config(data, file_path)
            
        except Exception as e:
            logging.warning(f"Failed to load config from {file_path}: {e}")
            return self._create_default_config()
    
    def _dict_to_config(self, data: Dict[str, Any], file_path: str) -> EPVConfig:
        """Convert dictionary to EPVConfig object."""
        
        try:
            config = EPVConfig(
                data_source=DataSourceConfig(**data.get('data_source', {})),
                calculation=CalculationConfig(**data.get('calculation', {})),
                industry=IndustryConfig(**data.get('industry', {})),
                risk=RiskConfig(**data.get('risk', {})),
                output=OutputConfig(**data.get('output', {})),
                performance=PerformanceConfig(**data.get('performance', {})),
                logging=LoggingConfig(**data.get('logging', {})),
                environment=self.environment,
                config_file_path=file_path
            )
            
            # Validate configuration
            self._validate_config(config)
            return config
            
        except Exception as e:
            logging.error(f"Error creating config from dict: {e}")
            return self._create_default_config()
    
    def _create_default_config(self) -> EPVConfig:
        """Create default configuration."""
        
        return EPVConfig(
            data_source=DataSourceConfig(),
            calculation=CalculationConfig(),
            industry=IndustryConfig(),
            risk=RiskConfig(),
            output=OutputConfig(),
            performance=PerformanceConfig(),
            logging=LoggingConfig(),
            environment=self.environment
        )
    
    def _validate_config(self, config: EPVConfig) -> None:
        """Validate configuration values."""
        
        errors = []
        
        # Validate calculation config
        if config.calculation.normalization_years < 1:
            errors.append("normalization_years must be at least 1")
        
        if not (0 <= config.calculation.default_effective_tax_rate <= 1):
            errors.append("default_effective_tax_rate must be between 0 and 1")
        
        if not (0 <= config.calculation.equity_risk_premium <= 1):
            errors.append("equity_risk_premium must be between 0 and 1")
        
        # Validate risk config
        if config.risk.monte_carlo_iterations < 100:
            errors.append("monte_carlo_iterations should be at least 100")
        
        for level in config.risk.confidence_levels:
            if not (0 < level < 1):
                errors.append(f"confidence_level {level} must be between 0 and 1")
        
        # Validate performance config
        if config.performance.max_workers < 1:
            errors.append("max_workers must be at least 1")
        
        if errors:
            raise ValueError(f"Configuration validation errors: {'; '.join(errors)}")
    
    def _setup_logging(self) -> None:
        """Setup logging based on configuration."""
        
        log_config = self.config.logging
        
        # Create log directory if it doesn't exist
        if log_config.log_file_enabled:
            log_dir = os.path.dirname(log_config.log_file_path)
            if log_dir:
                os.makedirs(log_dir, exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=getattr(logging, log_config.log_level.upper()),
            format=log_config.log_format,
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(log_config.log_file_path) if log_config.log_file_enabled else logging.NullHandler()
            ]
        )
    
    def get_config(self) -> EPVConfig:
        """Get the current configuration."""
        return self.config
    
    def update_config(self, updates: Dict[str, Any]) -> None:
        """Update configuration with new values."""
        
        # Create a new config with updates
        config_dict = asdict(self.config)
        self._deep_update(config_dict, updates)
        
        # Validate and set new config
        new_config = self._dict_to_config(config_dict, self.config.config_file_path)
        self.config = new_config
    
    def _deep_update(self, base_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> None:
        """Deep update of dictionary."""
        
        for key, value in update_dict.items():
            if key in base_dict and isinstance(base_dict[key], dict) and isinstance(value, dict):
                self._deep_update(base_dict[key], value)
            else:
                base_dict[key] = value
    
    def save_config(self, file_path: Optional[str] = None) -> None:
        """Save current configuration to file."""
        
        if file_path is None:
            file_path = self.config.config_file_path or f"config/{self.environment}.yaml"
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Convert config to dict
        config_dict = asdict(self.config)
        
        # Remove runtime fields
        config_dict.pop('config_file_path', None)
        
        try:
            with open(file_path, 'w') as f:
                if file_path.endswith('.yaml') or file_path.endswith('.yml'):
                    yaml.dump(config_dict, f, default_flow_style=False, indent=2)
                else:
                    json.dump(config_dict, f, indent=2)
            
            logging.info(f"Configuration saved to {file_path}")
            
        except Exception as e:
            logging.error(f"Failed to save configuration to {file_path}: {e}")
            raise
    
    def create_environment_config(self, target_env: str) -> str:
        """Create configuration file for specific environment."""
        
        config_file = f"config/{target_env}.yaml"
        
        # Adjust config for environment
        env_config = self._adjust_for_environment(target_env)
        
        # Save to file
        config_dict = asdict(env_config)
        config_dict.pop('config_file_path', None)
        
        os.makedirs("config", exist_ok=True)
        with open(config_file, 'w') as f:
            yaml.dump(config_dict, f, default_flow_style=False, indent=2)
        
        return config_file
    
    def _adjust_for_environment(self, environment: str) -> EPVConfig:
        """Adjust configuration for specific environment."""
        
        config = EPVConfig(
            data_source=DataSourceConfig(),
            calculation=CalculationConfig(),
            industry=IndustryConfig(),
            risk=RiskConfig(),
            output=OutputConfig(),
            performance=PerformanceConfig(),
            logging=LoggingConfig(),
            environment=environment
        )
        
        if environment == "production":
            # Production-specific adjustments
            config.logging.log_level = "WARNING"
            config.performance.parallel_processing_enabled = True
            config.risk.monte_carlo_iterations = 50000
            config.data_source.cache_duration_days = 0.25  # 6 hours
            
        elif environment == "development":
            # Development-specific adjustments
            config.logging.log_level = "DEBUG"
            config.risk.monte_carlo_iterations = 1000
            config.data_source.cache_duration_days = 7
            
        elif environment == "testing":
            # Testing-specific adjustments
            config.logging.log_level = "ERROR"
            config.data_source.cache_enabled = False
            config.risk.monte_carlo_enabled = False
            config.output.chart_generation_enabled = False
            
        return config
    
    def get_calculation_params(self) -> Dict[str, Any]:
        """Get calculation parameters for easy access."""
        
        calc_config = self.config.calculation
        return {
            'normalization_years': calc_config.normalization_years,
            'min_years_required': calc_config.min_years_required,
            'default_effective_tax_rate': calc_config.default_effective_tax_rate,
            'min_effective_tax_rate': calc_config.min_effective_tax_rate,
            'max_effective_tax_rate': calc_config.max_effective_tax_rate,
            'equity_risk_premium': calc_config.equity_risk_premium,
            'default_risk_free_rate': calc_config.default_risk_free_rate,
            'outlier_detection_enabled': calc_config.outlier_detection_enabled,
            'outlier_std_threshold': calc_config.outlier_std_threshold
        }


# Global configuration manager instance
_config_manager: Optional[ConfigManager] = None

def get_config_manager(config_file: Optional[str] = None, 
                      environment: Optional[str] = None) -> ConfigManager:
    """Get or create global configuration manager."""
    
    global _config_manager
    
    if _config_manager is None or config_file or environment:
        env = environment or os.getenv('EPV_ENVIRONMENT', 'development')
        _config_manager = ConfigManager(config_file, env)
    
    return _config_manager

def get_config() -> EPVConfig:
    """Get current configuration."""
    return get_config_manager().get_config()

def update_config(updates: Dict[str, Any]) -> None:
    """Update global configuration."""
    get_config_manager().update_config(updates)


if __name__ == "__main__":
    # Example usage and testing
    print("EPV Configuration Manager")
    
    # Create config manager
    manager = ConfigManager()
    config = manager.get_config()
    
    print(f"Environment: {config.environment}")
    print(f"Normalization years: {config.calculation.normalization_years}")
    print(f"Monte Carlo enabled: {config.risk.monte_carlo_enabled}")
    
    # Save example configuration
    manager.save_config("example_config.yaml")
    print("Example configuration saved to example_config.yaml") 