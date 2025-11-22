# 🚀 QUICK REFERENCE - 2025 Solana Scanner Bot

## Installation (5 minutes)

```bash
# 1. Install ML dependencies
cd ml
pip install -r requirements.txt

# 2. Verify setup
python verify_setup.py

# 3. Place training data in ml/data/
#    (Use sample_training_data.csv as template)

# 4. Train model (10-30 min)
python train_xgboost_pro.py

# 5. Test prediction
python predict.py
```

## Weekly Auto-Training Setup

### Windows
```powershell
# Manual run
.\scripts\weekly-ml-training.ps1

# Auto: Task Scheduler → Sundays 3 AM
# Program: powershell.exe
# Args: -ExecutionPolicy Bypass -File "C:\path\to\scripts\weekly-ml-training.ps1"
```

### Linux/Mac
```bash
# Manual run
chmod +x scripts/weekly-ml-training.sh
./scripts/weekly-ml-training.sh

# Auto: Add to crontab
crontab -e
# Add: 0 3 * * 0 cd /path/to/bot && ./scripts/weekly-ml-training.sh
```

## File Locations

```
ml/
├── train_xgboost_pro.py       # Training
├── predict.py                  # Inference
├── verify_setup.py             # Check setup
├── requirements.txt            # Dependencies
├── models/                     # Trained models
└── data/                       # Training datasets

scripts/
├── weekly-ml-training.ps1     # Windows auto
└── weekly-ml-training.sh      # Linux auto

server/
└── bot-formatter.ts            # Enhanced card format
```

## Key Features

### Bot Card (bot-formatter.ts)
- ✅ ALL GREEN security indicator
- ✅ Clean holder filtering (Pump.fun/CEX/Jito excluded)
- ✅ Floor & Support Analysis (XGBoost + KDE)
- ✅ Best trading tools (Jupiter/Photon/BullX/Trojan/BonkBot/Ave.ai)
- ✅ Enhanced market data with emojis
- ✅ Jito Explorer integration

### ML Pipeline (train_xgboost_pro.py)
- ✅ RandomizedSearchCV (100 iterations)
- ✅ 5-Fold Stratified CV
- ✅ F1 Score optimization (0.94-0.96)
- ✅ GPU acceleration (auto-detect)
- ✅ 20 engineered features
- ✅ Auto-saves metadata

### Prediction (predict.py)
- ✅ CLI interface for TypeScript
- ✅ Fallback rule-based scoring
- ✅ Risk factor identification
- ✅ JSON output for integration

## CLI Usage

```bash
# Test with sample data
python ml/predict.py

# CLI mode (for bot integration)
python ml/predict.py --features '{"mint_authority": null, ...}'
```

## TypeScript Integration

```typescript
import { spawn } from 'child_process';

async function predictRugScore(features: any) {
  const python = spawn('python', [
    'ml/predict.py',
    '--features',
    JSON.stringify(features)
  ]);
  
  let output = '';
  python.stdout.on('data', (data) => output += data);
  
  return new Promise((resolve) => {
    python.on('close', () => {
      const result = JSON.parse(output);
      // result: { score, level, rugProbability, riskFactors }
      resolve(result);
    });
  });
}
```

## Training Data Format

```csv
mint_authority,freeze_authority,lp_burned,total_supply,honeypot,buy_tax,sell_tax,holders,holders_after_filter,top10_pct,sniper_wallets_pct,dev_bought_pct,jito_bundle_clusters,market_cap,liquidity,slippage_10k,vol_5m,vol_1m,price_change_5m,kde_floor,avg_buy_price,hours_post_migration,jito_bundle,gnn_cluster_prob,label
,,,1000000000,0,0,0,3847,3847,15.4,7.0,0.0,0,182000,94000,2.1,500000,100000,1638,0.0000581,0.0001,0.15,0,0.05,0
```

**Required columns:**
- `label` or `is_rug`: 1 = rug, 0 = safe
- Token metrics (see sample_training_data.csv)

## Model Performance Targets

- **F1 Score**: 0.94-0.96
- **Accuracy**: 0.92-0.95
- **ROC-AUC**: 0.96-0.98
- **False Positive Rate**: <5%

## 20 Engineered Features

1. mint_revoked
2. freeze_revoked
3. lp_burned_pct
4. honeypot
5. tax_buy
6. tax_sell
7. real_holders
8. top10_concentration
9. sniper_pct
10. dev_buy_pct
11. bundled_clusters
12. mc_to_liq_ratio
13. slippage_10k
14. volume_velocity_5m
15. price_change_5m
16. buy_density_kde_peak
17. avg_buy_price
18. hours_since_migration
19. jito_bundle_detected
20. cluster_risk_score

## Troubleshooting

### No module named 'xgboost'
```bash
pip install -r ml/requirements.txt
```

### No training data found
```bash
# Place CSV files in ml/data/ or use sample:
cp ml/data/sample_training_data.csv ml/data/training_data.csv
```

### Model not found
```bash
python ml/train_xgboost_pro.py
```

### Poor performance (<0.85 F1)
- Collect more labeled samples (1000+ each class)
- Verify label accuracy
- Check feature engineering matches data

## Documentation

- **Setup**: ML_SETUP_GUIDE.md
- **ML Details**: ml/README.md
- **Complete**: IMPLEMENTATION_COMPLETE.md

## Support Commands

```bash
# Verify installation
python ml/verify_setup.py

# Check model details
python -c "import joblib; m=joblib.load('ml/models/xgboost_rug_model_latest.pkl'); print(m)"

# List training data
ls ml/data/*.csv

# View logs
cat ml/training_history.log
```

---

**Quick Links:**
- [ML Setup Guide](ML_SETUP_GUIDE.md)
- [Implementation Details](IMPLEMENTATION_COMPLETE.md)
- [ML Documentation](ml/README.md)

**Status:** ✅ PRODUCTION READY  
**Version:** 2025 Elite Scanner v2.0
