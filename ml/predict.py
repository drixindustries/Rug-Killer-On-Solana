# predict.py — Live inference for rug detection
import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, Tuple, Any

# Load model once at module level
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "xgboost_rug_model_latest.pkl")

try:
    model = joblib.load(MODEL_PATH)
    print(f"✓ XGBoost model loaded: {MODEL_PATH}")
except FileNotFoundError:
    print(f"⚠ Warning: Model not found at {MODEL_PATH}")
    print("  Run train_xgboost_pro.py first to create the model")
    model = None

def engineer_features_for_prediction(features: Dict[str, Any]) -> pd.DataFrame:
    """Transform raw token features into ML input format
    
    Args:
        features: Dictionary with token metrics
        
    Returns:
        DataFrame with engineered features ready for prediction
    """
    df = pd.DataFrame({
        'mint_revoked': [1 if features.get('mint_authority') is None else 0],
        'freeze_revoked': [1 if features.get('freeze_authority') is None else 0],
        'lp_burned_pct': [features.get('lp_burned', 0) / (features.get('total_supply', 1) + 1)],
        'honeypot': [1 if features.get('honeypot', False) else 0],
        'tax_buy': [features.get('buy_tax', 0)],
        'tax_sell': [features.get('sell_tax', 0)],
        'real_holders': [features.get('holders_after_filter', features.get('holders', 0))],
        'top10_concentration': [features.get('top10_pct', 0)],
        'sniper_pct': [features.get('sniper_wallets_pct', 0)],
        'dev_buy_pct': [features.get('dev_bought_pct', 0)],
        'bundled_clusters': [features.get('jito_bundle_clusters', 0)],
        'mc_to_liq_ratio': [features.get('market_cap', 0) / (features.get('liquidity', 1) + 1)],
        'slippage_10k': [features.get('slippage_10k', 0)],
        'volume_velocity_5m': [features.get('vol_5m', 0) / (features.get('vol_1m', 1) + 1)],
        'price_change_5m': [features.get('price_change_5m', 0)],
        'buy_density_kde_peak': [features.get('kde_floor', 0)],
        'avg_buy_price': [features.get('avg_buy_price', 0)],
        'hours_since_migration': [features.get('hours_post_migration', 0)],
        'jito_bundle_detected': [1 if features.get('jito_bundle', False) else 0],
        'cluster_risk_score': [features.get('gnn_cluster_prob', 0)],
    })
    
    # Replace any NaN or inf values
    df = df.replace([np.inf, -np.inf], 0).fillna(0)
    return df

def predict_rug_score(features: Dict[str, Any]) -> Tuple[int, str, float]:
    """Predict rug pull probability and risk level
    
    Args:
        features: Dictionary with token metrics
        
    Returns:
        Tuple of (score, risk_level, rug_probability)
        - score: 0-100, higher = safer
        - risk_level: "LOW", "MEDIUM", "HIGH", or "EXTREME"
        - rug_probability: 0-1, raw model probability
    """
    if model is None:
        # Fallback to rule-based scoring if model not loaded
        return fallback_scoring(features)
    
    # Engineer features
    df = engineer_features_for_prediction(features)
    
    # Get prediction
    rug_prob = model.predict_proba(df)[0][1]  # Probability of being a rug
    
    # Convert to safety score (invert)
    score = int((1 - rug_prob) * 100)
    
    # Determine risk level
    if score >= 90:
        level = "LOW"
    elif score >= 70:
        level = "MEDIUM"
    elif score >= 40:
        level = "HIGH"
    else:
        level = "EXTREME"
    
    return score, level, rug_prob

def fallback_scoring(features: Dict[str, Any]) -> Tuple[int, str, float]:
    """Simple rule-based scoring when ML model is unavailable"""
    score = 100
    
    # Deduct points for red flags
    if features.get('mint_authority') is not None:
        score -= 20
    if features.get('freeze_authority') is not None:
        score -= 20
    if features.get('honeypot', False):
        score -= 30
    if features.get('buy_tax', 0) > 5 or features.get('sell_tax', 0) > 5:
        score -= 15
    if features.get('top10_pct', 0) > 50:
        score -= 10
    if features.get('lp_burned', 0) < features.get('total_supply', 1) * 0.9:
        score -= 10
    
    score = max(0, min(100, score))
    rug_prob = 1 - (score / 100)
    
    if score >= 90:
        level = "LOW"
    elif score >= 70:
        level = "MEDIUM"
    elif score >= 40:
        level = "HIGH"
    else:
        level = "EXTREME"
    
    return score, level, rug_prob

def get_risk_factors(features: Dict[str, Any], rug_prob: float) -> list:
    """Identify top risk factors for this token
    
    Args:
        features: Dictionary with token metrics
        rug_prob: Model's rug probability
        
    Returns:
        List of risk factor strings
    """
    risks = []
    
    if features.get('mint_authority') is not None:
        risks.append("Mint authority not revoked")
    if features.get('freeze_authority') is not None:
        risks.append("Freeze authority not revoked")
    if features.get('honeypot', False):
        risks.append("Honeypot detected")
    if features.get('buy_tax', 0) > 5:
        risks.append(f"High buy tax: {features['buy_tax']}%")
    if features.get('sell_tax', 0) > 5:
        risks.append(f"High sell tax: {features['sell_tax']}%")
    if features.get('top10_pct', 0) > 50:
        risks.append(f"High concentration: Top 10 hold {features['top10_pct']:.1f}%")
    if features.get('jito_bundle_clusters', 0) > 3:
        risks.append(f"Multiple Jito bundles detected: {features['jito_bundle_clusters']}")
    if features.get('lp_burned', 0) < features.get('total_supply', 1) * 0.5:
        risks.append("Low LP burn percentage")
    
    return risks[:5]  # Return top 5 risks

# Example usage and CLI interface
if __name__ == "__main__":
    import sys
    import json
    
    # Check if CLI arguments provided
    if len(sys.argv) > 2 and sys.argv[1] == '--features':
        # CLI mode for TypeScript integration
        try:
            features = json.loads(sys.argv[2])
            score, level, prob = predict_rug_score(features)
            risks = get_risk_factors(features, prob)
            
            # Output as JSON for easy parsing
            result = {
                'score': score,
                'level': level,
                'rugProbability': prob,
                'riskFactors': risks
            }
            print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({'error': str(e)}), file=sys.stderr)
            sys.exit(1)
    
    # Test mode with sample data
    sample_features = {
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
    
    score, level, prob = predict_rug_score(sample_features)
    risks = get_risk_factors(sample_features, prob)
    
    print(f"\nRug Detection Result:")
    print(f"  Score: {score}/100")
    print(f"  Risk Level: {level}")
    print(f"  Rug Probability: {prob:.2%}")
    print(f"\nRisk Factors:")
    for risk in risks:
        print(f"  • {risk}")
