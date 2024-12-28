import re
import json
from collections import defaultdict

########################################
# Dictionary of Surahs
########################################
SURAH_DICT = {
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال",
    "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء",
    "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء",
    "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر",
    "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية",
    "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر",
    "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة",
    "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ",
    "النازعات", "عبس", "التكوير", "الإنفطار", "المطففين", "الإنشقاق", "البروج", "الطارق",
    "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين",
    "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر",
    "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد",
    "الإخلاص", "الفلق", "الناس"
}

########################################
# Dictionary of Reciters
########################################
QURAA_DICT = {
    "محمد صديق المنشاوي", "محمود خليل الحصري", "عبدالباسط عبدالصمد", "عبدالعظيم زاهر",
    "عبدالعاطي ناصف", "الشحات محمد أنور", "محمود حسين منصور", "محمد عبدالحليم سلامة",
    "عبدالفتاح الشعشاعي", "محمد عبدالعزيز حصان", "محمد غازي", "محمود البيجرمي",
    "ابوالعينين شعيشع", "عبدالوارث عبدالعزيز", "عزت السيد راشد", "عبدالعزيز حربي",
    "حمدي الزامل", "محمود علي البنا", "منصور الشامي الدمنهوري", "أحمد الرزيقي",
    "مصطفى اسماعيل", "طه الفشني", "عبدالعزيز عكاشة", "محمد رفعت", "صلاح عبدالرحمن",
    "احمد أبوطالب السوهاجي", "محمد الصيفي", "إسماعيل السيد الطنطاوي", "السعيد عبدالصمد الزناتي",
    "محمد أحمد بسيوني", "نصر السعيد محمد", "صلاح يوسف", "محمد فريد السنديونى",
    "شعبان الصياد", "محمد الليثي", "راغب مصطفى غلوش", "كامل يوسف البهتيمي",
    "عبدالرؤف شلبي", "عبدالناصر حرك", "هاشم هيبة", "محمد فاروق أبوالخير",
    "إبراهيم المنصوري", "قطب أحمد الطويل", "أحمد سليمان السعدني", "عبدالفتاح عاشور",
    "عبدالحافظ سيد رجب", "عثمان الشبراوي", "حسن محمد حسن عوض الدشناوي", "محمد عبدالوهاب الطنطاوي",
    "إبراهيم الشعشاعي", "عبدالحكيم عبد اللطيف", "محمود محمد رمضان", "عبدالحميد الباسوسي",
    "عباس مصطفى عزب", "عبدالسميع عيسى", "محمد عبدالشافى النادي", "عبدالله عزب",
    "محمد حسن النادي", "عبدالرحمن الدروي", "محمود محمد سليمان", "سيد عبدالشافى هلال",
    "محمد ساعى نصر الجرزاوي", "حلمي الجمل", "عبدالعزيز على فرج", "محمد أحمد شبيب",
    "فرج الله الشاذلي", "إبراهيم سلامة", "د. القصبى زلط", "عبدالعظيم زاهر",
    "د. إسماعيل الدفتار", "د. عبدالفتاح عاشور", "على محمود", "عبداللطيف الديش",
    "يوسف قاسم", "حسن محمد عوض الطحان", "محمود إسماعيل الشريف", "السيد متولي عبدالعال",
    "سيد عطية ندا", "فتحى المليجي", "محمد السيد ضيف", "محمد عطية حسب", "أحمد محمد عامر",
    "ياسر الشرقاوي", "عبدالحميد الباسوسي", "محمد حماد", "جمعة مختار", "أحمد نعينع",
    "محمود الحلفاوي", "عبدالله شلبي", "عبدالله طبل", "عبدالله عمران", "إسماعيل حلمي حجاب",
    "حامد أحمد صلاح", "ربيع زين", "محمد عاطف الطحان", "أحمد عبدالجواد الدومي",
    "محمد بدر حسين", "عبدالله قاسم", "طه أبوكريشة", "محمد المختار المهدي",
    "عماد الدين عبد الخالق", "عبدالعزيز محمد عبدالجليل", "محمد محمود الطبلاوي",
    "محمد أحمد عبدالباسط"
}

def parse_header_dates(raw_text: str) -> dict:
    """
    Looks for a line matching:
      يوم (اسم اليوم) : (التاريخ الهجري) الموافق (التاريخ الميلادي)
    Returns a dict like:
      {
        "اليوم": "...",
        "التاريخ_الهجري": "...",
        "التاريخ_الميلادي": "..."
      }
    If not found, returns an empty dict.
    """
    header_date_pattern = re.compile(
        r'يوم\s+(\S+)\s*:\s*(.+?هـ)\s+الموافق\s+(\d+/\d+/\d+م?\.?)(?=\s|$)',
        re.UNICODE
    )
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = header_date_pattern.search(line)
        if match:
            return {
                "اليوم": match.group(1).strip(),
                "التاريخ_الهجري": match.group(2).strip(),
                "التاريخ_الميلادي": match.group(3).rstrip('.').strip()
            }
    # If no match found, return empty
    return {}
def normalize_arabic(text: str) -> str:
    """
    Basic normalization for Arabic text:
      - Convert different forms of Alef to bare 'ا'.
      - Convert 'ى' to 'ي'.
      - Remove typical diacritics.
      - Trim whitespace.
    """
    text = re.sub(r'[إأٱآ]', 'ا', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)  # remove diacritics
    return text.strip()

def split_surah_on_conjunction(s: str) -> list:
    """
    Splits a given surah string on 'و' to separate multiple surahs.
    Example: "يس والصافات" => ["يس", "الصافات"].
    """
    parts = re.split(r'\s+و\s+', s)
    return [p.strip() for p in parts if p.strip()]

def parse_and_fix_time(time_text: str) -> str:
    """
    Parses a 'HH:MM' string. If hour > 23 but minute <= 23, assume they are swapped.
    If still invalid, returns '' (empty string).
    Otherwise returns HH:MM in 24-hour format (00-23).
    """
    m = re.match(r'(\d{1,2}):(\d{1,2})$', time_text)
    if not m:
        return time_text  # can't parse => return as is (or empty if you prefer)

    hour = int(m.group(1))
    minute = int(m.group(2))

    # If hour out-of-range but minute <= 23 => swap (likely reversed "44:09" => "09:44")
    if hour > 23 and minute <= 23:
        hour, minute = minute, hour

    # Now check validity
    if hour > 23 or minute > 59:
        return ""  # empty or some placeholder

    return f"{hour:02d}:{minute:02d}"

def parse_quran_schedule(raw_text: str) -> list:
    """
    Parses the raw schedule text and returns a list of dictionaries:
      [
        { "الوقت": ..., "قارئ": ..., "السورة": ... },
        ...
      ]
    Incorporates QURAA_DICT to detect reciters if the regex is not sufficient.
    """
    lines = raw_text.splitlines()
    results = []

    # Regex to capture times like "HH:MM" or "HH . MM"
    time_pattern = re.compile(r'(\d{1,2}\s*[:\.]\s*\d{1,2}(?:\s*\(.*?\))?)', re.UNICODE)

    # Regex for the broad "reader" chunk after "للشيخ" or "للقارئ"
    reader_pattern = re.compile(r'(?:للشيخ|للقارئ)\s*/?\s*(.+)', re.UNICODE)

    # Surah pattern: "ما تيسر من سورة ...", "من سورة ...", "من سورتى ...", etc.
    surah_pattern = re.compile(
        r'(?:ما\s+تيسر\s+من|وما\s+تيسر\s+من|من\s+سورة|من\s+سورتى)\s+(.+?)(?=\s*(?:ومدة\s+التلاوة|مدة\s+التلاوة|\d+\s*ق|$))',
        re.UNICODE
    )

    # Extended pattern for "من الآية X سورة Foo ... حتى الآية Y سورة Bar"
    extended_pattern = re.compile(
        r'(?:من\s+الآية\s*\d+|من\s+آية\s*\d+)\s*(?:من\s+)?سورة\s+(.+?)\s+'
        r'(?:وحتى\s+الآية|حتى\s+الآية|إلى\s+آية)\s*\d+\s*(?:من\s+)?سورة\s+(.+?)'
        r'(?=\s|/|$)',
        re.IGNORECASE | re.UNICODE
    )

    for line in lines:
        original_line = line.strip()
        if not original_line:
            continue

        # Optional: skip lines that don’t mention الشيخ/القارئ or تلاوة
        if not re.search(r'(للشيخ|للقارئ|تلاوة)', original_line):
            continue

        # (A) Normalize for searching
        line_normalized = normalize_arabic(original_line)

        # (1) Extract time text
        time_match = time_pattern.search(line_normalized)
        time_text = ""
        if time_match:
            raw_time = time_match.group(1)
            # Convert '.' to ':'
            raw_time = re.sub(r'\.', ':', raw_time)
            # Remove parentheses in the time substring
            raw_time = re.sub(r'\([^)]*\)', '', raw_time)
            # Keep only digits & colon
            raw_time = re.sub(r'[^\d:]', '', raw_time).strip()
            # Attempt to fix if reversed
            time_text = parse_and_fix_time(raw_time)

        # (2) Extract reader
        reader_text = ""
        reader_match = reader_pattern.search(line_normalized)
        if reader_match:
            reader_text = reader_match.group(1).strip()
            # Remove slash-based or known tail phrases
            reader_text = re.split(r'(مدة\s+التلاوة|ما\s+تيسر|/)', reader_text, maxsplit=1)[0]
            reader_text = re.sub(r'/\s*$', '', reader_text).strip()

        # (2a) Fallback: if still no reader => use QURAA_DICT
        found_reciter = ""
        for reciter_name in QURAA_DICT:
            if reciter_name in line_normalized:
                found_reciter = reciter_name
                break
        if found_reciter:
            reader_text = found_reciter

        # (3) Identify surahs from extended pattern or surah pattern
        found_surahs = []
        ext_match = extended_pattern.search(line_normalized)
        if ext_match:
            s1, s2 = ext_match.group(1).strip(), ext_match.group(2).strip()
            found_surahs = [s1, s2]
        else:
            sp = surah_pattern.search(line_normalized)
            if sp:
                raw_surahs = sp.group(1).strip()
                # Might have multiple surahs separated by dash or slash
                splitted = re.split(r'[/-]+', raw_surahs)
                splitted = [s.strip() for s in splitted if s.strip()]
                found_surahs = splitted

        # (3a) Additional fallback: dictionary search
        if not found_surahs:
            for surah_name in SURAH_DICT:
                if surah_name in line_normalized:
                    found_surahs.append(surah_name)

        # (4) Clean surah references
        final_surah_list = []
        for s in found_surahs:
            # Replace "سورتى" -> "سورة"
            s = re.sub(r'\bسورتى\b', 'سورة', s)
            # Split on 'و'
            surah_parts = split_surah_on_conjunction(s)
            for part in surah_parts:
                part = part.strip()
                # Ensure "سورة" prefix
                if not re.search(r'\bسورة\b', part):
                    part = "سورة " + part
                final_surah_list.append(part)

        # (5) Determine how to join surahs:
        if not final_surah_list:
            results.append({
                "الوقت": time_text,
                "قارئ": reader_text,
                "السورة": ""
            })
        else:
            count_surahs = len(final_surah_list)
            if count_surahs == 1:
                joined_surahs = final_surah_list[0]
            elif count_surahs == 2:
                # e.g., "سورتي الأنفال و التوبة"
                surah1 = re.sub(r'^سورة\s+', '', final_surah_list[0])
                surah2 = re.sub(r'^سورة\s+', '', final_surah_list[1])
                joined_surahs = f"سورتي {surah1} و {surah2}"
            else:
                joined_surahs = " و ".join(final_surah_list)

            results.append({
                "الوقت": time_text,
                "قارئ": reader_text,
                "السورة": joined_surahs
            })

    return results

def clean_and_merge(parsed_data: list) -> list:
    """
    Further cleaning & merging:
      - Strip trailing '15ق', '30ق', etc. from the reader.
      - Merge entries with identical (time, reader) by concatenating surahs.
      - Remove duplicated "سورتي" in "السورة" field if it appears multiple times.
    """
    cleaned = []
    for entry in parsed_data:
        # 1) Clean the reader from trailing durations
        r = re.sub(r'\d+\s*ق\s*$', '', entry["قارئ"]).strip()
        # Also remove leftover 'ما تيسر'
        r = re.sub(r'(?i)ما\s+تيسر.*', '', r).strip()

        # 2) Clean surah from extra spaces
        surah_str = re.sub(r'\s+', ' ', entry["السورة"]).strip()

        cleaned.append({
            "الوقت": entry["الوقت"].strip(),
            "قارئ": r,
            "السورة": surah_str
        })

    # 3) Merge by (time, reader)
    grouped = defaultdict(list)
    for item in cleaned:
        key = (item["الوقت"], item["قارئ"])
        grouped[key].append(item["السورة"])

    merged = []
    for (time_val, reader_val), surahs in grouped.items():
        # Filter out empty surahs
        surahs = [s for s in surahs if s]
        if surahs:
            # Join them with a comma or " و " — up to you
            surah_text = ', '.join(surahs)
            # Remove duplicated "سورتي "
            surah_text = re.sub(r'(سورتي\s+){2,}', 'سورتي ', surah_text)
            # Replace any leftover ", سورتي " => " و "
            surah_text = re.sub(r'\s*,\s*سورتي\s+', ' و ', surah_text)
        else:
            surah_text = ""
        merged.append({
            "الوقت": time_val,
            "قارئ": reader_val,
            "السورة": surah_text
        })

    return merged


