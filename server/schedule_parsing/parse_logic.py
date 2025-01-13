import re
from collections import defaultdict
import json

#############################
# A) Bracket & Emoji Removal
#############################

def remove_brackets(text: str) -> str:
    """
    Remove bracketed text (parentheses, braces, brackets),
    then normalize spaces.
    """
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\{.*?\}', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def remove_emojis(text: str) -> str:
    """
    Removes emojis / special Unicode symbols.
    """
    emoji_pattern = re.compile(
        r'[\U0001F300-\U0001F5FF'
        r'\U0001F600-\U0001F64F'
        r'\U0001F900-\U0001F9FF'
        r'\U0001FA70-\U0001FAFF'
        r'\u2600-\u26FF'
        r'\u2700-\u27BF]+',
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text)

#############################
# B) Time Parsing
#############################

def fix_time_format(time_str: str) -> str:
    """
    Attempts to parse times like "06:00", "40 : 6 (ص)" => "06:40",
    swapping if reversed, ignoring parentheses, etc.

    NEW HEURISTIC:
      If the parsed minute < 10, we flip hour/minute. e.g., "12:03" => "03:12".

    Returns "" if invalid.
    """
    # Check for (ص)/(م) => optional AM/PM usage
    am_pm = ""
    if re.search(r'\(.*?[ص]\)', time_str):
        am_pm = "AM"
    elif re.search(r'\(.*?[م]\)', time_str):
        am_pm = "PM"

    # Remove parentheses
    time_str = re.sub(r'\(.*?\)', '', time_str).strip()
    # unify punctuation
    time_str = time_str.replace('٫', '.').replace('،', '.')
    # remove spaces around colons
    time_str = re.sub(r'\s*:\s*', ':', time_str)
    time_str = re.sub(r'\s+', ' ', time_str).strip()

    match = re.match(r'^(\d{1,2}):(\d{1,2})$', time_str)
    if not match:
        return ""

    hour = int(match.group(1))
    minute = int(match.group(2))

    # If hour>23 & minute<=23 => swap
    if hour > 23 and minute <= 23:
        hour, minute = minute, hour

    #######################################
    # NEW HEURISTIC: if minute < 10 => flip
    #######################################
    if minute < 10:
        hour, minute = minute, hour

    # if still out-of-range => fail
    if hour > 23 or minute > 59:
        return ""

    # Optionally handle AM/PM
    if am_pm == "AM":
        if hour == 12:
            hour = 0
    elif am_pm == "PM":
        if hour < 12:
            hour += 12

    return f"{hour:02d}:{minute:02d}"

#############################
# C) Reciter Parsing
#############################

def parse_reciter(line: str) -> str:
    """
    Extract reciter after "تلاوة للقارئ", "للشيخ", or "للقارئ".
    Remove leftover phrases like durations, surah references, etc.
    """
    pattern = re.compile(
        r'(?:تلاوة\s+للقارئ|للشيخ|للقارئ)\s*/?\s*([^\n]+?)'
        r'(?=\s*(?:ما\s+تيسر|من\s+سورة|مدة\s+التلاوة|\d+\s*ق|$))',
        re.IGNORECASE
    )
    m = pattern.search(line)
    if not m:
        return ""

    reciter_text = m.group(1).strip()

    # 2) Remove trailing references
    reciter_text = re.sub(r'(?i)(سورة\s+.*$|سورتى\s+.*$)', '', reciter_text)
    reciter_text = re.sub(r'\d+\s*ق.*$', '', reciter_text)
    # e.g. "من فلان"
    reciter_text = re.sub(r'^\s*من\s+', '', reciter_text, flags=re.IGNORECASE)
    reciter_text = reciter_text.strip('/').strip()

    # Remove any slash and anything following it
    reciter_text = re.sub(r'/.*', '', reciter_text)

    # Remove any text after "ما تيسر" / "ما تيسر من" / "وماتيسر" / "وماتيسر من" (case-insensitive)
    reciter_text = re.sub(r'(?i)(ما\s*تيسر(?:\s*من)?|وما\s*تيسر(?:\s*من)?).*', '', reciter_text)

    # Normalize whitespace around the reciter name
    reciter_text = re.sub(r'\s+', ' ', reciter_text).strip()

    return reciter_text

#############################
# D) Surah Parsing
#############################

def parse_surahs(line: str) -> list:
    """
    Captures e.g. "ما تيسر من سورتى X - Y",
    splits on dash or " و " or slash.
    """
    pattern = re.compile(
        r'(?:ما\s+تيسر\s+من|من\s+(?:سورة|سور|سورتى))\s+(.+?)(?=\s*(?:ومدة\s+التلاوة|\d+\s*ق|$))',
        re.IGNORECASE
    )
    matches = pattern.findall(line)
    all_surahs = []
    for m in matches:
        chunks = re.split(r'(?:\s+و\s+)|[-/]', m)
        for c in chunks:
            c = c.strip()
            if not c:
                continue
            if re.match(r'(?i)^قصار\s+السور$', c):
                all_surahs.append("قصار السور")
            else:
                if not re.match(r'^(?:سورة|سورتى|سور)', c, re.IGNORECASE):
                    c = "سورة " + c
                all_surahs.append(c)
    return all_surahs

#############################
# E) Verse Range Parsing
#############################

def parse_verse_ranges(line: str) -> dict:
    """
    If we see "من الآية X ... حتى الآية Y ..." or
    "من أول سورة كذا حتى ختام سورة كذا",
    we'll incorporate it into the final 'السورة' field
    rather than separate fields.
    """
    data = {}

    verse_pattern = re.compile(
        r'من\s+الآية\s*(\d+)\s*(?:من\s+)?سورة\s+([^..]+?)\s+'
        r'(?:و?حتى\s+الآية|إلى\s+الآية)\s*(\d+)\s*(?:من\s+)?سورة\s+([^..]+?)\b',
        re.IGNORECASE
    )
    m1 = verse_pattern.search(line)
    if m1:
        data["from_verse"] = m1.group(1).strip()
        data["sura_1"]     = m1.group(2).strip()
        data["to_verse"]   = m1.group(3).strip()
        data["sura_2"]     = m1.group(4).strip()

    alt_pattern = re.compile(
        r'من\s+(?:أول\s+)?سورة\s+([^\s]+)\s+'
        r'(?:حتى\s+(?:ختام\s+)?سورة\s+([^\s]+)|وحتى\s+(?:ختام\s+)?سورة\s+([^\s]+))',
        re.IGNORECASE
    )
    m2 = alt_pattern.search(line)
    if m2:
        data["from_verse"] = "أول"
        data["sura_1"]     = m2.group(1).strip()
        sura2 = m2.group(2) if m2.group(2) else m2.group(3)
        data["to_verse"]   = "ختام"
        data["sura_2"]     = sura2.strip()

    return data

def incorporate_verse_range_into_surah(sur_str: str, verse_info: dict) -> str:
    """
    We fold the verse-range info into the final 'السورة' field,
    e.g. ' (من الآية 45 سورة ص حتى الآية 61 سورة الزمر)' appended.
    """
    if not verse_info:
        return sur_str

    fv = verse_info.get("from_verse", "")
    s1 = verse_info.get("sura_1", "")
    tv = verse_info.get("to_verse", "")
    s2 = verse_info.get("sura_2", "")

    if not (fv and s1 and tv and s2):
        return sur_str

    snippet = f" (من الآية {fv} سورة {s1} حتى الآية {tv} سورة {s2})"
    return sur_str + snippet

#############################
# F) Final Surah-String Logic
#############################

def transform_surah_list(sur_list: list) -> str:
    """
    e.g. ["سورة السجدة", "سورة الأحزاب"] => "سورة السجدة و الأحزاب".
    """
    if not sur_list:
        return ""

    cleaned = []
    for s in sur_list:
        if re.match(r'(?i)^قصار\s+السور$', s.strip()):
            cleaned.append("قصار السور")
        else:
            s2 = re.sub(r'^(?:سورة|سورتى|سور)\s+', '', s.strip(), flags=re.IGNORECASE)
            cleaned.append(s2)

    final_parts = []
    for i, token in enumerate(cleaned):
        if i == 0:
            if token.lower() == "قصار السور":
                final_parts.append("قصار السور")
            else:
                final_parts.append(f"سورة {token}")
        else:
            if token.lower() == "قصار السور":
                final_parts.append("و قصار السور")
            else:
                final_parts.append(f"و {token}")

    joined = " ".join(final_parts)
    # remove "سورتى" or standalone "سور"
    joined = re.sub(r'\b(?:سورتى|سور)\b', '', joined, flags=re.IGNORECASE)
    joined = re.sub(r'\s+', ' ', joined).strip()

    # keep only the first standalone "سورة"
    tokens = joined.split()
    found_sura = False
    for idx, t in enumerate(tokens):
        if re.match(r'(?i)^سورة$', t):
            if not found_sura:
                found_sura = True
            else:
                tokens[idx] = ""
    joined = " ".join([t for t in tokens if t]).strip()

    return joined

#############################
# G) Single Line => Dict
#############################

def parse_line(line: str) -> dict:
    """
    1) remove brackets/emojis
    2) find time
    3) find reciter
    4) find surahs
    5) find verse ranges
    """
    line = remove_brackets(line)
    line = remove_emojis(line)

    # TIME
    time_val = ""
    time_pattern = re.compile(
        r'(?:الساعة[^0-9]*|\b)(\d{1,2}\s*[:\.]\s*\d{1,2}(?:\s*\(.*?\))?)',
        re.IGNORECASE
    )
    m_time = time_pattern.search(line)
    if m_time:
        raw_time = re.sub(r'\s+', ' ', m_time.group(1)).strip()
        time_val = fix_time_format(raw_time)

    # RECITER
    reciter_val = parse_reciter(line)

    # SURAH list
    sur_list = parse_surahs(line)

    # VERSE range => incorporate later into 'السورة'
    verse_info = parse_verse_ranges(line)

    return {
        "الوقت": time_val.strip() if time_val else "",
        "قارئ": reciter_val.strip() if reciter_val else "",
        "سور_list": sur_list,
        "verse_info": verse_info
    }

#############################
# H) Merge Lines
#############################

def should_start_new_item(line: str) -> bool:
    """
    Start new item if line begins with: (الساعة|تلاوة|للشيخ|للقارئ) or a time-like pattern
    """
    check_line = remove_brackets(line).strip()
    if re.match(r'^(?:الساعة|تلاوة|للشيخ|للقارئ)', check_line, re.IGNORECASE):
        return True
    if re.match(r'^\s*\d{1,2}\s*[:\.]\s*\d{1,2}', check_line):
        return True
    return False

def merge_lines(lines):
    merged = []
    current_chunk = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if should_start_new_item(line):
            if current_chunk:
                merged.append(" ".join(current_chunk))
            current_chunk = [line]
        else:
            current_chunk.append(line)
    if current_chunk:
        merged.append(" ".join(current_chunk))
    return merged

#############################
# I) Final Parser
#############################

def parse_schedule_final(raw_text: str) -> list:
    """
    1) Merge lines
    2) Parse each chunk
    3) Transform surah list
    4) Incorporate verse ranges into 'السورة'
    5) Remove verse range fields => single 'السورة' entry
    6) If time or reciter or surah is missing => fill with fallback
    """
    lines = raw_text.splitlines()
    merged_items = merge_lines(lines)

    results = []
    for chunk in merged_items:
        record = parse_line(chunk)

        # If truly empty => skip
        if not (record["الوقت"] or record["قارئ"] or record["سور_list"]):
            if not record["verse_info"]:
                continue

        # Build final سورة string
        sur_str = transform_surah_list(record["سور_list"])
        sur_str = incorporate_verse_range_into_surah(sur_str, record["verse_info"])

        record.pop("سور_list", None)
        record.pop("verse_info", None)

        record["السورة"] = sur_str

        # Fallback
        if not record["الوقت"]:
            record["الوقت"] = "لم يمكن تحديد الوقت"
        if not record["قارئ"]:
            record["قارئ"] = "لم يمكن التعرف علي القارئ"
        if not record["السورة"]:
            record["السورة"] = "لم يمكن تحديد السورة"

        # Final check for trailing "و"
        record["قارئ"] = re.sub(r'\s+و$', '', record["قارئ"]).strip()

        results.append(record)

    return results
