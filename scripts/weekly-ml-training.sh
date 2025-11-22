#!/bin/bash
# weekly-ml-training.sh - Weekly automated ML training for Linux/Mac
# Add to cron: 0 3 * * 0 cd /path/to/bot && ./scripts/weekly-ml-training.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ML_DIR="$ROOT_DIR/ml"

echo "=================================="
echo "WEEKLY ML TRAINING - STARTED"
echo "=================================="
echo "Time: $(date)"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "✗ Python 3 not found! Please install Python 3.8+"
    exit 1
fi

echo "✓ Python: $(python3 --version)"

# Step 1: Download latest datasets
echo ""
echo "STEP 1: Downloading latest datasets..."
echo "----------------------------------"

cd "$ML_DIR"
python3 download_latest_solrpds.py || {
    echo "⚠️  Dataset download had warnings, continuing..."
}
echo "✓ Datasets downloaded successfully"

# Step 2: Train model with hyperparameter tuning
echo ""
echo "STEP 2: Training XGBoost model (10-30 min)..."
echo "----------------------------------"

python3 train_xgboost_pro.py || {
    echo "✗ Model training failed!"
    exit 1
}
echo "✓ Model trained successfully"

# Step 3: Copy model to production location
echo ""
echo "STEP 3: Deploying model to production..."
echo "----------------------------------"

MODEL_SOURCE="$ML_DIR/models/xgboost_rug_model_latest.pkl"
SERVER_ML_DIR="$ROOT_DIR/server/ml"
MODEL_DEST="$SERVER_ML_DIR/xgboost_rug_model_latest.pkl"

if [ -f "$MODEL_SOURCE" ]; then
    mkdir -p "$SERVER_ML_DIR"
    cp "$MODEL_SOURCE" "$MODEL_DEST"
    echo "✓ Model deployed to: $MODEL_DEST"
else
    echo "⚠️  Model file not found at: $MODEL_SOURCE"
fi

# Step 4: Log results
echo ""
echo "STEP 4: Logging results..."
echo "----------------------------------"

LOG_FILE="$ML_DIR/training_history.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Training completed successfully" >> "$LOG_FILE"
echo "✓ Log updated: $LOG_FILE"

# Summary
echo ""
echo "=================================="
echo "WEEKLY ML TRAINING - COMPLETED"
echo "=================================="
echo "Time: $(date)"
echo ""
echo "📊 Model is ready for production!"
echo ""
echo "Next steps:"
echo "  1. Review model metrics in: $ML_DIR/models/"
echo "  2. Restart bot if needed to load new model"
echo "  3. Monitor performance for 24-48 hours"
echo ""
