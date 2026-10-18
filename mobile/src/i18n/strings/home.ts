import type { Entry } from "../index";

// English -> Sinhala/Tamil. Use {name} placeholders for dynamic values.
export const home: Record<string, Entry> = {
  // Home
  "there": { si: "ඔබ", ta: "நண்பரே" },
  "Your Screening": { si: "ඔබේ පරීක්ෂණ", ta: "உங்கள் பரிசோதனை" },
  "Dashboard": { si: "පුවරුව", ta: "முகப்புப் பலகை" },
  "Hi {name}, track your child's dyslexia screening progress.": {
    si: "ආයුබෝවන් {name}, ඔබේ දරුවාගේ ඩිස්ලෙක්සියා පරීක්ෂණයේ ප්‍රගතිය බලන්න.",
    ta: "வணக்கம் {name}, உங்கள் குழந்தையின் டிஸ்லெக்சியா பரிசோதனை முன்னேற்றத்தைப் பாருங்கள்.",
  },
  "Overall Progress": { si: "සමස්ත ප්‍රගතිය", ta: "மொத்த முன்னேற்றம்" },
  "Completed": { si: "අවසන්", ta: "முடிந்தது" },
  "modules": { si: "කොටස්", ta: "பகுதிகள்" },
  "Remaining": { si: "ඉතිරි", ta: "மீதம்" },
  "Progress": { si: "ප්‍රගතිය", ta: "முன்னேற்றம்" },
  "done": { si: "අවසන්", ta: "முடிந்தது" },
  "Your Practice Plan": { si: "ඔබේ පුහුණු සැලැස්ම", ta: "உங்கள் பயிற்சித் திட்டம்" },
  "{n} sessions left · tap to practise": {
    si: "සැසි {n} ක් ඉතිරියි · පුහුණු වීමට ඔබන්න",
    ta: "{n} அமர்வுகள் மீதம் · பயிற்சி செய்ய தொடவும்",
  },
  "Assessment Modules": { si: "ඇගයීම් කොටස්", ta: "மதிப்பீட்டுப் பகுதிகள்" },
  "Locked": { si: "ලොක් කර ඇත", ta: "பூட்டப்பட்டது" },
  "3 total": { si: "මුළු 3 ක්", ta: "மொத்தம் 3" },
  "Finish your practice plan before screening again.": {
    si: "නැවත පරීක්ෂා කිරීමට පෙර ඔබේ පුහුණු සැලැස්ම අවසන් කරන්න.",
    ta: "மீண்டும் பரிசோதிக்கும் முன் உங்கள் பயிற்சித் திட்டத்தை முடிக்கவும்.",
  },
  "Done": { si: "අවසන්", ta: "முடிந்தது" },
  "Active": { si: "සක්‍රීය", ta: "செயலில்" },
  "AI Risk Report": { si: "AI අවදානම් වාර්තාව", ta: "AI ஆபத்து அறிக்கை" },
  "Dyslexia Risk Assessment": { si: "ඩිස්ලෙක්සියා අවදානම් ඇගයීම", ta: "டிஸ்லெக்சியா ஆபத்து மதிப்பீடு" },
  "Complete all 3 modules to generate your personalised AI report.": {
    si: "ඔබේ AI වාර්තාව ලබා ගැනීමට කොටස් 3 ම සම්පූර්ණ කරන්න.",
    ta: "உங்கள் AI அறிக்கையைப் பெற 3 பகுதிகளையும் முடிக்கவும்.",
  },
  "Run Final Analysis": { si: "අවසන් විශ්ලේෂණය කරන්න", ta: "இறுதி பகுப்பாய்வை இயக்கவும்" },
  "{n}/3 Modules Done": { si: "කොටස් 3 න් {n} ක් අවසන්", ta: "3 பகுதிகளில் {n} முடிந்தது" },
  "View Last Report": { si: "අවසන් වාර්තාව බලන්න", ta: "கடைசி அறிக்கையைப் பார்க்கவும்" },
  "Open Full Report": { si: "සම්පූර්ණ වාර්තාව විවෘත කරන්න", ta: "முழு அறிக்கையைத் திறக்கவும்" },
  "Speech": { si: "කතා කිරීම", ta: "பேச்சு" },
  "Phonological": { si: "ශබ්ද හඳුනාගැනීම", ta: "ஒலியியல்" },
  "~5 min": { si: "මිනිත්තු ~5", ta: "~5 நிமிடம்" },
  "Writing": { si: "ලිවීම", ta: "எழுதுதல்" },
  "Handwriting": { si: "අත් අකුරු", ta: "கையெழுத்து" },
  "~6 min": { si: "මිනිත්තු ~6", ta: "~6 நிமிடம்" },
  "Behaviour": { si: "හැසිරීම", ta: "நடத்தை" },
  "Attention": { si: "අවධානය", ta: "கவனம்" },
  "~4 min": { si: "මිනිත්තු ~4", ta: "~4 நிமிடம்" },

  // Levels screens
  "Choose a Level": { si: "මට්ටමක් තෝරන්න", ta: "ஒரு நிலையைத் தேர்ந்தெடுக்கவும்" },
  "Your Progress": { si: "ඔබේ ප්‍රගතිය", ta: "உங்கள் முன்னேற்றம்" },
  "{done} of {total} levels complete": {
    si: "මට්ටම් {total} න් {done} ක් සම්පූර්ණයි",
    ta: "{total} நிலைகளில் {done} முடிந்தது",
  },
  "Finish Level {n} to unlock this.": {
    si: "මෙය විවෘත කිරීමට {n} වන මට්ටම අවසන් කරන්න.",
    ta: "இதைத் திறக்க நிலை {n} ஐ முடிக்கவும்.",
  },
  "Level {n}": { si: "{n} වන මට්ටම", ta: "நிலை {n}" },
  "{n} activities": { si: "ක්‍රියාකාරකම් {n} ක්", ta: "{n} செயல்பாடுகள்" },
  "{n} tasks": { si: "කාර්ය {n} ක්", ta: "{n} பணிகள்" },
  "{n} levels": { si: "මට්ටම් {n} ක්", ta: "{n} நிலைகள்" },
  "Levels get harder as you go. Each one starts with the app saying the word — listen first, then say it back.": {
    si: "ඉදිරියට යන විට මට්ටම් අමාරු වේ. සෑම එකක්ම ඇරඹෙන්නේ යෙදුම වචනය කීමෙනි — මුලින් අසන්න, පසුව ආපසු කියන්න.",
    ta: "செல்லச் செல்ல நிலைகள் கடினமாகும். ஒவ்வொன்றிலும் முதலில் செயலி வார்த்தையைச் சொல்லும் — முதலில் கேளுங்கள், பிறகு திரும்பச் சொல்லுங்கள்.",
  },
  "Levels get harder as you go — from tracing single letters up to writing whole words from memory.": {
    si: "ඉදිරියට යන විට මට්ටම් අමාරු වේ — තනි අකුරු ඇඳීමේ සිට මතකයෙන් සම්පූර්ණ වචන ලිවීම දක්වා.",
    ta: "செல்லச் செல்ல நிலைகள் கடினமாகும் — ஒற்றை எழுத்துகளைத் தடமிடுவதிலிருந்து நினைவிலிருந்து முழு வார்த்தைகளை எழுதுவது வரை.",
  },
  "Every question is read out loud, so your child can listen instead of reading. Tap the speaker to hear it again.": {
    si: "සෑම ප්‍රශ්නයක්ම හඬ නඟා කියවන නිසා ඔබේ දරුවාට කියවීම වෙනුවට අසා සිටිය හැක. නැවත ඇසීමට ස්පීකරය ඔබන්න.",
    ta: "ஒவ்வொரு கேள்வியும் சத்தமாகப் படிக்கப்படும், எனவே உங்கள் குழந்தை படிப்பதற்குப் பதிலாகக் கேட்கலாம். மீண்டும் கேட்க ஒலிபெருக்கியைத் தொடவும்.",
  },

  // Intro screens
  "Speech Screening": { si: "කතා පරීක්ෂණය", ta: "பேச்சுப் பரிசோதனை" },
  "Speech & Sound Activity": { si: "කතාව සහ ශබ්ද ක්‍රියාකාරකම", ta: "பேச்சு & ஒலி செயல்பாடு" },
  "AI-powered phonological screening": { si: "AI බලයෙන් ශබ්ද හඳුනාගැනීමේ පරීක්ෂණය", ta: "AI மூலம் ஒலியியல் பரிசோதனை" },
  "The app says a word, your child says it back. Activities are split into three levels that get harder as you go. No right or wrong — just speak naturally!": {
    si: "යෙදුම වචනයක් කියයි, ඔබේ දරුවා එය ආපසු කියයි. ක්‍රියාකාරකම් මට්ටම් තුනකට බෙදා ඇති අතර ඉදිරියට යන විට අමාරු වේ. හරි වැරදි නැහැ — සාමාන්‍යයෙන් කතා කරන්න!",
    ta: "செயலி ஒரு வார்த்தையைச் சொல்லும், உங்கள் குழந்தை அதைத் திரும்பச் சொல்லும். செயல்பாடுகள் மூன்று நிலைகளாகப் பிரிக்கப்பட்டு செல்லச் செல்ல கடினமாகும். சரி தவறு இல்லை — இயல்பாகப் பேசுங்கள்!",
  },
  "Three levels": { si: "මට්ටම් තුන", ta: "மூன்று நிலைகள்" },
  "How it works": { si: "මෙය ක්‍රියා කරන ආකාරය", ta: "இது எப்படி வேலை செய்கிறது" },
  "Make sure you're in a quiet room. The microphone will be used to record responses.": {
    si: "ඔබ නිශ්ශබ්ද කාමරයක සිටින බව තහවුරු කරගන්න. පිළිතුරු පටිගත කිරීමට මයික්‍රෆෝනය භාවිත වේ.",
    ta: "நீங்கள் அமைதியான அறையில் இருப்பதை உறுதி செய்யுங்கள். பதில்களைப் பதிவு செய்ய மைக்ரோஃபோன் பயன்படுத்தப்படும்.",
  },
  "The App Says It": { si: "යෙදුම කියයි", ta: "செயலி சொல்கிறது" },
  "You will hear the word out loud — tap to hear it again or slowly.": {
    si: "වචනය හඬ නඟා ඇසෙනු ඇත — නැවත හෝ සෙමින් ඇසීමට ඔබන්න.",
    ta: "வார்த்தை சத்தமாகக் கேட்கும் — மீண்டும் அல்லது மெதுவாகக் கேட்கத் தொடவும்.",
  },
  "Now You Say It": { si: "දැන් ඔබ කියන්න", ta: "இப்போது நீங்கள் சொல்லுங்கள்" },
  "Tap the record button and say the word clearly.": {
    si: "පටිගත කිරීමේ බොත්තම ඔබා වචනය පැහැදිලිව කියන්න.",
    ta: "பதிவு பொத்தானைத் தொட்டு வார்த்தையைத் தெளிவாகச் சொல்லுங்கள்.",
  },
  "See Your Result": { si: "ඔබේ ප්‍රතිඵලය බලන්න", ta: "உங்கள் முடிவைப் பாருங்கள்" },
  "Replay, retry, then move on to the next activity.": {
    si: "නැවත ඇසීම, නැවත උත්සාහ කිරීම, ඉන්පසු ඊළඟ ක්‍රියාකාරකමට යන්න.",
    ta: "மீண்டும் கேளுங்கள், மறுமுயற்சி செய்யுங்கள், பிறகு அடுத்த செயல்பாட்டுக்குச் செல்லுங்கள்.",
  },
  "~5 minutes": { si: "මිනිත්තු ~5 ක්", ta: "~5 நிமிடங்கள்" },
  "Handwriting Screening": { si: "අත් අකුරු පරීක්ෂණය", ta: "கையெழுத்துப் பரிசோதனை" },
  "Handwriting Pattern Analysis": { si: "අත් අකුරු රටා විශ්ලේෂණය", ta: "கையெழுத்து வடிவப் பகுப்பாய்வு" },
  "AI-powered handwriting screening for dyslexia indicators": {
    si: "ඩිස්ලෙක්සියා ලකුණු සඳහා AI බලයෙන් අත් අකුරු පරීක්ෂණය",
    ta: "டிஸ்லெக்சியா அறிகுறிகளுக்கான AI கையெழுத்துப் பரிசோதனை",
  },
  "We'll show letters and words for your child to copy or write, split into three levels that get harder as you go. The app analyses letter formation, spacing, and consistency — no pressure, just write naturally!": {
    si: "ඔබේ දරුවාට පිටපත් කිරීමට හෝ ලිවීමට අකුරු සහ වචන පෙන්වන්නෙමු. මට්ටම් තුනකට බෙදා ඇති අතර ඉදිරියට යන විට අමාරු වේ. යෙදුම අකුරු හැඩය, පරතරය සහ ස්ථාවරභාවය විශ්ලේෂණය කරයි — බරක් නැහැ, සාමාන්‍යයෙන් ලියන්න!",
    ta: "உங்கள் குழந்தை நகலெடுக்க அல்லது எழுத எழுத்துகளையும் வார்த்தைகளையும் காட்டுவோம். மூன்று நிலைகளாகப் பிரிக்கப்பட்டு செல்லச் செல்ல கடினமாகும். செயலி எழுத்து வடிவம், இடைவெளி, நிலைத்தன்மையைப் பகுப்பாய்வு செய்யும் — அழுத்தம் வேண்டாம், இயல்பாக எழுதுங்கள்!",
  },
  "This is a screening tool, not a diagnosis. Results are indicators only and should be reviewed by a qualified professional.": {
    si: "මෙය පරීක්ෂණ මෙවලමක්, රෝග විනිශ්චයක් නොවේ. ප්‍රතිඵල දර්ශක පමණි; සුදුසුකම් ලත් වෘත්තිකයෙකු විසින් සමාලෝචනය කළ යුතුය.",
    ta: "இது ஒரு பரிசோதனைக் கருவி, நோய் கண்டறிதல் அல்ல. முடிவுகள் அறிகுறிகள் மட்டுமே; தகுதியான நிபுணர் மதிப்பாய்வு செய்ய வேண்டும்.",
  },
  "See the Task": { si: "කාර්යය බලන්න", ta: "பணியைப் பாருங்கள்" },
  "A letter or word is shown on screen as the target.": {
    si: "ඉලක්කය ලෙස අකුරක් හෝ වචනයක් තිරයේ පෙන්වයි.",
    ta: "இலக்காக ஒரு எழுத்து அல்லது வார்த்தை திரையில் காட்டப்படும்.",
  },
  "Write It": { si: "එය ලියන්න", ta: "அதை எழுதுங்கள்" },
  "Use the canvas to write, or take a photo of paper writing.": {
    si: "ලිවීමට තිරය භාවිත කරන්න, නැතහොත් කඩදාසියේ ලිවීමේ ඡායාරූපයක් ගන්න.",
    ta: "எழுத திரையைப் பயன்படுத்துங்கள், அல்லது காகிதத்தில் எழுதியதை புகைப்படம் எடுங்கள்.",
  },
  "AI Analyses": { si: "AI විශ්ලේෂණය කරයි", ta: "AI பகுப்பாய்வு செய்கிறது" },
  "Your handwriting is checked for patterns and formation.": {
    si: "ඔබේ අත් අකුරු රටා සහ හැඩය සඳහා පරීක්ෂා කෙරේ.",
    ta: "உங்கள் கையெழுத்து வடிவங்களுக்காகவும் அமைப்புக்காகவும் சரிபார்க்கப்படும்.",
  },
  "Canvas or photo": { si: "තිරය හෝ ඡායාරූපය", ta: "திரை அல்லது புகைப்படம்" },
  "Behaviour Screening": { si: "හැසිරීම් පරීක්ෂණය", ta: "நடத்தைப் பரிசோதனை" },
  "Behaviour & Attention Activity": { si: "හැසිරීම සහ අවධාන ක්‍රියාකාරකම", ta: "நடத்தை & கவனச் செயல்பாடு" },
  "AI-powered attention & engagement screening": {
    si: "AI බලයෙන් අවධානය සහ සහභාගිත්වය පරීක්ෂාව",
    ta: "AI மூலம் கவனம் & ஈடுபாட்டுப் பரிசோதனை",
  },
  "We'll present short tasks to observe how your child focuses and responds, split into three levels that get harder as you go. Every question is read out loud. There's no pressure — just tap what feels right!": {
    si: "ඔබේ දරුවා අවධානය යොමු කරන ආකාරය සහ ප්‍රතිචාර දක්වන ආකාරය බැලීමට කෙටි කාර්ය ඉදිරිපත් කරන්නෙමු. මට්ටම් තුනකට බෙදා ඇති අතර ඉදිරියට යන විට අමාරු වේ. සෑම ප්‍රශ්නයක්ම හඬ නඟා කියවයි. බරක් නැහැ — හරි යැයි හැඟෙන දේ ඔබන්න!",
    ta: "உங்கள் குழந்தை எப்படிக் கவனம் செலுத்துகிறது, பதிலளிக்கிறது என்பதைக் காண சிறிய பணிகளைத் தருவோம். மூன்று நிலைகளாகப் பிரிக்கப்பட்டு செல்லச் செல்ல கடினமாகும். ஒவ்வொரு கேள்வியும் சத்தமாகப் படிக்கப்படும். அழுத்தம் வேண்டாம் — சரி என்று தோன்றுவதைத் தொடுங்கள்!",
  },
  "This is a screening tool, not a diagnosis. Results are indicators only and should be reviewed by a professional.": {
    si: "මෙය පරීක්ෂණ මෙවලමක්, රෝග විනිශ්චයක් නොවේ. ප්‍රතිඵල දර්ශක පමණි; වෘත්තිකයෙකු විසින් සමාලෝචනය කළ යුතුය.",
    ta: "இது ஒரு பரிசோதனைக் கருவி, நோய் கண்டறிதல் அல்ல. முடிவுகள் அறிகுறிகள் மட்டுமே; நிபுணர் மதிப்பாய்வு செய்ய வேண்டும்.",
  },
  "Listen to the Question": { si: "ප්‍රශ්නය අසන්න", ta: "கேள்வியைக் கேளுங்கள்" },
  "The app reads every question out loud — tap to hear it again.": {
    si: "යෙදුම සෑම ප්‍රශ්නයක්ම හඬ නඟා කියවයි — නැවත ඇසීමට ඔබන්න.",
    ta: "செயலி ஒவ்வொரு கேள்வியையும் சத்தமாகப் படிக்கும் — மீண்டும் கேட்கத் தொடவும்.",
  },
  "Tap Your Answer": { si: "ඔබේ පිළිතුර ඔබන්න", ta: "உங்கள் பதிலைத் தொடுங்கள்" },
  "Tap the option you think is correct. Hints are there if you need them.": {
    si: "නිවැරදි යැයි ඔබ සිතන විකල්පය ඔබන්න. අවශ්‍ය නම් ඉඟි තිබේ.",
    ta: "சரி என்று நினைக்கும் தேர்வைத் தொடுங்கள். தேவைப்பட்டால் குறிப்புகள் உள்ளன.",
  },
  "Your attention and engagement are measured.": {
    si: "ඔබේ අවධානය සහ සහභාගිත්වය මනිනු ලැබේ.",
    ta: "உங்கள் கவனமும் ஈடுபாடும் அளவிடப்படும்.",
  },
  "Read aloud": { si: "හඬ නඟා කියවයි", ta: "சத்தமாகப் படிக்கும்" },

  // Level complete
  "Level Complete": { si: "මට්ටම සම්පූර්ණයි", ta: "நிலை முடிந்தது" },
  "Level {n} finished!": { si: "{n} වන මට්ටම අවසන්!", ta: "நிலை {n} முடிந்தது!" },
  "You completed all {n} activities. Great speaking!": {
    si: "ඔබ ක්‍රියාකාරකම් {n} ම සම්පූර්ණ කළා. නියමයි!",
    ta: "நீங்கள் {n} செயல்பாடுகளையும் முடித்தீர்கள். சிறப்பாகப் பேசினீர்கள்!",
  },
  "Score": { si: "ලකුණු", ta: "மதிப்பெண்" },
  "Level": { si: "මට්ටම", ta: "நிலை" },
  "Correct": { si: "නිවැරදි", ta: "சரி" },
  "Level {n} unlocked — {title}": { si: "{n} වන මට්ටම විවෘතයි — {title}", ta: "நிலை {n} திறக்கப்பட்டது — {title}" },
  "All levels complete!": { si: "සියලු මට්ටම් සම්පූර්ණයි!", ta: "அனைத்து நிலைகளும் முடிந்தன!" },
  "You finished every speech activity. Time to see the results.": {
    si: "ඔබ සියලු කතා ක්‍රියාකාරකම් අවසන් කළා. ප්‍රතිඵල බලමු.",
    ta: "நீங்கள் எல்லாப் பேச்சுச் செயல்பாடுகளையும் முடித்தீர்கள். முடிவுகளைப் பார்க்கலாம்.",
  },
  "Progress not saved": { si: "ප්‍රගතිය සුරැකුණේ නැත", ta: "முன்னேற்றம் சேமிக்கப்படவில்லை" },
  "This level may be locked again next time you log in. Tap to try again.": {
    si: "ඊළඟ වතාවේ පිවිසෙන විට මෙම මට්ටම නැවත ලොක් විය හැක. නැවත උත්සාහ කිරීමට ඔබන්න.",
    ta: "அடுத்த முறை உள்நுழையும்போது இந்த நிலை மீண்டும் பூட்டப்படலாம். மீண்டும் முயல தொடவும்.",
  },
  "View Full Summary": { si: "සම්පූර්ණ සාරාංශය බලන්න", ta: "முழு சுருக்கத்தைப் பாருங்கள்" },
  "Start Level {n}": { si: "{n} වන මට්ටම අරඹන්න", ta: "நிலை {n} ஐத் தொடங்குங்கள்" },
  "See results so far": { si: "මෙතෙක් ප්‍රතිඵල බලන්න", ta: "இதுவரையிலான முடிவுகளைப் பாருங்கள்" },
  "Back to levels": { si: "මට්ටම් වෙත ආපසු", ta: "நிலைகளுக்குத் திரும்பு" },
  "You completed all {n} tasks. Great writing!": {
    si: "ඔබ කාර්ය {n} ම සම්පූර්ණ කළා. නියම ලිවීමක්!",
    ta: "நீங்கள் {n} பணிகளையும் முடித்தீர்கள். சிறப்பாக எழுதினீர்கள்!",
  },
  "Let's practise a little more!": { si: "තව ටිකක් පුහුණු වෙමු!", ta: "இன்னும் கொஞ்சம் பயிற்சி செய்வோம்!" },
  "Play Level {n} again to get even better and open Level {next}.": {
    si: "තවත් දක්ෂ වී {next} වන මට්ටම විවෘත කිරීමට {n} වන මට්ටම නැවත ක්‍රීඩා කරන්න.",
    ta: "இன்னும் சிறப்பாகி நிலை {next} ஐத் திறக்க நிலை {n} ஐ மீண்டும் விளையாடுங்கள்.",
  },
  "Play Level {n} again to get even better.": {
    si: "තවත් දක්ෂ වීමට {n} වන මට්ටම නැවත ක්‍රීඩා කරන්න.",
    ta: "இன்னும் சிறப்பாக நிலை {n} ஐ மீண்டும் விளையாடுங்கள்.",
  },
  "You finished every writing task. Time to see the results.": {
    si: "ඔබ සියලු ලිවීමේ කාර්ය අවසන් කළා. ප්‍රතිඵල බලමු.",
    ta: "நீங்கள் எல்லா எழுத்துப் பணிகளையும் முடித்தீர்கள். முடிவுகளைப் பார்க்கலாம்.",
  },
  "Try Level {n} Again": { si: "{n} වන මට්ටම නැවත උත්සාහ කරන්න", ta: "நிலை {n} ஐ மீண்டும் முயலுங்கள்" },
  "You completed all {n} activities. Great focus!": {
    si: "ඔබ ක්‍රියාකාරකම් {n} ම සම්පූර්ණ කළා. නියම අවධානයක්!",
    ta: "நீங்கள் {n} செயல்பாடுகளையும் முடித்தீர்கள். சிறந்த கவனம்!",
  },
  "You finished every activity. Time to see the results.": {
    si: "ඔබ සියලු ක්‍රියාකාරකම් අවසන් කළා. ප්‍රතිඵල බලමු.",
    ta: "நீங்கள் எல்லாச் செயல்பாடுகளையும் முடித்தீர்கள். முடிவுகளைப் பார்க்கலாம்.",
  },

  // History
  "History": { si: "ඉතිහාසය", ta: "வரலாறு" },
  "Past assessment reports": { si: "පසුගිය ඇගයීම් වාර්තා", ta: "கடந்த மதிப்பீட்டு அறிக்கைகள்" },
  "{n} total": { si: "මුළු {n} ක්", ta: "மொத்தம் {n}" },
  "Loading history…": { si: "ඉතිහාසය පූරණය වෙමින්…", ta: "வரலாறு ஏற்றப்படுகிறது…" },
  "No assessments yet": { si: "තවම ඇගයීම් නැත", ta: "இன்னும் மதிப்பீடுகள் இல்லை" },
  "Complete all 3 modules (Speech, Handwriting, Behaviour) and run the Final Analysis to generate a report.": {
    si: "වාර්තාවක් ලබා ගැනීමට කොටස් 3 ම (කතා කිරීම, අත් අකුරු, හැසිරීම) සම්පූර්ණ කර අවසන් විශ්ලේෂණය කරන්න.",
    ta: "அறிக்கையைப் பெற 3 பகுதிகளையும் (பேச்சு, கையெழுத்து, நடத்தை) முடித்து இறுதி பகுப்பாய்வை இயக்கவும்.",
  },
  "Go to Final Analysis": { si: "අවසන් විශ්ලේෂණයට යන්න", ta: "இறுதி பகுப்பாய்வுக்குச் செல்லுங்கள்" },
  "Overall Risk Score": { si: "සමස්ත අවදානම් ලකුණු", ta: "மொத்த ஆபத்து மதிப்பெண்" },
  "Primary Difficulty:": { si: "ප්‍රධාන දුෂ්කරතාව:", ta: "முக்கியச் சிரமம்:" },
  "View full": { si: "සම්පූර්ණ බලන්න", ta: "முழுதும் பார்க்க" },
  "Full Report": { si: "සම්පූර්ණ වාර්තාව", ta: "முழு அறிக்கை" },
  "Dyslexia Screening Report": { si: "ඩිස්ලෙක්සියා පරීක්ෂණ වාර්තාව", ta: "டிஸ்லெக்சியா பரிசோதனை அறிக்கை" },
  "Not enough evidence": { si: "ප්‍රමාණවත් සාක්ෂි නැත", ta: "போதிய சான்றுகள் இல்லை" },
  "Not enough evidence yet": { si: "තවම ප්‍රමාණවත් සාක්ෂි නැත", ta: "இன்னும் போதிய சான்றுகள் இல்லை" },
  "{level} Risk": { si: "{level} අවදානම", ta: "{level} ஆபத்து" },
  "Low": { si: "අඩු", ta: "குறைவான" },
  "Medium": { si: "මධ්‍යම", ta: "நடுத்தர" },
  "High": { si: "ඉහළ", ta: "அதிக" },
  "low": { si: "අඩු", ta: "குறைவு" },
  "medium": { si: "මධ්‍යම", ta: "நடுத்தரம்" },
  "high": { si: "ඉහළ", ta: "அதிகம்" },
  "Complete more activities for a result.": {
    si: "ප්‍රතිඵලයක් සඳහා තවත් ක්‍රියාකාරකම් සම්පූර්ණ කරන්න.",
    ta: "முடிவைப் பெற மேலும் செயல்பாடுகளை முடிக்கவும்.",
  },
  "Score: {n}%": { si: "ලකුණු: {n}%", ta: "மதிப்பெண்: {n}%" },
  "Review recommended": { si: "සමාලෝචනය නිර්දේශිතයි", ta: "மதிப்பாய்வு பரிந்துரைக்கப்படுகிறது" },
  "Reliability: {level}": { si: "විශ්වසනීයත්වය: {level}", ta: "நம்பகத்தன்மை: {level}" },
  "Difficulty Areas": { si: "දුෂ්කරතා ක්ෂේත්‍ර", ta: "சிரமப் பகுதிகள்" },
  "Primary": { si: "ප්‍රධාන", ta: "முதன்மை" },
  "Secondary": { si: "ද්විතීයික", ta: "இரண்டாம் நிலை" },
  "Confidence": { si: "විශ්වාසය", ta: "நம்பிக்கை" },
  "Module Scores": { si: "කොටස් අනුව ලකුණු", ta: "பகுதி வாரி மதிப்பெண்கள்" },
  "Therapy Recommendation": { si: "චිකිත්සා නිර්දේශය", ta: "சிகிச்சைப் பரிந்துரை" },
  "Primary Focus": { si: "ප්‍රධාන අවධානය", ta: "முக்கியக் கவனம்" },
  "Sessions / Week": { si: "සතියකට සැසි", ta: "வாரத்திற்கு அமர்வுகள்" },
  "Intensity": { si: "තීව්‍රතාව", ta: "தீவிரம்" },
  "Screening indicators only — not a clinical diagnosis. Consult a qualified professional.": {
    si: "පරීක්ෂණ දර්ශක පමණි — සායනික රෝග විනිශ්චයක් නොවේ. සුදුසුකම් ලත් වෘත්තිකයෙකුගෙන් විමසන්න.",
    ta: "பரிசோதனை அறிகுறிகள் மட்டுமே — மருத்துவ நோய் கண்டறிதல் அல்ல. தகுதியான நிபுணரை அணுகவும்.",
  },
  "Phonological Processing": { si: "ශබ්ද සැකසුම", ta: "ஒலியியல் செயலாக்கம்" },
  "Attention & Behaviour": { si: "අවධානය සහ හැසිරීම", ta: "கவனம் & நடத்தை" },

  // Level names and descriptions (from config, translated at render)
  "Simple Sounds": { si: "සරල ශබ්ද", ta: "எளிய ஒலிகள்" },
  "Short, familiar words. Just listen and say them back.": {
    si: "කෙටි, හුරුපුරුදු වචන. අසා ආපසු කියන්න.",
    ta: "சிறிய, பழக்கமான வார்த்தைகள். கேட்டுத் திரும்பச் சொல்லுங்கள்.",
  },
  "Getting Harder": { si: "අමාරු වෙමින්", ta: "கடினமாகிறது" },
  "Longer words with two or three parts to sound out.": {
    si: "උච්චාරණය කිරීමට කොටස් දෙක තුනක් ඇති දිගු වචන.",
    ta: "ஒலிக்க இரண்டு அல்லது மூன்று பகுதிகள் கொண்ட நீளமான வார்த்தைகள்.",
  },
  "Challenge": { si: "අභියෝගය", ta: "சவால்" },
  "Tricky long words and made-up words. Give it your best!": {
    si: "අමාරු දිගු වචන සහ සාදාගත් වචන. ඔබේ උපරිමය දෙන්න!",
    ta: "கடினமான நீளமான வார்த்தைகளும் கற்பனை வார்த்தைகளும். உங்கள் சிறந்ததைச் செய்யுங்கள்!",
  },
  "Letters": { si: "අකුරු", ta: "எழுத்துகள்" },
  "Trace and copy single letters. Guided lines to follow.": {
    si: "තනි අකුරු ඇඳ පිටපත් කරන්න. අනුගමනය කිරීමට මාර්ගෝපදේශ රේඛා.",
    ta: "ஒற்றை எழுத்துகளைத் தடமிட்டு நகலெடுங்கள். பின்பற்ற வழிகாட்டிக் கோடுகள்.",
  },
  "Letters & Words": { si: "අකුරු සහ වචන", ta: "எழுத்துகளும் வார்த்தைகளும்" },
  "Capital letters and short words, plus your first listening task.": {
    si: "ලොකු අකුරු සහ කෙටි වචන, සමඟ ඔබේ පළමු ඇසීමේ කාර්යය.",
    ta: "பெரிய எழுத்துகளும் சிறிய வார்த்தைகளும், மேலும் உங்கள் முதல் கேட்கும் பணி.",
  },
  "Advanced Writing": { si: "උසස් ලිවීම", ta: "மேம்பட்ட எழுத்து" },
  "Long words, then writing from memory with nothing to copy.": {
    si: "දිගු වචන, පසුව පිටපත් කිරීමට කිසිවක් නැතිව මතකයෙන් ලිවීම.",
    ta: "நீளமான வார்த்தைகள், பிறகு நகலெடுக்க எதுவும் இல்லாமல் நினைவிலிருந்து எழுதுதல்.",
  },
  "Getting Started": { si: "ආරම්භ කිරීම", ta: "தொடங்குதல்" },
  "Single letters, simple shapes, and short words like cat and sun.": {
    si: "තනි අකුරු, සරල හැඩතල සහ cat, sun වැනි කෙටි වචන.",
    ta: "ஒற்றை எழுத்துகள், எளிய வடிவங்கள், cat, sun போன்ற சிறிய வார்த்தைகள்.",
  },
  "Looking Closer": { si: "ළඟින් බැලීම", ta: "நெருக்கமாகப் பார்த்தல்" },
  "Longer words like umbrella, trickier patterns, and memory tasks.": {
    si: "umbrella වැනි දිගු වචන, අමාරු රටා සහ මතක කාර්ය.",
    ta: "umbrella போன்ற நீளமான வார்த்தைகள், கடினமான வடிவங்கள், நினைவுப் பணிகள்.",
  },
  "Long words, b/d/p/q traps, and longer sequences to remember.": {
    si: "දිගු වචන, b/d/p/q ව්‍යාකූලතා සහ මතක තබාගත යුතු දිගු අනුපිළිවෙල.",
    ta: "நீளமான வார்த்தைகள், b/d/p/q குழப்பங்கள், நினைவில் வைக்க நீண்ட வரிசைகள்.",
  },
};
