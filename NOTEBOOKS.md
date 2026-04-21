# LexiScan — Model Training Notebooks

Google Colab notebooks used to train the ML models for each screening module.

| Module | Description | Colab Link |
|--------|-------------|------------|
| Speech & Phonological | Trains speech risk classifier and score regressor from audio features | [Open in Colab](https://colab.research.google.com/drive/1ZikeYzy7MXKJ5j_np0FIYQFfZ8RrBVlT?usp=sharing) |
| Behavioral & Attention | Trains behavior risk classifier and score regressor from questionnaire data | [Open in Colab](https://colab.research.google.com/drive/11MUogHH06H_JkWFEpsOaHlBNU04Y3xqD?usp=sharing) |
| Handwriting Analysis | Trains handwriting risk classifier from image features | [Open in Colab](https://colab.research.google.com/drive/10HErXoomjlo9fuTir22Zyg677JJk2hpP?usp=sharing) |
| Multi-Modal Risk Fusion | Trains fusion classifier combining all modalities into a unified risk score | [Open in Colab](https://colab.research.google.com/drive/1Q9yxXISkWEa-HHmp1GNHGSUpdeaTkCqc?usp=sharing) |

## Output Models

Each notebook produces trained `.pkl` model files saved to the corresponding `ml_models/` folder:

| Module | Model Files |
|--------|------------|
| `speech_phonological/ml_models/` | `speech_risk_classifier.pkl`, `speech_score_regressor.pkl` |
| `behavioral_attention/ml_models/` | `behavior_risk_classifier.pkl`, `behavior_score_regressor.pkl` |
| `handwriting_analysis/ml_models/` | `handwriting_risk_classifier.pkl` |
| `multi_modal_risk/ml_models/` | `fusion_final_risk_classifier.pkl`, `fusion_primary_difficulty_classifier.pkl` |
