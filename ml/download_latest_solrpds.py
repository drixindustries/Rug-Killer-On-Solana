#!/usr/bin/env python3
"""
download_latest_solrpds.py - Download latest rug pull datasets for training
Run weekly to keep the model up-to-date
"""

import os
import requests
import pandas as pd
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

def download_solrpds_2025():
    """Download latest SolRPDS (Solana Rug Pull Detection System) dataset"""
    print("=" * 80)
    print("Downloading latest Solana rug pull datasets...")
    print("=" * 80)
    
    # Note: Update these URLs with actual dataset sources
    datasets = [
        {
            'name': 'solrpds_2025',
            'url': 'https://raw.githubusercontent.com/example/solana-rug-data/main/2025_dataset.csv',
            'description': 'Official SolRPDS 2025 labeled dataset'
        },
        # Add more dataset sources here
    ]
    
    downloaded_files = []
    
    for dataset in datasets:
        filename = f"{dataset['name']}_{datetime.now().strftime('%Y%m%d')}.csv"
        filepath = os.path.join(DATA_DIR, filename)
        
        print(f"\n📥 Downloading {dataset['name']}...")
        print(f"   {dataset['description']}")
        
        try:
            # Attempt to download
            response = requests.get(dataset['url'], timeout=30)
            response.raise_for_status()
            
            # Save to file
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            # Verify it's valid CSV
            df = pd.read_csv(filepath)
            print(f"   ✓ Downloaded: {len(df)} samples")
            print(f"   ✓ Saved to: {filepath}")
            
            # Also save as latest
            latest_path = os.path.join(DATA_DIR, f"{dataset['name']}.csv")
            df.to_csv(latest_path, index=False)
            
            downloaded_files.append(filepath)
            
        except requests.exceptions.RequestException as e:
            print(f"   ⚠️ Download failed: {e}")
            print(f"   Skipping {dataset['name']}...")
        except pd.errors.EmptyDataError:
            print(f"   ⚠️ Invalid CSV format")
            print(f"   Skipping {dataset['name']}...")
        except Exception as e:
            print(f"   ⚠️ Error: {e}")
            print(f"   Skipping {dataset['name']}...")
    
    return downloaded_files

def fetch_rugcheck_data():
    """Fetch latest rug data from RugCheck API (if available)"""
    print("\n📊 Fetching latest data from RugCheck API...")
    
    # This is a placeholder - implement actual API calls
    # RugCheck may have an API or data export feature
    
    try:
        # Example: Fetch top 100 recent tokens and their rug status
        # This would need to be implemented based on available APIs
        pass
    except Exception as e:
        print(f"   ⚠️ RugCheck fetch failed: {e}")

def consolidate_datasets():
    """Combine all available datasets into training_data.csv"""
    print("\n🔄 Consolidating datasets...")
    
    all_files = [
        f for f in os.listdir(DATA_DIR) 
        if f.endswith('.csv') and f != 'training_data.csv'
    ]
    
    if not all_files:
        print("   ⚠️ No datasets found!")
        return
    
    dfs = []
    for filename in all_files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            df = pd.read_csv(filepath)
            print(f"   • {filename}: {len(df)} samples")
            dfs.append(df)
        except Exception as e:
            print(f"   ⚠️ Error reading {filename}: {e}")
    
    if dfs:
        combined = pd.concat(dfs, ignore_index=True)
        
        # Remove duplicates (based on token mint address if available)
        if 'mint' in combined.columns or 'token_address' in combined.columns:
            id_col = 'mint' if 'mint' in combined.columns else 'token_address'
            before = len(combined)
            combined = combined.drop_duplicates(subset=[id_col])
            after = len(combined)
            print(f"   ℹ️ Removed {before - after} duplicates")
        
        # Save consolidated dataset
        output_path = os.path.join(DATA_DIR, 'training_data.csv')
        combined.to_csv(output_path, index=False)
        print(f"\n✓ Consolidated dataset saved: {output_path}")
        print(f"  Total samples: {len(combined)}")
        
        # Show label distribution if available
        if 'label' in combined.columns or 'is_rug' in combined.columns:
            label_col = 'label' if 'label' in combined.columns else 'is_rug'
            rug_count = combined[label_col].sum()
            safe_count = len(combined) - rug_count
            print(f"  Rugs: {rug_count} ({rug_count/len(combined)*100:.1f}%)")
            print(f"  Safe: {safe_count} ({safe_count/len(combined)*100:.1f}%)")

def main():
    print("\n" + "=" * 80)
    print("SOLANA RUG PULL DATASET DOWNLOADER")
    print("=" * 80 + "\n")
    
    # Download datasets
    downloaded = download_solrpds_2025()
    
    # Fetch from APIs
    fetch_rugcheck_data()
    
    # Consolidate all data
    consolidate_datasets()
    
    print("\n" + "=" * 80)
    print("✓ Dataset download complete!")
    print("=" * 80)
    print("\nNext steps:")
    print("  1. Review the data in ml/data/")
    print("  2. Run: python ml/train_xgboost_pro.py")
    print("  3. Deploy the new model to production")
    print()

if __name__ == "__main__":
    main()
