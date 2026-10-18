from typing import Any, Optional
from pydantic import ConfigDict, Field, create_model
from app.schemas.feature_columns import FEATURE_COLUMNS, NUMERIC_COLUMNS

BINARY_COLUMNS = {"task_completion_status"}
UNIT_INTERVAL_COLUMNS = {"accuracy_score", "environment_distraction_level"}

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

BehaviorRequest = create_model(
    "BehaviorRequest",
    __config__=ConfigDict(extra="allow", allow_inf_nan=False),
    **{col: _field(col) for col in FEATURE_COLUMNS},
)
