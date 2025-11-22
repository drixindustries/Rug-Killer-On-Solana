# train_xgboost_pro.py — FULL AUTO-TUNED TRAINING (Run weekly)
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV
from sklearn.metrics import f1_score, accuracy_score, roc_auc_score
from scipy.stats import uniform, randint
import joblib
from datetime import datetime
import warnings
import os
warnings.filterwarnings("ignore")

# 1. Load latest data
def load_training_data():
    """Load all available training datasets"""
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    dfs = []
    
    # Try to load various data sources
    for filename in ['solrpds_2025.csv', 'my_labeled_rugs.csv', 'training_data.csv']:
        filepath = os.path.join(data_dir, filename)
        if os.path.exists(filepath):
            print(f"Loading {filename}...")
            dfs.append(pd.read_csv(filepath))
    
    if not dfs:
        raise FileNotFoundError("No training data found! Place CSV files in ml/data/")
    
    df = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(df)} samples")
    return df

# 2. Feature engineering (same as live inference)
def engineer_features(df):
    """Transform raw token data into ML features"""
    features = pd.DataFrame({
        'mint_revoked': (df.get('mint_authority', pd.Series([None] * len(df))).isna()).astype(int),
        'freeze_revoked': (df.get('freeze_authority', pd.Series([None] * len(df))).isna()).astype(int),
        'lp_burned_pct': df.get('lp_burned', 0) / (df.get('total_supply', 1) + 1),
        'honeypot': df.get('honeypot', 0).astype(int),
        'tax_buy': df.get('buy_tax', 0),
        'tax_sell': df.get('sell_tax', 0),
        'real_holders': df.get('holders_after_filter', df.get('holders', 0)),
        'top10_concentration': df.get('top10_pct', 0),
        'sniper_pct': df.get('sniper_wallets_pct', 0),
        'dev_buy_pct': df.get('dev_bought_pct', 0),
        'bundled_clusters': df.get('jito_bundle_clusters', 0),
        'mc_to_liq_ratio': df.get('market_cap', 0) / (df.get('liquidity', 1) + 1),
        'slippage_10k': df.get('slippage_10k', 0),
        'volume_velocity_5m': df.get('vol_5m', 0) / (df.get('vol_1m', 1) + 1),
        'price_change_5m': df.get('price_change_5m', 0),
        'buy_density_kde_peak': df.get('kde_floor', 0),
        'avg_buy_price': df.get('avg_buy_price', 0),
        'hours_since_migration': df.get('hours_post_migration', 0),
        'jito_bundle_detected': df.get('jito_bundle', 0).astype(int),
        'cluster_risk_score': df.get('gnn_cluster_prob', 0),
    })
    
    # Replace any NaN or inf values
    features = features.replace([np.inf, -np.inf], 0).fillna(0)
    return features

def main():
    print("=" * 80)
    print("XGBoost Auto-Tuned Training Pipeline — 2025 Production")
    print("=" * 80)
    
    # Load data
    df = load_training_data()
    
    # Engineer features
    X = engineer_features(df)
    
    # Get labels (1 = rug, 0 = safe)
    if 'label' not in df.columns and 'is_rug' in df.columns:
        y = df['is_rug'].astype(int)
    elif 'label' in df.columns:
        y = df['label'].astype(int)
    else:
        raise ValueError("No label column found! Need 'label' or 'is_rug' column")
    
    print(f"\nFeatures: {X.shape[1]} columns")
    print(f"Samples: {len(X)} total ({y.sum()} rugs, {len(y) - y.sum()} safe)")
    print(f"Rug ratio: {y.mean():.2%}")
    
    # 3. Hyperparameter tuning with RandomizedSearchCV + Stratified K-Fold
    param_dist = {
        'n_estimators': randint(200, 800),
        'max_depth': randint(4, 12),
        'learning_rate': uniform(0.01, 0.3),
        'subsample': uniform(0.6, 0.4),
        'colsample_bytree': uniform(0.6, 0.4),
        'min_child_weight': randint(1, 10),
        'gamma': uniform(0, 0.5),
        'reg_alpha': uniform(0, 1),
        'reg_lambda': uniform(0, 2),
    }
    
    # 5-fold stratified CV (preserves rug ratio)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # Check if GPU is available
    try:
        tree_method = 'gpu_hist'
        test_model = xgb.XGBClassifier(tree_method=tree_method, n_estimators=1)
        test_model.fit(X.head(10), y.head(10))
        print("\n✓ GPU acceleration enabled (gpu_hist)")
    except:
        tree_method = 'hist'
        print("\n✓ Using CPU acceleration (hist)")
    
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
        tree_method=tree_method,
        random_state=42,
        n_jobs=-1
    )
    
    search = RandomizedSearchCV(
        estimator=model,
        param_distributions=param_dist,
        n_iter=100,              # Try 100 random combos
        scoring='f1',            # Optimize for F1 (best for imbalanced rugs)
        cv=cv,
        verbose=1,
        n_jobs=-1,
        random_state=42
    )
    
    print("\n" + "=" * 80)
    print("Starting hyperparameter tuning (this takes 10-30 min)...")
    print("=" * 80)
    search.fit(X, y)
    
    best_model = search.best_estimator_
    print(f"\n✓ Best F1 Score: {search.best_score_:.4f}")
    print(f"✓ Best parameters:")
    for param, value in search.best_params_.items():
        print(f"  {param}: {value}")
    
    # 4. Final training on full dataset with best params
    print("\n" + "=" * 80)
    print("Training final model on full dataset...")
    print("=" * 80)
    final_model = xgb.XGBClassifier(**best_model.get_params())
    final_model.fit(X, y)
    
    # Calculate final metrics
    y_pred = final_model.predict(X)
    y_proba = final_model.predict_proba(X)[:, 1]
    
    accuracy = accuracy_score(y, y_pred)
    f1 = f1_score(y, y_pred)
    auc = roc_auc_score(y, y_proba)
    
    print(f"\n✓ Final Model Performance:")
    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  F1 Score: {f1:.4f}")
    print(f"  ROC-AUC:  {auc:.4f}")
    
    # 5. Save model + metadata
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d')
    model_name = f"xgboost_rug_model_{timestamp}_f1_{f1:.4f}.pkl"
    model_path = os.path.join(models_dir, model_name)
    latest_path = os.path.join(models_dir, "xgboost_rug_model_latest.pkl")
    
    joblib.dump(final_model, model_path)
    joblib.dump(final_model, latest_path)
    
    print(f"\n✓ Model saved:")
    print(f"  {model_path}")
    print(f"  {latest_path}")
    
    # Save tuning results
    results = pd.DataFrame(search.cv_results_)
    results_sorted = results.sort_values('mean_test_score', ascending=False)
    results_path = os.path.join(models_dir, f"tuning_log_{timestamp}.csv")
    results_sorted.head(10).to_csv(results_path, index=False)
    print(f"  {results_path}")
    
    # Save feature importance
    feature_importance = pd.Series(
        final_model.feature_importances_, 
        index=X.columns
    ).sort_values(ascending=False)
    
    importance_path = os.path.join(models_dir, f"feature_importance_{timestamp}.csv")
    feature_importance.to_csv(importance_path, header=['importance'])
    
    print(f"\n✓ Top 10 Most Important Features:")
    for i, (feature, importance) in enumerate(feature_importance.head(10).items(), 1):
        print(f"  {i:2d}. {feature:25s} {importance:.4f}")
    
    # Save metadata
    metadata = {
        'timestamp': datetime.now().isoformat(),
        'samples': len(X),
        'features': list(X.columns),
        'rug_ratio': float(y.mean()),
        'best_f1': float(search.best_score_),
        'final_f1': float(f1),
        'final_accuracy': float(accuracy),
        'final_auc': float(auc),
        'best_params': search.best_params_,
    }
    
    import json
    metadata_path = os.path.join(models_dir, f"model_metadata_{timestamp}.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n{'=' * 80}")
    print("✓ Training Complete! Model ready for production.")
    print(f"{'=' * 80}\n")

if __name__ == "__main__":
    main()
