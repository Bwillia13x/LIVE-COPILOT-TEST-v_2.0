import os
import sys

def main():
    print("\n=== Sample Data File Generator ===\n")
    ticker = input("Enter ticker symbol (e.g., AAPL): ").strip().upper()
    if not ticker:
        print("Ticker symbol is required.")
        sys.exit(1)

    print("Select data type:")
    print("  1. Income Statement (CSV)")
    print("  2. Balance Sheet (CSV)")
    print("  3. Cash Flow Statement (CSV)")
    print("  4. Stock Info (JSON)")
    dtype_choice = input("Enter 1, 2, 3, or 4: ").strip()
    dtype_map = {
        "1": ("income statement", f"{ticker}_raw_is.csv"),
        "2": ("balance sheet", f"{ticker}_raw_bs.csv"),
        "3": ("cash flow statement", f"{ticker}_raw_cf.csv"),
        "4": ("stock info", f"{ticker}_raw_info.json"),
    }
    if dtype_choice not in dtype_map:
        print("Invalid choice.")
        sys.exit(1)
    dtype, fname = dtype_map[dtype_choice]

    print(f"\nPaste the raw {dtype} data below. End input with an empty line:")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line == "" and lines:
            break
        lines.append(line)
    raw_data = "\n".join(lines).strip()
    if not raw_data:
        print("No data entered. Exiting.")
        sys.exit(1)

    out_dir = os.path.join("data", "fetched_samples")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, fname)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(raw_data + "\n")
    print(f"\nSaved {dtype} data to: {out_path}\n")

if __name__ == "__main__":
    main() 