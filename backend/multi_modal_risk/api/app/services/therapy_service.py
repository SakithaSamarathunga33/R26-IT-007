THERAPY_LIBRARY = {
    'phonological_processing': {
        'primary_focus': 'Speech and phonological awareness',
        'activities': [
            {'activity_id': 'SPEECH_001', 'title': 'Phoneme Matching Game', 'description': 'Match starting sounds with pictures or letters.', 'target_skill': 'phoneme_awareness', 'duration_minutes': 8},
            {'activity_id': 'SPEECH_002', 'title': 'Rhyme Identification', 'description': 'Identify words that rhyme from options.', 'target_skill': 'rhyme_training', 'duration_minutes': 8},
            {'activity_id': 'SPEECH_003', 'title': 'Sound Blending Practice', 'description': 'Blend separated sounds into a full word.', 'target_skill': 'sound_blending', 'duration_minutes': 10}
        ]
    },
    'handwriting': {
        'primary_focus': 'Handwriting and visual letter formation',
        'activities': [
            {'activity_id': 'WRITE_001', 'title': 'Letter Reversal Practice', 'description': 'Trace and copy b, d, p, and q.', 'target_skill': 'letter_reversal', 'duration_minutes': 10},
            {'activity_id': 'WRITE_002', 'title': 'Letter Formation Drill', 'description': 'Follow guided strokes to improve letter shape.', 'target_skill': 'letter_formation', 'duration_minutes': 10},
            {'activity_id': 'WRITE_003', 'title': 'Word Spacing Practice', 'description': 'Copy short words with visual spacing guides.', 'target_skill': 'spacing_control', 'duration_minutes': 8}
        ]
    },
    'attention_behavior': {
        'primary_focus': 'Attention and task engagement',
        'activities': [
            {'activity_id': 'BEHAVIOR_001', 'title': 'Focus Tap Game', 'description': 'Tap only when the correct cue appears.', 'target_skill': 'focus_training', 'duration_minutes': 7},
            {'activity_id': 'BEHAVIOR_002', 'title': 'Guided Short Task Sequence', 'description': 'Complete short structured instructions in order.', 'target_skill': 'guided_attention', 'duration_minutes': 8},
            {'activity_id': 'BEHAVIOR_003', 'title': 'Memory Sequence Game', 'description': 'Repeat a short visual sequence.', 'target_skill': 'working_memory', 'duration_minutes': 8}
        ]
    }
}

def sessions_per_week(risk_level):
    return 3 if risk_level == 'high' else 2 if risk_level == 'medium' else 1

def recommendation_intensity(risk_level):
    return 'intensive' if risk_level == 'high' else 'moderate' if risk_level == 'medium' else 'light'

def build_therapy_recommendation(final_prediction, primary_difficulty, secondary_difficulty_label):
    risk_level = final_prediction['final_dyslexia_risk_level']
    primary_label = primary_difficulty['primary_difficulty_label']
    primary_plan = THERAPY_LIBRARY.get(primary_label, THERAPY_LIBRARY['phonological_processing'])
    secondary_plan = None
    if secondary_difficulty_label and secondary_difficulty_label in THERAPY_LIBRARY:
        secondary_plan = {
            'difficulty_label': secondary_difficulty_label,
            'primary_focus': THERAPY_LIBRARY[secondary_difficulty_label]['primary_focus'],
            'suggested_activity': THERAPY_LIBRARY[secondary_difficulty_label]['activities'][0]
        }
    return {
        'recommended_primary_difficulty': primary_label,
        'primary_focus': primary_plan['primary_focus'],
        'recommended_sessions_per_week': sessions_per_week(risk_level),
        'recommendation_intensity': recommendation_intensity(risk_level),
        'recommended_activities': primary_plan['activities'],
        'secondary_recommendation': secondary_plan,
        'safety_note': 'These activities are screening-support recommendations, not clinical treatment or diagnosis.'
    }
