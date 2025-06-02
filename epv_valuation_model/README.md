# epv_valuation_model/utils.py
# This module contains common utility functions used across the project.

import os
import errno
from typing import Any, Optional

# Import configurations from config.py if needed for utility functions
# from . import config # Assuming it's in the same package

def ensure_directory_exists(path: str) -> None:
    """
    Ensures that a directory exists. If it doesn't, it attempts to create it.
    This function is idempotent.

    Args:
        path (str): The directory path to check/create.

    Raises:
        OSError: If the directory couldn't be created for reasons other than it already existing.
    """
    try:
        os.makedirs(path, exist_ok=True) # exist_ok=True means no error if directory already exists
        print(f"Directory '{path}' ensured.")
    except OSError as e:
        # Re-raise the exception if it's not an "already exists" error.
        # With exist_ok=True, os.makedirs should handle "already exists" gracefully.
        # This catch is more for other potential OS errors during creation.
        if e.errno != errno.EEXIST: # EEXIST means "File exists"
            print(f"Error creating directory '{path}': {e}")
            raise # Re-raise the caught OSError if it's not EEXIST (though exist_ok should prevent this)
        # If e.errno is EEXIST and exist_ok=False, it would be an error.
        # But with exist_ok=True, this path shouldn't be hit for EEXIST.

def format_currency(value: Optional[float], currency_symbol: str = "$", precision: int = 0, default_na: str = "N/A") -> str:
    """
    Formats a numeric value as a currency string.

    Args:
        value (Optional[float]): The numeric value to format.
        currency_symbol (str): The currency symbol to prepend.
        precision (int): The number of decimal places for the currency value.
                         Default 0 for whole numbers (common for large financial figures).
        default_na (str): String to return if value is None or NaN.


    Returns:
        str: The formatted currency string (e.g., "$1,234,567") or default_na.
    """
    if value is None or pd.isna(value): # pd.isna handles numpy.nan too
        return default_na
    
    format_string = f"{currency_symbol}{{value:,.{precision}f}}"
    return format_string.format(value=value)

def format_percentage(value: Optional[float], precision: int = 2, default_na: str = "N/A") -> str:
    """
    Formats a numeric value (expected as a decimal, e.g., 0.25 for 25%) as a percentage string.

    Args:
        value (Optional[float]): The numeric value (decimal form) to format.
        precision (int): The number of decimal places for the percentage.
        default_na (str): String to return if value is None or NaN.

    Returns:
        str: The formatted percentage string (e.g., "25.00%") or default_na.
    """
    if value is None or pd.isna(value):
        return default_na
    
    format_string = f"{{value:.{precision}%}}"
    return format_string.format(value=value)


# --- Main execution block for testing this module directly ---
if __name__ == "__main__":
    import pandas as pd # For pd.isna in tests

    print("--- Testing Utility Functions ---")

    # 1. Test ensure_directory_exists
    test_dir_1 = "temp_test_dir_utils/level1/level2"
    test_dir_2 = "another_temp_dir"

    print(f"\nTesting ensure_directory_exists for '{test_dir_1}'...")
    ensure_directory_exists(test_dir_1)
    if os.path.exists(test_dir_1):
        print(f"Successfully created or confirmed '{test_dir_1}'.")
        # Clean up by removing the directory (optional)
        # import shutil
        # shutil.rmtree("temp_test_dir_utils")
        # print(f"Cleaned up '{test_dir_1}'.")
    else:
        print(f"Failed to create '{test_dir_1}'.")

    print(f"\nTesting ensure_directory_exists for '{test_dir_2}' (will try to create again)...")
    ensure_directory_exists(test_dir_2) # Should not raise error if it exists
    if os.path.exists(test_dir_2):
        print(f"Successfully created or confirmed '{test_dir_2}'.")
    else:
        print(f"Failed to create '{test_dir_2}'.")
    
    # Clean up test directories if they were created by this test run
    if os.path.exists("temp_test_dir_utils"):
        import shutil
        shutil.rmtree("temp_test_dir_utils")
        print("Cleaned up 'temp_test_dir_utils'.")
    if os.path.exists(test_dir_2):
        os.rmdir(test_dir_2) # rmdir only works if empty
        print(f"Cleaned up '{test_dir_2}'.")


    # 2. Test format_currency
    print("\n--- Testing format_currency ---")
    print(f"1234567.89 with precision 2: {format_currency(1234567.89, precision=2)}")
    print(f"1234567 with precision 0: {format_currency(1234567, precision=0)}")
    print(f"-50000 with precision 0: {format_currency(-50000, precision=0)}")
    print(f"None value: {format_currency(None)}")
    print(f"NaN value: {format_currency(float('nan'))}")
    print(f"0 value: {format_currency(0)}")
    print(f"Custom currency '€', value 987.65, precision 2: {format_currency(987.65, currency_symbol='€', precision=2)}")


    # 3. Test format_percentage
    print("\n--- Testing format_percentage ---")
    print(f"0.25345 with precision 2: {format_percentage(0.25345, precision=2)}")
    print(f"0.085 with precision 1: {format_percentage(0.085, precision=1)}")
    print(f"1.0 with precision 0: {format_percentage(1.0, precision=0)}")
    print(f"-0.05 with precision 2: {format_percentage(-0.05, precision=2)}")
    print(f"None value: {format_percentage(None)}")
    print(f"NaN value: {format_percentage(float('nan'))}")
    print(f"0 value: {format_percentage(0)}")


    print("\n--- Utility Functions Test Complete ---")
