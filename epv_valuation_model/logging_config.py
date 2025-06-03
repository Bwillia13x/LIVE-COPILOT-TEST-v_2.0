"""
Centralized Logging Configuration for EPV Valuation Model
Provides standardized logging setup and utilities.
"""

import logging
import logging.handlers
import os
from typing import Optional
from .config_manager import get_config

class EPVLogger:
    """Centralized logger for the EPV valuation model."""
    
    _loggers = {}
    _configured = False
    
    @classmethod
    def setup_logging(cls, config=None):
        """Setup logging configuration based on config settings."""
        if cls._configured:
            return
            
        if config is None:
            config = get_config()
        
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(config.logging.log_file_path)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        # Configure root logger
        root_logger = logging.getLogger('epv_model')
        root_logger.setLevel(getattr(logging, config.logging.log_level.upper()))
        
        # Clear any existing handlers
        root_logger.handlers.clear()
        
        # Create formatter
        formatter = logging.Formatter(config.logging.log_format)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        
        # File handler (if enabled)
        if config.logging.log_file_enabled:
            file_handler = logging.handlers.RotatingFileHandler(
                config.logging.log_file_path,
                maxBytes=config.logging.max_log_file_size_mb * 1024 * 1024,
                backupCount=config.logging.log_backup_count
            )
            file_handler.setLevel(getattr(logging, config.logging.log_level.upper()))
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        
        cls._configured = True
    
    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """Get a logger instance for a specific module."""
        if not cls._configured:
            cls.setup_logging()
        
        if name not in cls._loggers:
            cls._loggers[name] = logging.getLogger(f'epv_model.{name}')
        
        return cls._loggers[name]

def get_logger(module_name: str) -> logging.Logger:
    """Convenience function to get a logger for a module."""
    return EPVLogger.get_logger(module_name)

# Module-specific loggers
def get_main_logger() -> logging.Logger:
    """Get logger for main module."""
    return get_logger('main')

def get_data_fetcher_logger() -> logging.Logger:
    """Get logger for data fetcher module."""
    return get_logger('data_fetcher')

def get_epv_calculator_logger() -> logging.Logger:
    """Get logger for EPV calculator module."""
    return get_logger('epv_calculator')

def get_risk_analyzer_logger() -> logging.Logger:
    """Get logger for risk analyzer module."""
    return get_logger('risk_analyzer')

def get_reporting_logger() -> logging.Logger:
    """Get logger for reporting module."""
    return get_logger('reporting')

def get_data_processor_logger() -> logging.Logger:
    """Get logger for data processor module."""
    return get_logger('data_processor')

def get_ai_analyzer_logger() -> logging.Logger:
    """Get logger for AI analyzer module."""
    return get_logger('ai_analyzer')

# Utility functions for common logging patterns
def log_calculation_start(logger: logging.Logger, calculation_name: str, ticker: str):
    """Log the start of a calculation."""
    logger.info(f"Starting {calculation_name} calculation for {ticker}")

def log_calculation_success(logger: logging.Logger, calculation_name: str, result: float, ticker: str):
    """Log successful calculation completion."""
    logger.info(f"{calculation_name} calculation completed for {ticker}: {result:,.2f}")

def log_calculation_error(logger: logging.Logger, calculation_name: str, error: Exception, ticker: str):
    """Log calculation errors."""
    logger.error(f"{calculation_name} calculation failed for {ticker}: {error}")

def log_data_quality_issue(logger: logging.Logger, issue: str, ticker: str):
    """Log data quality issues."""
    logger.warning(f"Data quality issue for {ticker}: {issue}")

def log_fallback_used(logger: logging.Logger, fallback_method: str, reason: str, ticker: str):
    """Log when fallback methods are used."""
    logger.warning(f"Using fallback method '{fallback_method}' for {ticker}: {reason}")

if __name__ == "__main__":
    # Test logging setup
    EPVLogger.setup_logging()
    logger = get_logger('test')
    logger.info("Logging configuration test successful") 