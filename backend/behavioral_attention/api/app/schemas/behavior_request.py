# Request validation for POST /predict/behavior.
# Builds the BehaviorRequest model automatically from the feature list in feature_columns.py.
# Used by routes/predict_routes.py; bad values (e.g. age 12, score 1.5) are rejected with a 422 error.
from typing import Any, Optional
from pydantic import ConfigDict, Field, create_model
from app.schemas.feature_columns import FEATURE_COLUMNS, NUMERIC_COLUMNS

# Columns that must be exactly 0 or 1. The second set holds columns that must be between 0 and 1.
BINARY_COLUMNS = {"task_completion_status"}
UNIT_INTERVAL_COLUMNS = {"accuracy_score", "environment_distraction_level"}

# Picks the type and allowed range for one feature (age 3-10, *_score 0-1, *_flag 0/1, counts/seconds >= 0).
def _field(col: str):
    '''Field type and range for one model feature. Every feature stays optional; missing ones are imputed.'''
    if col not in NUMERIC_COLUMNS:
        return (Optional[Any], None)
    if col == "age":
        return (Optional[float], Field(None, ge=3, le=10))
    if col.endswith("_flag") or col in BINARY_COLUMNS:
        # int in lax mode accepts 0, 1, 0.0 and 1.0 but rejects 0.5
        return (Optional[int], Field(None, ge=0, le=1))
    if col.endswith("_score") or col in UNIT_INTERVAL_COLUMNS:
        return (Optional[float], Field(None, ge=0, le=1))
    # remaining numeric columns are *_count and *_sec values
    return (Optional[float], Field(None, ge=0))

# Builds the request model with one optional field per model feature; extra fields are allowed but NaN/infinity are refused.
BehaviorRequest = create_model(
    "BehaviorRequest",
    __config__=ConfigDict(extra="allow", allow_inf_nan=False),
    **{col: _field(col) for col in FEATURE_COLUMNS},
)
