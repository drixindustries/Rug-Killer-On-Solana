#!/usr/bin/env python3
"""
verify_setup.py - Verify ML pipeline installation
Run this to check if everything is configured correctly
"""

import sys
import os

def check_python_version():
    """Check Python version is 3.8+"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ required (found {}.{}.{})".format(
            version.major, version.minor, version.micro))
        return False
    print("✓ Python {}.{}.{} detected".format(
        version.major, version.minor, version.micro))
    return True

def check_dependencies():
    """Check if required packages are installed"""
    print("\n📦 Checking dependencies...")
    
    required = [
        ('xgboost', 'xgboost'),
        ('sklearn', 'scikit-learn'),
        ('pandas', 'pandas'),
        ('numpy', 'numpy'),
        ('scipy', 'scipy'),
        ('joblib', 'joblib'),
        ('requests', 'requests'),
    ]
    
    all_ok = True
    for module, package in required:
        try:
            __import__(module)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ❌ {package} not installed")
            all_ok = False
    
    return all_ok

def check_directory_structure():
    """Check if directories exist"""
    print("\n📁 Checking directory structure...")
    
    base = os.path.dirname(__file__)
    dirs = ['models', 'data']
    
    all_ok = True
    for dir_name in dirs:
        path = os.path.join(base, dir_name)
        if os.path.exists(path):
            print(f"  ✓ {dir_name}/ exists")
        else:
            print(f"  ⚠️  {dir_name}/ missing (will be created)")
            try:
                os.makedirs(path, exist_ok=True)
                print(f"     Created {dir_name}/")
            except Exception as e:
                print(f"     ❌ Failed to create: {e}")
                all_ok = False
    
    return all_ok

def check_training_data():
    """Check if training data exists"""
    print("\n📊 Checking training data...")
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print("  ⚠️  No training data found in ml/data/")
        print("     Place your labeled datasets there before training")
        return False
    
    for csv_file in csv_files:
        filepath = os.path.join(data_dir, csv_file)
        size = os.path.getsize(filepath)
        print(f"  ✓ {csv_file} ({size:,} bytes)")
    
    return True

def check_model():
    """Check if trained model exists"""
    print("\n🤖 Checking trained model...")
    
    model_path = os.path.join(
        os.path.dirname(__file__), 
        'models', 
        'xgboost_rug_model_latest.pkl'
    )
    
    if os.path.exists(model_path):
        size = os.path.getsize(model_path)
        print(f"  ✓ Model found ({size:,} bytes)")
        return True
    else:
        print("  ⚠️  No trained model found")
        print("     Run: python ml/train_xgboost_pro.py")
        return False

def check_gpu():
    """Check if GPU is available"""
    print("\n🎮 Checking GPU availability...")
    
    try:
        import xgboost as xgb
        # Try to use gpu_hist
        test_model = xgb.XGBClassifier(tree_method='gpu_hist', n_estimators=1)
        print("  ✓ GPU acceleration available")
        print("     Training will use: gpu_hist")
        return True
    except:
        print("  ℹ️  GPU not available or not configured")
        print("     Training will use: hist (CPU)")
        return False

def test_prediction():
    """Test prediction functionality"""
    print("\n🧪 Testing prediction...")
    
    try:
        from predict import predict_rug_score, get_risk_factors
        
        sample = {
            'mint_authority': None,
            'freeze_authority': None,
            'lp_burned': 900000000,
            'total_supply': 1000000000,
            'honeypot': False,
            'buy_tax': 0,
            'sell_tax': 0,
            'holders': 3847,
            'holders_after_filter': 3847,
            'top10_pct': 15.4,
            'sniper_wallets_pct': 7,
            'dev_bought_pct': 0,
            'jito_bundle_clusters': 0,
            'market_cap': 182000,
            'liquidity': 94000,
            'slippage_10k': 2.1,
            'vol_5m': 500000,
            'vol_1m': 100000,
            'price_change_5m': 1638,
            'kde_floor': 0.0000581,
            'avg_buy_price': 0.0001,
            'hours_post_migration': 0.15,
            'jito_bundle': False,
            'gnn_cluster_prob': 0.05,
        }
        
        score, level, prob = predict_rug_score(sample)
        print(f"  ✓ Prediction works!")
        print(f"     Sample score: {score}/100 ({level})")
        return True
    except Exception as e:
        print(f"  ❌ Prediction failed: {e}")
        return False

def main():
    print("=" * 70)
    print("ML PIPELINE SETUP VERIFICATION")
    print("=" * 70)
    
    results = []
    
    # Run all checks
    results.append(("Python Version", check_python_version()))
    results.append(("Dependencies", check_dependencies()))
    results.append(("Directory Structure", check_directory_structure()))
    results.append(("Training Data", check_training_data()))
    results.append(("Trained Model", check_model()))
    results.append(("GPU Support", check_gpu()))
    results.append(("Prediction Test", test_prediction()))
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    for name, passed in results:
        status = "✓ PASS" if passed else "⚠️  NEEDS ATTENTION"
        print(f"{name:25s} {status}")
    
    critical_checks = ["Python Version", "Dependencies", "Directory Structure"]
    critical_passed = all(
        passed for name, passed in results if name in critical_checks
    )
    
    print("\n" + "=" * 70)
    if critical_passed:
        print("✓ SETUP COMPLETE - Ready to train!")
        print("\nNext steps:")
        print("  1. Place training data in ml/data/")
        print("  2. Run: python ml/train_xgboost_pro.py")
        print("  3. Test: python ml/predict.py")
    else:
        print("❌ SETUP INCOMPLETE - Please fix the issues above")
        print("\nTo install dependencies:")
        print("  pip install -r ml/requirements.txt")
    print("=" * 70)

if __name__ == "__main__":
    main()
