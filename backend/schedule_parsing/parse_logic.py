import re
import json
from collections import defaultdict

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
    Strip typical emojis / special Unicode symbols.
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

def fix_time_format_flex(time_str: str) -> str:
    """
    Flexible time parser:
      - "7ص" => "07:00"
      - "7.5" => "07:05" (example)
    Strips trailing Arabic letters, parentheses, etc.
    """
    time_str = re.sub(r'\([^)]*\)', '', time_str).strip()

    # e.g. "7ص" => "07:00"
    m_single = re.match(r'^(\d{1,2})(\s*[صم]?)$', time_str, re.IGNORECASE)
    if m_single:
        hour = int(m_single.group(1))
        if 0 <= hour <= 23:
            return f"{hour:02d}:00"

    # "7.5" => interpret as "07:05"
    time_str = time_str.replace('٫', '.').replace('،', '.')
    m_point = re.match(r'^(\d{1,2})\.(\d{1,2})$', time_str)
    if m_point:
        hour = int(m_point.group(1))
        mins = int(m_point.group(2))
        if mins < 10:
            mins = mins * 10
        if mins >= 60:
            mins = 59
        return f"{hour:02d}:{mins:02d}"

    # unify '.' => ':'
    time_str = time_str.replace('.', ':')
    # remove trailing letters
    time_str = re.sub(r'([0-9:\s]+)[^\d:\s]+$', r'\1', time_str).strip()

    match = re.match(r'(\d{1,2})\s*:\s*(\d{1,2})', time_str)
    if not match:
        return ""
    hour = int(match.group(1))
    minute = int(match.group(2))
    if hour > 23 and minute <= 23:
        hour, minute = minute, hour
    if hour > 23 or minute > 59:
        return ""
    return f"{hour:02d}:{minute:02d}"

#############################
# C) Reciter Parsing
#############################

def parse_reciter(line: str) -> str:
    """
    Extract text after (للشيخ|للقارئ|قارئ).
    Remove leftover 'ما تيسر', 'سورة...', durations, etc.
    """
    pattern = re.compile(
        r'(?:للشيخ|للقارئ|قارئ)\s*/?\s*(.+?)(?=\s*(?:مدة\s+التلاوة|ما\s+تيسر|/|$))',
        re.IGNORECASE
    )
    m = pattern.search(line)
    if not m:
        return ""
    reciter_text = m.group(1).strip()

    # remove references to surahs or durations
    reciter_text = re.sub(r'(?i)(ما\s+تيسر.*$|سورة\s+.*$|سورتى\s+.*$|\d+\s*ق.*$)', '', reciter_text).strip()

    # Additional cleanup
    reciter_text = re.split(r'(?:\d+\s*ق|سورة\s+)', reciter_text)[0]
    reciter_text = reciter_text.replace('وماتيسرمن', '').strip()
    reciter_text = reciter_text.strip('/').strip()

    return reciter_text

#############################
# D) Surah Parsing
#############################

def parse_surahs(line: str) -> list:
    """
    Return a list of surah references from:
      'ما تيسر من سورتى X - Y', 'من سورة X', etc.
    """
    pattern = re.compile(
        r'(?:ما\s*تيسر\s*من|من\s+(?:سورة|سور|سورتى))\s+(.+?)(?=\s*(?:ومدة\s+التلاوة|مدة\s+التلاوة|\d+\s*ق|$))',
        re.IGNORECASE
    )
    matches = pattern.findall(line)
    all_surahs = []
    for m in matches:
        # Split on dash, slash, or ' و '
        chunks = re.split(r'(?:\s+و\s+)|[-/]', m)
        for c in chunks:
            c = c.strip()
            if not c:
                continue

            # If token == "قصار السور" => keep as is
            if re.match(r'(?i)^قصار\s+السور$', c):
                all_surahs.append("قصار السور")
            else:
                # else prefix with "سورة " if doesn't already have "سورة|سور|سورتى"
                if not re.match(r'^(?:سورة|سورتى|سور)', c, re.IGNORECASE):
                    c = "سورة " + c
                all_surahs.append(c)
    return all_surahs

#############################
# E) Verse Range Parsing
#############################

def parse_verse_ranges(line: str) -> dict:
    """
    'من الآية X سورة Foo ... حتى الآية Y سورة Bar'
    or 'من أول سورة X حتى ختام سورة Y'
    """
    data = {}
    # from verse # to verse #
    verse_pattern = re.compile(
        r'من\s+الآية\s*(\d+)\s*(?:من\s+)?سورة\s+([^..]+?)\s+'
        r'(?:و?حتى\s+الآية|إلى\s+الآية)\s*(\d+)\s*(?:من\s+)?سورة\s+([^..]+?)\b',
        re.IGNORECASE
    )
    m_verses = verse_pattern.search(line)
    if m_verses:
        data["من_الآية"] = m_verses.group(1).strip()
        data["سورة_1"]   = m_verses.group(2).strip()
        data["حتى_الآية"] = m_verses.group(3).strip()
        data["سورة_2"]   = m_verses.group(4).strip()

    # from "أول سورة X" => "ختام سورة Y"
    alt_pattern = re.compile(
        r'من\s+(?:أول\s+)?سورة\s+([^\s]+)\s+'
        r'(?:حتى\s+(?:ختام\s+)?سورة\s+([^\s]+)|وحتى\s+(?:ختام\s+)?سورة\s+([^\s]+))',
        re.IGNORECASE
    )
    m_alt = alt_pattern.search(line)
    if m_alt:
        data["من_الآية"] = "أول"
        data["سورة_1"]   = m_alt.group(1).strip()
        surah2 = m_alt.group(2) if m_alt.group(2) else m_alt.group(3)
        data["حتى_الآية"] = "ختام"
        data["سورة_2"]   = surah2.strip()

    return data

#############################
# F) Final Surah-String Logic
#############################

def transform_surah_list(sur_list: list) -> str:
    """
    - Remove any leading "سورة|سور|سورتى" from each token (except "قصار السور").
    - If the *first* token is "قصار السور", keep it as is, then subsequent tokens => "و <token>".
    - Otherwise, "سورة <token1>" for the first token, subsequent => "و <token>" (no "سورة" repeated).
    - After building the final string, remove any leftover "سورتي" or "سور".
    - If multiple 'سورة' appear, keep only the first occurrence, remove from subsequent tokens.
    """
    if not sur_list:
        return ""

    # 1) Clean each token: remove leading "سورة|سورتى|سور" unless it's "قصار السور"
    cleaned = []
    for s in sur_list:
        s = s.strip()
        if re.match(r'(?i)^قصار\s+السور$', s):
            cleaned.append("قصار السور")
        else:
            s = re.sub(r'^(?:سورة|سورتى|سور)\s+', '', s, flags=re.IGNORECASE).strip()
            cleaned.append(s)

    # 2) Build initial string
    #   e.g. if cleaned = ["البقرة", "القمر", "التحريم"] => "سورة البقرة و القمر و التحريم"
    #   if cleaned = ["قصار السور", "النمل", "النصر"] => "قصار السور و النمل و النصر"

    final_parts = []
    for i, token in enumerate(cleaned):
        if i == 0:
            # first token
            if token.lower() == "قصار السور":
                final_parts.append("قصار السور")
            else:
                # prefix with "سورة "
                final_parts.append(f"سورة {token}")
        else:
            # subsequent tokens => prefix only "و "
            if token.lower() == "قصار السور":
                final_parts.append("و قصار السور")
            else:
                final_parts.append(f"و {token}")

    final_str = " ".join(final_parts)

    # 3) Remove any existence of "سورتي" or "سور" from final output.
    #    e.g. if "سورتى" or "سور" accidentally appear, strip them out.
    #    We'll do a broad approach:
    final_str = re.sub(r'\b(?:سورتى|سور)\b', '', final_str, flags=re.IGNORECASE)
    # fix double spaces if they appear
    final_str = re.sub(r'\s+', ' ', final_str).strip()

    # 4) If multiple occurrences of "سورة" appear, keep only the first one.
    #    We'll do a simple approach: find the first "سورة" and remove subsequent ones
    #    (but not if it's "سورة" inside some other word).
    #    We'll do it token by token:
    tokens = final_str.split()
    found_sura = False
    for idx, t in enumerate(tokens):
        if re.match(r'(?i)^سورة$', t):
            if not found_sura:
                found_sura = True
            else:
                # remove this "سورة"
                tokens[idx] = ""  # blank it out

    final_str = " ".join([t for t in tokens if t]).strip()

    return final_str

#############################
# G) Single Line => Dict
#############################

def parse_line(line: str) -> dict:
    line = remove_brackets(line)

    # Time
    time_match = re.search(r'\b(\d{1,2}(\.\d{1,2}|\:\d{1,2})?[^\d\s]*)', line)
    raw_time = fix_time_format_flex(time_match.group(1)) if time_match else ""
    time_val = remove_emojis(raw_time) if raw_time else ""

    # Reciter
    raw_reciter = parse_reciter(line)
    reciter_val = remove_emojis(raw_reciter) if raw_reciter else ""

    # Surah List
    sur_list = parse_surahs(line)
    sur_list = [remove_emojis(x) for x in sur_list]

    # Verse ranges
    verse_info = parse_verse_ranges(line)

    out = {
        "الوقت": time_val,
        "قارئ": reciter_val,
        "سور_list": sur_list
    }
    out.update(verse_info)
    return out

#############################
# H) Merge Lines
#############################

def should_start_new_item(line: str) -> bool:
    time_pattern = re.compile(r'\b\d{1,2}\s*[:\.]\s*\d{1,2}')
    if time_pattern.search(line):
        return True
    if re.search(r'^\s*(الساعة|تلاوة|للشيخ|للقارئ)', line, re.IGNORECASE):
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
    1) Split lines
    2) Merge them
    3) Parse each chunk
    4) Convert 'سور_list' => final single string
    5) Fallback strings for empty fields
    """
    lines = raw_text.split("\n")
    merged_items = merge_lines(lines)

    results = []
    for chunk in merged_items:
        record = parse_line(chunk)

        # If truly empty => skip
        if not (record["الوقت"] or record["قارئ"] or record["سور_list"]):
            # If no verse info => skip
            if len(record) == 3:
                continue

        # Transform surah list -> final single surah string
        sur_str = transform_surah_list(record["سور_list"])
        del record["سور_list"]
        record["السور"] = sur_str

        # Fallback if empty
        if not record["الوقت"]:
            record["الوقت"] = "لم يمكن تحديد الوقت"
        if not record["قارئ"]:
            record["قارئ"] = "لم يمكن التعرف علي القارئ"
        if not record["السور"]:
            record["السور"] = "لم يمكن تحديد السورة"

        # remove trailing "و"
        record["قارئ"] = re.sub(r'\s+و$', '', record["قارئ"]).strip()

        results.append(record)

    return results