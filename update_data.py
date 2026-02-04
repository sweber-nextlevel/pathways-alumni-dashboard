#!/usr/bin/env python3
"""
Update script for pathways dashboard deployment.
Run this script to update the deployment data from your Excel file.

Usage:
  python update_data.py -i "CA STB Alumni.xlsx"
"""
import sys
import os
from pathlib import Path
import shutil
import subprocess

# Add the parent directory to path to import the standardization script
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
scripts_dir = parent_dir / 'scripts'
sys.path.insert(0, str(scripts_dir))

def main():
    if len(sys.argv) < 3 or sys.argv[1] != '-i':
        print("Usage: python update_data.py -i 'CA STB Alumni.xlsx'")
        return
    
    excel_file = sys.argv[2]
    
    # Check if excel file exists
    excel_path = parent_dir / excel_file
    if not excel_path.exists():
        print(f"Error: Excel file not found: {excel_file}")
        return
    
    print(f"Processing {excel_file}...")
    
    # Run the standardization script
    try:
        result = subprocess.run([
            sys.executable, 
            str(scripts_dir / 'standardize_and_check.py'), 
            '-i', 
            str(excel_path)
        ], capture_output=True, text=True, cwd=str(parent_dir))
        
        if result.returncode != 0:
            print("Error running standardization script:")
            print(result.stderr)
            return
            
        print("Data standardization completed!")
        print(result.stdout)
        
        # Copy the updated CSV to deployment folder
        source_csv = parent_dir / 'dashboard-offline' / 'standardized.csv'
        dest_csv = current_dir / 'public' / 'data' / 'standardized.csv'
        
        if source_csv.exists():
            shutil.copy2(source_csv, dest_csv)
            print(f"✅ Updated deployment data: {dest_csv}")
            
            # Get basic stats
            import csv
            with open(dest_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                data = list(reader)
                total = len(data)
                
            print(f"📊 Total records: {total}")
            print("\n🚀 Ready for deployment!")
            print("Next steps:")
            print("1. git add .")
            print("2. git commit -m 'Update data'")
            print("3. git push")
            
        else:
            print("Error: standardized.csv not found!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()