import pandas as pd
from typing import Dict, Any
from app.schemas.feature_columns import FEATURE_COLUMNS, NUMERIC_COLUMNS, CATEGORICAL_COLUMNS

def build_feature_dataframe(payload: Dict[str, Any]):
    '''
    Converts the incoming JSON payload into the exact feature columns used during training.

    Missing numeric values are set to None so the model pipeline's SimpleImputer can handle them.
    Missing categorical values are also set to None so the model pipeline can impute them.
    '''
    missing_columns = []
    cleaned = {}

    for col in FEATURE_COLUMNS:
        value = payload.get(col, None)

        if value is None:
            missing_columns.append(col)
            cleaned[col] = None
            continue

        if col in NUMERIC_COLUMNS:
            try:
                cleaned[col] = float(value)
            except Exception:
                cleaned[col] = None
                missing_columns.append(col)
        else:
            cleaned[col] = str(value)

    feature_df = pd.DataFrame([cleaned], columns=FEATURE_COLUMNS)
    return feature_df, missing_columns
