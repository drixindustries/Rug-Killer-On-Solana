# 🚀 2025 Solana Scanner Bot - Complete Setup Guide

This guide covers the complete implementation of the enhanced 2025 bot card format and XGBoost auto-tuned ML pipeline.

## ✅ What's Been Implemented

### 1. Enhanced Bot Card Format
- ✅ Clean security section with "ALL GREEN" indicator
- ✅ Holder analysis with ML scan filtering (Pump.fun + CEX + Jito excluded)
- ✅ Floor & Support Analysis with XGBoost + KDE Hybrid
- ✅ Enhanced market data with prominent price changes
- ✅ Best Solana Trading Tools section with Jupiter, Photon, BullX, Trojan, BonkBot, Ave.ai
- ✅ Jito Explorer integration

### 2. Complete XGBoost Training Pipeline
- ✅ `train_xgboost_pro.py` - Full auto-tuned training with RandomizedSearchCV
- ✅ `predict.py` - Live inference for production
- ✅ `download_latest_solrpds.py` - Weekly dataset downloader
- ✅ Automated training scripts (PowerShell + Bash)
- ✅ 5-fold Stratified Cross-Validation
- ✅ F1 Score optimization (0.94-0.96 target)
- ✅ GPU acceleration support

## 📦 Installation

### Step 1: Install ML Dependencies

```bash
# Windows
cd ml
pip install -r requirements.txt

# Linux/Mac
cd ml
pip3 install -r requirements.txt
```

### Step 2: Prepare Training Data

Place your labeled rug detection datasets in `ml/data/`:

```
ml/data/
├── solrpds_2025.csv
├── my_labeled_rugs.csv
└── training_data.csv
```

**Required columns in CSV:**
- `label` or `is_rug`: 1 = rug, 0 = safe
- Token metrics: `mint_authority`, `freeze_authority`, `lp_burned`, etc.

A sample template is provided at `ml/data/sample_training_data.csv`.

### Step 3: Train Initial Model

```bash
# Windows
cd ml
python train_xgboost_pro.py

# Linux/Mac
cd ml
python3 train_xgboost_pro.py
```

This will create `ml/models/xgboost_rug_model_latest.pkl`.

## 🤖 Bot Integration

### Option A: TypeScript Integration (Recommended)

Create `server/ml-integration.ts`:

```typescript
import { spawn } from 'child_process';
import path from 'path';

export interface MLPrediction {
  score: number;        // 0-100, higher = safer
  level: string;        // "LOW", "MEDIUM", "HIGH", "EXTREME"
  rugProbability: number; // 0-1
  riskFactors: string[];
}

export async function predictRugScore(
  features: Record<string, any>
): Promise<MLPrediction> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../ml/predict.py');
    
    const python = spawn('python', [
      pythonScript,
      '--features',
      JSON.stringify(features)
    ]);
    
    let output = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('ML prediction failed'));
        return;
      }
      
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}
```

### Option B: REST API Integration

Add to `server/routes.ts`:

```typescript
app.post('/api/ml/predict', async (req, res) => {
  try {
    const { features } = req.body;
    const prediction = await predictRugScore(features);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'ML prediction failed' });
  }
});
```

## 🔄 Weekly Auto-Training Setup

### Windows (Task Scheduler)

1. Open Task Scheduler (Win + R, `taskschd.msc`)
2. Create Basic Task:
   - Name: "Weekly ML Training"
   - Trigger: Weekly, Sunday, 3:00 AM
   - Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\path\to\scripts\weekly-ml-training.ps1"`
   - Start in: `C:\path\to\Rug-Killer-On-Solana`

**Or run manually:**
```powershell
.\scripts\weekly-ml-training.ps1
```

### Linux/Mac (Cron)

```bash
# Make script executable
chmod +x scripts/weekly-ml-training.sh

# Edit crontab
crontab -e

# Add this line (Sundays at 3 AM)
0 3 * * 0 cd /path/to/Rug-Killer-On-Solana && ./scripts/weekly-ml-training.sh >> /var/log/ml-training.log 2>&1
```

**Or run manually:**
```bash
./scripts/weekly-ml-training.sh
```

## 📊 Example Bot Card Output

```
━━━━━━━━━━━━━━━━━━━━━━
🚀 $ZKTTR 9 min post-migration
━━━━━━━━━━━━━━━━━━━━━━

Risk Level: LOW   98/100 (Higher = Safer)

✅ Security (ALL GREEN)
✅ Mint Revoked      ✅ Freeze Revoked      ✅ LP 100% BURNED
✅ Honeypot: Passed      ✅ Tax: 0%/0%      ✅ Metadata: Locked
✅ Jito Bundles: None detected (clean LP tx)

👥 Holders (clean — Pump.fun + CEX + Jito excluded)
3,847 real holders • Top 10: 15.4% • Snipers: 7%
Dev bought: 0% • Bundled clusters: 0 (ML scan: safe)

💰 Market
Price: $0.0001824   🚀 +1,638%
MCap: $182K         Liquidity: $94K     24h Vol: $2.41M

📊 Floor & Support Analysis (XGBoost + KDE Hybrid)
🚀 Current vs Floor: +214%
• Floor Price: $0.0000581 (95% confidence, XGBoost F1: 0.95)
• Next Support Levels:
  1. $0.000131 (-28%) • 42% of buys
  2. $0.000089 (-51%) • 67% of buys
  3. $0.000058 (-68%) • Strong floor

Best Solana Trading Tools
[Buy 0.5% • Jupiter]  [Buy 1% • Photon]  [Buy 2% • BullX]
[Limit Orders • Trojan]  [Snipe • BonkBot]  [Track • Ave.ai]
Quick Links → Solscan • DexScreener • RugCheck • Birdeye • GMGN • Jito Explorer
```

## 🎯 Feature Engineering

The model uses 20 features engineered from raw token data:

**Security (3 features):**
- mint_revoked, freeze_revoked, lp_burned_pct

**Taxes (3 features):**
- honeypot, tax_buy, tax_sell

**Holders (4 features):**
- real_holders, top10_concentration, sniper_pct, dev_buy_pct

**Bundles (2 features):**
- bundled_clusters, jito_bundle_detected

**Market (4 features):**
- mc_to_liq_ratio, slippage_10k, volume_velocity_5m, price_change_5m

**Floor (2 features):**
- buy_density_kde_peak, avg_buy_price

**Temporal (2 features):**
- hours_since_migration, cluster_risk_score

## 📈 Model Performance Targets

With proper 2025 datasets:
- **F1 Score:** 0.94-0.96
- **Accuracy:** 0.92-0.95
- **ROC-AUC:** 0.96-0.98
- **False Positive Rate:** <5%

## 🔧 Customization

### Add New Trading Tool

Edit `server/bot-formatter.ts`:

```typescript
const links = `**Best Solana Trading Tools**
[Buy 0.5% • Jupiter](...)  [Your Tool • Link](...)
...`;
```

### Modify Risk Scoring

Edit `ml/predict.py`:

```python
# Adjust thresholds
if score >= 95:      # was 90
    level = "LOW"
elif score >= 75:    # was 70
    level = "MEDIUM"
...
```

### Add Custom Features

1. Update `train_xgboost_pro.py`:
```python
def engineer_features(df):
    return pd.DataFrame({
        # ... existing features
        'your_new_feature': df.get('your_metric', 0),
    })
```

2. Update `predict.py` with same feature

3. Retrain: `python train_xgboost_pro.py`

## 🐛 Troubleshooting

### Bot shows old format
- **Cause:** Bot not restarted after updating `bot-formatter.ts`
- **Fix:** Restart the bot service

### ML predictions failing
- **Cause:** Model file not found
- **Fix:** Run `python ml/train_xgboost_pro.py` first

### Low model accuracy (<0.85 F1)
- **Cause:** Insufficient or poor quality training data
- **Fix:** 
  1. Collect more labeled samples (aim for 1000+ of each class)
  2. Verify labels are accurate
  3. Increase `n_iter` to 200+ in training script

### GPU not detected
- **Cause:** CUDA not installed or wrong XGBoost version
- **Fix:** Install CUDA Toolkit and `pip install xgboost[gpu]`

## 📚 File Structure

```
Rug-Killer-On-Solana/
├── ml/
│   ├── train_xgboost_pro.py       # Training pipeline
│   ├── predict.py                  # Live inference
│   ├── download_latest_solrpds.py # Dataset downloader
│   ├── requirements.txt            # Python deps
│   ├── README.md                   # ML documentation
│   ├── models/                     # Trained models
│   │   ├── xgboost_rug_model_latest.pkl
│   │   └── model_metadata_*.json
│   └── data/                       # Training datasets
│       └── training_data.csv
├── scripts/
│   ├── weekly-ml-training.ps1     # Windows automation
│   └── weekly-ml-training.sh      # Linux/Mac automation
└── server/
    └── bot-formatter.ts            # Enhanced 2025 format
```

## 🚀 Next Steps

1. **Test the new bot card format:**
   ```bash
   # Analyze a token to see the new format
   curl http://localhost:5000/api/analyze/YOUR_TOKEN_MINT
   ```

2. **Train your first model:**
   ```bash
   cd ml
   python train_xgboost_pro.py
   ```

3. **Set up weekly training:**
   - Windows: Create Task Scheduler job
   - Linux/Mac: Add to crontab

4. **Monitor model performance:**
   - Check `ml/models/model_metadata_*.json`
   - Review `ml/training_history.log`
   - Track false positives/negatives in production

## 🤝 Support

- **ML Issues:** Check `ml/README.md`
- **Bot Issues:** See main `README.md`
- **Training Data:** Use sample at `ml/data/sample_training_data.csv`

## 📄 License

Same as parent project - see root LICENSE file.
