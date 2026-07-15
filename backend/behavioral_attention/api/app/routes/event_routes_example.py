'''
This file is not registered in main.py by default.

It shows how a future endpoint could work if you want the frontend to send raw interaction events instead of already-calculated features.

Example future flow:
1. Frontend sends raw events:
   - task_started
   - first_response
   - retry
   - hint_used
   - focus_lost
   - task_completed
2. Backend calculates:
   - response_latency_sec
   - retry_count
   - focus_loss_count
   - engagement_score
3. Backend sends calculated features to the model.

For now, the active endpoint expects already-calculated features:
POST /predict/behavior
'''
