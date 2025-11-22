# 🤖 XGBoost Auto-Tuned ML Pipeline for Rug Detection

This directory contains the complete production-ready machine learning pipeline for detecting Solana rug pulls using XGBoost with automatic hyperparameter tuning.

## 📁 Directory Structure

```
ml/
├── train_xgboost_pro.py          # Main training pipeline with auto-tuning
├── predict.py                     # Live inference for bot integration
├── download_latest_solrpds.py    # Weekly dataset downloader
├── requirements.txt               # Python dependencies
├── models/                        # Trained models and metadata
│   ├── xgboost_rug_model_latest.pkl
│   └── model_metadata_*.json
└── data/                          # Training datasets
    └── training_data.csv
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Windows PowerShell
cd ml
pip install -r requirements.txt

# Linux/Mac
cd ml
pip3 install -r requirements.txt
```

### 2. Prepare Training Data

Place your labeled dataset(s) in the `data/` directory with the following columns:

**Required columns:**
- `label` or `is_rug`: 1 for rug, 0 for safe
- Token metrics: `mint_authority`, `freeze_authority`, `lp_burned`, `total_supply`, etc.

**Example:**
```csv
mint_authority,freeze_authority,lp_burned,total_supply,honeypot,buy_tax,sell_tax,holders,top10_pct,label
None,None,950000000,1000000000,False,0,0,3847,15.4,0
0xABC...,0xDEF...,100000000,1000000000,True,10,25,152,78.2,1
```

### 3. Train the Model

```bash
# Windows
python train_xgboost_pro.py

# Linux/Mac
python3 train_xgboost_pro.py
```

This will:
- Load and consolidate all training data
- Engineer 20+ features from raw metrics
- Perform 100 iterations of RandomizedSearchCV with 5-fold cross-validation
- Optimize for F1 score (best for imbalanced rug detection)
- Save the best model as `models/xgboost_rug_model_latest.pkl`
- Generate feature importance and tuning logs

**Training time:** 10-30 minutes depending on dataset size and hardware

### 4. Test Predictions

```bash
# Windows
python predict.py

# Linux/Mac
python3 predict.py
```

## 🔄 Weekly Auto-Training (Self-Learning Bot)

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Weekly, Sunday at 3:00 AM
4. Set action: Run `scripts\weekly-ml-training.ps1`

Or run manually:
```powershell
.\scripts\weekly-ml-training.ps1
```

### Linux/Mac (Cron)

```bash
# Make script executable
chmod +x scripts/weekly-ml-training.sh

# Add to crontab (Sundays at 3 AM)
crontab -e
```

Add this line:
```
0 3 * * 0 cd /path/to/Rug-Killer-On-Solana && ./scripts/weekly-ml-training.sh
```

Or run manually:
```bash
./scripts/weekly-ml-training.sh
```

## 🧪 Features Engineered

The model uses 20 engineered features:

1. **Security Features:**
   - `mint_revoked`: Mint authority status
   - `freeze_revoked`: Freeze authority status
   - `lp_burned_pct`: Liquidity pool burn percentage

2. **Tax & Honeypot:**
   - `honeypot`: Honeypot detection flag
   - `tax_buy`, `tax_sell`: Buy/sell taxes

3. **Holder Analysis:**
   - `real_holders`: Holders after filtering
   - `top10_concentration`: Top 10 holder percentage
   - `sniper_pct`: Sniper wallet percentage
   - `dev_buy_pct`: Developer buy percentage

4. **Bundle Detection:**
   - `bundled_clusters`: Jito bundle clusters
   - `jito_bundle_detected`: Bundle detection flag

5. **Market Metrics:**
   - `mc_to_liq_ratio`: Market cap to liquidity ratio
   - `slippage_10k`: Slippage on $10k trade
   - `volume_velocity_5m`: Volume acceleration
   - `price_change_5m`: Recent price change

6. **Floor Analysis:**
   - `buy_density_kde_peak`: KDE floor price
   - `avg_buy_price`: Average buy price

7. **Temporal Analysis:**
   - `hours_since_migration`: Age post-migration
   - `cluster_risk_score`: GNN cluster probability

## 📊 Model Performance

Target metrics (achievable with 2025 datasets):
- **F1 Score:** 0.94-0.96
- **Accuracy:** 0.92-0.95
- **ROC-AUC:** 0.96-0.98
- **False Positive Rate:** <5%

## 🔗 Integration with Bot

### TypeScript Integration (Coming Soon)

```typescript
// In your bot code
import { execSync } from 'child_process';

function predictRugScore(tokenMint: string): { score: number, level: string } {
  const features = getTokenFeatures(tokenMint); // Your function
  
  // Call Python predictor
  const result = execSync(
    `python ml/predict.py --features '${JSON.stringify(features)}'`
  ).toString();
  
  return JSON.parse(result);
}
```

### Direct Python Integration

```python
from ml.predict import predict_rug_score, get_risk_factors

# Get token features
features = {
    'mint_authority': None,
    'freeze_authority': None,
    'lp_burned': 900000000,
    'total_supply': 1000000000,
    # ... other features
}

# Predict
score, level, prob = predict_rug_score(features)
risks = get_risk_factors(features, prob)

print(f"Score: {score}/100")
print(f"Risk Level: {level}")
print(f"Risk Factors: {', '.join(risks)}")
```

## 🎯 Hyperparameter Tuning

The training pipeline uses RandomizedSearchCV with these parameter ranges:

- `n_estimators`: 200-800 trees
- `max_depth`: 4-12 levels
- `learning_rate`: 0.01-0.31
- `subsample`: 0.6-1.0
- `colsample_bytree`: 0.6-1.0
- `min_child_weight`: 1-10
- `gamma`: 0-0.5
- `reg_alpha`: 0-1 (L1 regularization)
- `reg_lambda`: 0-2 (L2 regularization)

The search runs 100 iterations with 5-fold stratified cross-validation, optimizing for F1 score.

## 📈 Monitoring Model Performance

After each training run, check these files:

1. **Model Metadata:** `models/model_metadata_YYYYMMDD.json`
   - F1 score, accuracy, AUC
   - Best hyperparameters
   - Training timestamp

2. **Feature Importance:** `models/feature_importance_YYYYMMDD.csv`
   - Which features matter most
   - Use to improve feature engineering

3. **Tuning Log:** `models/tuning_log_YYYYMMDD.csv`
   - Top 10 hyperparameter combinations
   - Cross-validation scores

4. **Training History:** `training_history.log`
   - All training runs
   - Success/failure logs

## 🔥 GPU Acceleration

For faster training (10x speedup):

1. Install CUDA Toolkit from NVIDIA
2. Install GPU-enabled XGBoost:
   ```bash
   pip install xgboost[gpu]>=2.0.0
   ```
3. The training script will auto-detect GPU and use `gpu_hist`

## 🐛 Troubleshooting

### "No module named 'xgboost'"
```bash
pip install -r ml/requirements.txt
```

### "No training data found"
Place CSV files in `ml/data/` directory with proper columns.

### "Model not found" during prediction
Run `train_xgboost_pro.py` first to create the model.

### Poor model performance (<0.85 F1)
- Check dataset quality and labeling
- Ensure sufficient samples (>1000 rugs, >1000 safe)
- Verify feature engineering matches data format
- Increase `n_iter` in RandomizedSearchCV (line 79)

## 📚 Resources

- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [Scikit-learn Grid Search](https://scikit-learn.org/stable/modules/grid_search.html)
- [F1 Score Explanation](https://en.wikipedia.org/wiki/F-score)
- [Imbalanced Learning Guide](https://imbalanced-learn.org/)

## 🤝 Contributing

To add new features:

1. Update `engineer_features()` in `train_xgboost_pro.py`
2. Update `engineer_features_for_prediction()` in `predict.py`
3. Ensure both functions create identical feature sets
4. Retrain model
5. Test on validation set

## 📄 License

Same as parent project (see root LICENSE file)
