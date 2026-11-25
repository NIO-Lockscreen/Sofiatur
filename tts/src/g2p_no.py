# Copyright 2026 EmpirioLabs.ai LLC. Licensed under the Apache License, Version 2.0.
"""EmpirioLabs G2P for the Canora Norwegian model (one self-contained file).

    from g2p_no import NorwegianG2P
    phonemes, _ = NorwegianG2P()(text)
"""
from __future__ import annotations
"""Shared pieces of the EmpirioLabs G2P modules: the Kokoro-82M phoneme vocabulary, punctuation-aware
chunking, and an espeak-ng runner that calls the `espeak-ng` program (no library linking)."""

import os
import re
import shutil
import subprocess
import unicodedata

# The 114 symbols Kokoro-82M's config.json maps to ids (hexgrad/Kokoro-82M, vocab unchanged).
KOKORO_SYMBOLS = (
    ';:,.!?\u2014…"()“” ̃ʣʥʦʨᵝꭧAIOQSTWYᵊ'
    'abcdefhijklmnopqrstuvwxyz'
    'ɑɐɒæβɔɕçɖðʤəɚɛɜɟɡ'
    'ɥɨɪʝɯɰŋɳɲɴøɸθœɹɾɻ'
    'ʁɽʂʃʈʧʊʋʌɣɤχʎʒʔˈˌ'
    'ːʰʲ↓→↗↘ᵻ'
)
VOCAB = frozenset(KOKORO_SYMBOLS)
assert len(VOCAB) == 114, len(VOCAB)

PUNCT_KEEP = ";:,.!?…"          # punctuation tokens we emit
EM = "\u2014"                         # Kokoro's dash token

# Affricates written as two letters by espeak-ng; Kokoro has single-symbol ligatures for them.
AFFRICATES = (("t͡s", "ʦ"), ("d͡z", "ʣ"), ("t͡ʃ", "ʧ"),
              ("d͡ʒ", "ʤ"), ("t͡ɕ", "ʨ"), ("d͡ʑ", "ʥ"),
              ("ts", "ʦ"), ("dz", "ʣ"), ("tʃ", "ʧ"), ("dʒ", "ʤ"),
              ("tɕ", "ʨ"), ("dʑ", "ʥ"))


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def clean_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def keep_final_punct(original: str, normalized: str) -> str:
    """An abbreviation such as `r.` or a number such as `295.` can swallow the sentence-final period."""
    o, n = original.rstrip(), normalized.rstrip()
    if o and o[-1] in ".!?…" and n and n[-1] not in ".!?…":
        return n + o[-1]
    return n


def unify_punctuation(text: str) -> str:
    """Map typographic variants onto the small punctuation set the models were trained with."""
    text = text.replace("…", "...").replace(" ", " ").replace(" ", " ")
    text = re.sub(r"[‘’‚‛ʼ´`]", "'", text)
    text = re.sub(r"[“”„‟«»‹›\"]", '"', text)
    text = re.sub(r"\s[\-–\u2014]+\s", " \u2014 ", text)       # spaced dash = pause
    text = re.sub(r"[–\u2014]", " \u2014 ", text)
    text = re.sub(r"\.{3,}", "…", text)
    text = re.sub(r"[!?]{2,}", lambda m: m.group(0)[0], text)
    return clean_spaces(text)


_SPLIT = re.compile(r"([;:,.!?…\u2014\"()\[\]{}¿¡]+)")


def chunk(text: str) -> list[tuple[str, str]]:
    """Split normalised text into (words, following punctuation) pairs. Quotes and brackets end a chunk but
    emit no token; ;:,.!?... and the dash are kept as Kokoro tokens."""
    out: list[tuple[str, str]] = []
    parts = _SPLIT.split(text)
    for i in range(0, len(parts), 2):
        words = parts[i].strip()
        punct = parts[i + 1] if i + 1 < len(parts) else ""
        kept = "".join(ch for ch in punct if ch in PUNCT_KEEP or ch == EM)
        if kept:
            # keep one mark: the strongest (sentence end beats clause marks)
            for strong in ("?", "!", "…", ".", ";", ":", EM, ","):
                if strong in kept:
                    kept = strong
                    break
        if words:
            out.append((words, kept))
        elif kept and out and not out[-1][1]:
            out[-1] = (out[-1][0], kept)
    return out


def join_chunks(phonemized: list[str], puncts: list[str]) -> str:
    pieces = []
    for ph, p in zip(phonemized, puncts):
        ph = ph.strip()
        if not ph:
            continue
        if p == EM:
            pieces.append(ph + " " + EM)
        else:
            pieces.append(ph + p)
    return clean_spaces(" ".join(pieces))


def map_symbols(ps: str, table: list[tuple[str, str]]) -> str:
    for a, b in table:
        ps = ps.replace(a, b)
    return ps


def to_vocab(ps: str) -> str:
    """Drop anything Kokoro cannot embed (it would be silently dropped by KModel anyway)."""
    return clean_spaces("".join(ch for ch in ps if ch in VOCAB))


class Espeak:
    """Runs the espeak-ng program once per call on newline-separated chunks (one output line per chunk).
    Set ESPEAK_NG_BIN to point at a specific binary."""

    def __init__(self, voice: str):
        self.voice = voice
        self.bin = os.environ.get("ESPEAK_NG_BIN") or shutil.which("espeak-ng") or shutil.which("espeak")
        if not self.bin:
            raise RuntimeError("espeak-ng not found: install it (apt-get install espeak-ng, brew install "
                               "espeak-ng, or the Windows installer) or set ESPEAK_NG_BIN")

    def _run(self, lines: list[str]) -> list[str]:
        r = subprocess.run([self.bin, "-q", "--ipa", "-v", self.voice, "-b", "1"],
                           input="\n".join(lines) + "\n", capture_output=True, text=True, encoding="utf-8",
                           check=True)
        return [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]

    def __call__(self, chunks: list[str]) -> list[str]:
        if not chunks:
            return []
        out = self._run(chunks)
        if len(out) == len(chunks):
            return out
        return [" ".join(self._run([c])) for c in chunks]   # a chunk split into clauses: do one at a time


def version_of_espeak() -> str:
    exe = os.environ.get("ESPEAK_NG_BIN") or shutil.which("espeak-ng") or "espeak-ng"
    try:
        return subprocess.run([exe, "--version"], capture_output=True, text=True).stdout.strip()
    except OSError:
        return "missing"


# ---- language module ----
"""Norwegian (Bokmål) G2P for the EmpirioLabs Canora Norwegian model: plain text (numbers, dates, times, money,
units and common abbreviations included) to Kokoro-82M phonemes, through the espeak-ng program (voice `nb`).

    g2p = NorwegianG2P()
    phonemes, _ = g2p("Den 12. mars 2025 kl. 14.30 koster billetten 12,50 kr.")
"""

import re


UNITS = ["null", "en", "to", "tre", "fire", "fem", "seks", "sju", "åtte", "ni", "ti", "elleve", "tolv", "tretten",
         "fjorten", "femten", "seksten", "sytten", "atten", "nitten"]
TENS = {2: "tjue", 3: "tretti", 4: "førti", 5: "femti", 6: "seksti", 7: "sytti", 8: "åtti", 9: "nitti"}
ORD_SMALL = {1: "første", 2: "andre", 3: "tredje", 4: "fjerde", 5: "femte", 6: "sjette", 7: "sjuende", 8: "åttende",
             9: "niende", 10: "tiende", 11: "ellevte", 12: "tolvte", 13: "trettende", 14: "fjortende", 15: "femtende",
             16: "sekstende", 17: "syttende", 18: "attende", 19: "nittende"}
SCALES = ((10 ** 12, "billion", "billioner"), (10 ** 9, "milliard", "milliarder"), (10 ** 6, "million", "millioner"))
MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november",
          "desember"]
MONTH_ABBR = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9, "okt": 10,
              "nov": 11, "des": 12}
# Norwegian letter names; D is written "dé" so that it is not read as the pronoun "de".
LETTERS = {"a": "a", "b": "be", "c": "se", "d": "dé", "e": "e", "f": "eff", "g": "ge", "h": "hå", "i": "i", "j": "je",
           "k": "kå", "l": "ell", "m": "emm", "n": "enn", "o": "o", "p": "pe", "q": "ku", "r": "ærr", "s": "ess",
           "t": "te", "u": "u", "v": "ve", "w": "dobbelt-ve", "x": "eks", "y": "y", "z": "sett", "æ": "æ", "ø": "ø",
           "å": "å"}
ACRONYM_WORDS = {"NAV": "nav", "SAS": "sas"}                 # three-letter names said as one word
CODE_WORDS = {"NOK": "norske kroner", "SEK": "svenske kroner", "DKK": "danske kroner", "EUR": "euro",
              "USD": "dollar", "GBP": "britiske pund"}
VOWELS = set("AEIOUYÆØÅ")
ONSETS = {"BL", "BR", "DR", "DV", "FJ", "FL", "FR", "GJ", "GL", "GN", "GR", "HJ", "HV", "KJ", "KL", "KN", "KR", "KV",
          "PL", "PR", "SJ", "SK", "SL", "SM", "SN", "SP", "ST", "SV", "TJ", "TR", "TV", "VR", "SKJ", "SKR", "SKV",
          "SPL", "SPR", "STR"}
CODAS3 = {"RSK", "NST", "RST", "NKT", "KST", "MST", "LST", "NDS", "RTS", "NTS", "NGS", "RDS", "LDS", "RKS"}

# (pattern, words, ends a sentence): matched case-insensitively; a capital first letter is kept. Abbreviations that
# usually close a sentence keep their period when a capitalised word follows.
ABBREVIATIONS = [
    (r"f\.\s?eks\b\.?", "for eksempel", False), (r"bl\.\s?a\b\.?", "blant annet", False),
    (r"d\.\s?v\.\s?s\b\.?", "det vil si", False), (r"dvs\b\.?", "det vil si", False),
    (r"m\.\s?a\.\s?o\.", "med andre ord", False), (r"f\.\s?o\.\s?m\.", "fra og med", False),
    (r"t\.\s?o\.\s?m\.", "til og med", False), (r"p\.\s?g\.\s?a\.", "på grunn av", False),
    (r"pga\b\.?", "på grunn av", False), (r"p\.\s?t\.", "per tiden", False),
    (r"o\.\s?s\.\s?v\.", "og så videre", True), (r"osv\b\.?", "og så videre", True),
    (r"m\.\s?m\.", "med mer", True), (r"m\.\s?v\.", "med videre", True), (r"mv\b\.?", "med videre", True),
    (r"m\.\s?fl\.", "med flere", True), (r"mfl\b\.?", "med flere", True), (r"o\.\s?l\.", "og lignende", True),
    (r"e\.\s?l\.", "eller lignende", True), (r"etc\b\.?", "et cetera", True), (r"f\.\s?Kr\.", "før Kristus", True),
    (r"e\.\s?Kr\.", "etter Kristus", True), (r"mva\b\.?", "emm ve a", True),
    (r"ca\.", "cirka", False), (r"ca(?=\s?\d)", "cirka", False), (r"nr\.", "nummer", False),
    (r"nr(?=\s?\d)", "nummer", False), (r"kl\.", "klokka", False), (r"kl(?=\s?\d)", "klokka", False),
    (r"tlf\b\.?", "telefon", False), (r"mob\.", "mobil", False), (r"s\.(?=\s?\d)", "side", False),
    (r"inkl\b\.?", "inklusive", False), (r"ekskl\b\.?", "eksklusive", False), (r"evt\b\.?", "eventuelt", False),
    (r"ev\.", "eventuelt", False), (r"jfr?\b\.?", "jamfør", False), (r"mht\b\.?", "med hensyn til", False),
    (r"ift\b\.?", "i forhold til", False), (r"iht\b\.?", "i henhold til", False),
    (r"ifm\b\.?", "i forbindelse med", False), (r"vha\b\.?", "ved hjelp av", False),
    (r"hhv\b\.?", "henholdsvis", False), (r"ang\.", "angående", False), (r"vedr\.", "vedrørende", False),
    (r"kap\.", "kapittel", False), (r"avd\.", "avdeling", False), (r"adr\.", "adresse", False),
    (r"dr\.", "doktor", False), (r"prof\.", "professor", False), (r"pr\.", "per", False),
]
# unit: (singular, plural, gender of the noun: "n" takes "ett", otherwise "én")
UNIT_WORDS = {
    "km/t": ("kilometer i timen", "kilometer i timen", "m"), "km/h": ("kilometer i timen", "kilometer i timen", "m"),
    "m/s": ("meter per sekund", "meter per sekund", "m"), "km²": ("kvadratkilometer", "kvadratkilometer", "m"),
    "m²": ("kvadratmeter", "kvadratmeter", "m"), "m2": ("kvadratmeter", "kvadratmeter", "m"),
    "m³": ("kubikkmeter", "kubikkmeter", "m"), "m3": ("kubikkmeter", "kubikkmeter", "m"),
    "kWh": ("kilowattime", "kilowattimer", "m"), "MWh": ("megawattime", "megawattimer", "m"),
    "GWh": ("gigawattime", "gigawattimer", "m"), "TWh": ("terawattime", "terawattimer", "m"),
    "kW": ("kilowatt", "kilowatt", "m"), "MW": ("megawatt", "megawatt", "m"), "W": ("watt", "watt", "m"),
    "km": ("kilometer", "kilometer", "m"), "cm": ("centimeter", "centimeter", "m"),
    "mm": ("millimeter", "millimeter", "m"), "m": ("meter", "meter", "m"), "kg": ("kilo", "kilo", "n"),
    "hg": ("hekto", "hekto", "n"), "mg": ("milligram", "milligram", "n"), "g": ("gram", "gram", "n"),
    "dl": ("desiliter", "desiliter", "m"), "cl": ("centiliter", "centiliter", "m"),
    "ml": ("milliliter", "milliliter", "m"), "l": ("liter", "liter", "m"),
    "°C": ("grad celsius", "grader celsius", "m"), "°": ("grad", "grader", "m"),
    "kB": ("kilobyte", "kilobyte", "m"), "KB": ("kilobyte", "kilobyte", "m"), "MB": ("megabyte", "megabyte", "m"),
    "GB": ("gigabyte", "gigabyte", "m"), "TB": ("terabyte", "terabyte", "m"), "dB": ("desibel", "desibel", "m"),
    "min": ("minutt", "minutter", "n"), "sek": ("sekund", "sekunder", "n"), "s": ("sekund", "sekunder", "n"),
    "t": ("time", "timer", "m"), "mnd": ("måned", "måneder", "m"), "stk": ("stykk", "stykker", "n"),
}
PER_UNIT = {"l": "liter", "kg": "kilo", "km": "kilometer", "stk": "stykk", "t": "time", "time": "time",
            "mnd": "måned", "år": "år", "m": "meter", "m2": "kvadratmeter", "m²": "kvadratmeter", "dag": "dag",
            "døgn": "døgn", "uke": "uke", "pers": "person", "person": "person", "kWh": "kilowattime"}
# currency: (singular, plural, minor unit singular, minor unit plural, gender, gender of the minor unit)
CURRENCIES = {"kr": ("krone", "kroner", "øre", "øre", "m", "n"), "eur": ("euro", "euro", "cent", "cent", "m", "m"),
              "usd": ("dollar", "dollar", "cent", "cent", "m", "m"), "gbp": ("pund", "pund", "penny", "pence", "n", "m"),
              "sek": ("svensk krone", "svenske kroner", "øre", "øre", "m", "n"),
              "dkk": ("dansk krone", "danske kroner", "øre", "øre", "m", "n")}
CURRENCY_KEYS = {"kr": "kr", "kroner": "kr", "krone": "kr", "nok": "kr", "€": "eur", "eur": "eur", "euro": "eur",
                 "$": "usd", "usd": "usd", "dollar": "usd", "£": "gbp", "gbp": "gbp", "pund": "gbp", "sek": "sek",
                 "dkk": "dkk"}
SCALE_WORDS = {"mill": ("million", "millioner"), "million": ("million", "millioner"),
               "millioner": ("million", "millioner"), "mrd": ("milliard", "milliarder"),
               "milliard": ("milliard", "milliarder"), "milliarder": ("milliard", "milliarder")}
# Nouns that take "ett" after the number 1.
NEUTER = set("""år øre barn hus land sted nummer stykk stykke eple egg glass par kilo kilogram gram hekto pund poeng
prosentpoeng mål tall ord svar spørsmål møte bilde brev fly tog skip rom bord vindu lag kapittel avsnitt punkt liv dyr
øye beløp kort ark sett lys kart måltid semester tiår århundre døgn minutt sekund kvarter hundre tusen prosjekt
selskap firma program problem forslag tilbud krav valg forsøk eksempel menneske medlem parti hotell kontor
universitet sykehus museum bibliotek område fylke nivå trinn steg vitne dokument hode hjerte bein ben""".split())
YEAR_CONTEXT = set("""i år året fra til siden før etter innen rundt omkring mellom og eller høsten våren sommeren
vinteren julen påsken født døde utgitt grunnlagt etablert bygget bygd opprettet perioden sesongen inntil fram frem
tidlig sent midten starten slutten begynnelsen utgangen""".split()) | set(MONTHS)
FRACTIONS = {(1, 2): "en halv", (1, 3): "en tredjedel", (2, 3): "to tredjedeler", (1, 4): "en kvart",
             (3, 4): "tre kvart"}
SYMBOLS = {"&": " og ", "+": " pluss ", "=": " er lik ", "@": " krøllalfa ", "§": " paragraf ", "%": " prosent ",
           "‰": " promille ", "°": " grader ", "×": " ganger ", "€": " euro ", "$": " dollar ", "£": " pund ",
           "½": " en halv ", "¼": " en kvart ", "¾": " tre kvart ", "#": " ", "*": " ", "_": " ", "|": " ",
           "~": " ", "^": " ", "<": " ", ">": " ", "\\": " "}

AMOUNT = r"(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.](\d+))?"           # 1 500 / 1.500 / 12,50
ABBR_DOT = r"(?:\.(?!\s+[A-ZÆØÅ]))?"                             # an abbreviation's period, unless it ends the sentence

# espeak-ng `nb` symbols Kokoro lacks, or writes with a symbol for another sound, mapped to the nearest symbol in
# Kokoro's vocabulary: ʉ (as in "hus") to the close central ɨ, keeping it apart from y and u; the kj sound, written
# x ("kjøre") and ʂ ("tjue", "tjeneste"), to ç; the linking ɹ of "for" to r. Word-initial stj ("stjerne", written sʂ)
# becomes the sj sound ʃ before this map runs (see _STJ).
SYMBOL_MAP = AFFRICATES + (("ʉ", "ɨ"), ("ʂ", "ç"), ("x", "ç"), ("ɹ", "r"), ("g", "ɡ"))
_STJ = re.compile(r"(?<!\S)sʂ")
# Two-part number words are given to espeak-ng one part at a time ("tjuefem" as "tjue-fem"), and "byte", which it
# reads as a Norwegian word, as pronounced ("bajt").
_NUMBER_COMPOUND = re.compile(r"\b(tjue|tretti|førti|femti|seksti|sytti|åtti|nitti)(en|ett|to|tre|fire|fem|seks|sju|"
                              r"åtte|ni|første|andre|tredje|fjerde|femte|sjette|sjuende|åttende|niende)\b")
_BYTE = re.compile(r"(?<=kilo|mega|giga|tera)byte|\bbyte\b")
_LANG_SWITCH = re.compile(r"\([a-z]{2,3}(?:-[a-z0-9]+)?\)")       # espeak-ng language switch marks such as (en)


def _below_100(n: int) -> str:
    if n < 20:
        return UNITS[n]
    t, u = divmod(n, 10)
    return TENS[t] + (UNITS[u] if u else "")


def _below_1000(n: int, lead: bool = True) -> str:
    h, r = divmod(n, 100)
    if not h:
        return _below_100(r)
    head = ("hundre" if lead else "ett hundre") if h == 1 else f"{UNITS[h]} hundre"
    return head + (f" og {_below_100(r)}" if r else "")


def int_words(n: int, one: str = "én") -> str:
    """A cardinal in words (modern counting: tjueen, tretti, førti). `one` is the form of a bare 1: "én" (masculine
    and feminine nouns, counting), "ett" (neuter nouns, clock hours) or "en" (decimals, scales)."""
    if n < 0:
        return "minus " + int_words(-n, one)
    if n == 1:
        return one
    if n < 1000:
        return _below_1000(n) if n else "null"
    if n >= 10 ** 15:
        return " ".join(UNITS[int(d)] for d in str(n))
    parts: list[str] = []
    rest = n
    for value, sg, pl in SCALES:
        q, rest = divmod(rest, value)
        if q:
            parts.append(f"en {sg}" if q == 1 else f"{_below_1000(q, not parts)} {pl}")
    q, rest = divmod(rest, 1000)
    if q:
        group = _below_1000(q, not parts)
        group = group[:-3] + " og ett" if group.endswith(" og en") else group      # hundre og ett tusen
        parts.append(("tusen" if not parts else "ett tusen") if q == 1 else f"{group} tusen")
    if rest:
        parts.append(f"og {_below_100(rest)}" if rest < 100 else _below_1000(rest, lead=False))
    return " ".join(parts)


def ordinal_words(n: int) -> str:
    r = n % 100
    if r:
        if r < 20:
            small = ORD_SMALL[r]
        else:
            t, u = divmod(r, 10)
            small = TENS[t] + ORD_SMALL[u] if u else TENS[t] + ("nde" if TENS[t].endswith("e") else "ende")
        return f"{int_words(n - r, 'ett')} og {small}" if n > r else small
    words = int_words(n, "ett")
    if words.endswith(("hundre", "tusen")):
        return words + "de"
    for sg, pl in (("million", "millioner"), ("milliard", "milliarder"), ("billion", "billioner")):
        if words.endswith((sg, pl)):
            return words.rsplit(" ", 1)[0] + " " + sg + "te"
    return words + "te"


def year_words(y: int) -> str:
    """Years 1100 to 1999 in hundreds (1987: nitten åttisju, 1905: nitten hundre og fem); other years as cardinals
    (2025: to tusen og tjuefem)."""
    if 1100 <= y < 2000:
        h, r = divmod(y, 100)
        if not r:
            return f"{_below_100(h)} hundre"
        return f"{_below_100(h)} hundre og {UNITS[r]}" if r < 10 else f"{_below_100(h)} {_below_100(r)}"
    return int_words(y, "en")


def _num(s: str) -> int:
    return int(re.sub(r"[ .]", "", s))


def _decimal(intpart: str, frac: str) -> str:
    frac_words = int_words(int(frac), "en") if len(frac) <= 2 and not frac.startswith("0") else \
        " ".join(UNITS[int(d)] for d in frac)
    return f"{int_words(_num(intpart), 'en')} komma {frac_words}"


def _counted(n: int, sg: str, pl: str, gender: str) -> str:
    return f"{int_words(n, 'ett' if gender == 'n' else 'én')} {sg if n == 1 else pl}"


def _money(whole: str, frac: str | None, key: str) -> str:
    sg, pl, sub_sg, sub_pl, gender, sub_gender = CURRENCIES[key]
    if frac and len(frac) > 2:
        return f"{_decimal(whole, frac)} {pl}"
    w = _num(whole) if whole else 0
    c = int(frac.ljust(2, "0")) if frac else 0
    if not w and c:
        return _counted(c, sub_sg, sub_pl, sub_gender)
    s = _counted(w, sg, pl, gender)
    return s + (f" og {_counted(c, sub_sg, sub_pl, sub_gender)}" if c else "")


def _scaled(whole: str, frac: str | None, scale: str) -> str:
    sg, pl = SCALE_WORDS[scale.lower().rstrip(".")]
    if frac:
        return f"{_decimal(whole, frac)} {pl}"
    n = _num(whole)
    return f"{int_words(n, 'en')} {sg if n == 1 else pl}"


def _clock(h: int, m: int) -> str:
    """Digital reading: 14.30 fjorten tretti, 9.05 ni null fem, 14.00 fjorten, 1.00 ett."""
    hour = "ett" if h == 1 else int_words(h)
    if not m:
        return "null null" if not h else hour
    return f"{hour} {'null ' + UNITS[m] if m < 10 else int_words(m, 'en')}"


def _spell(word: str) -> str:
    return " ".join(LETTERS.get(ch.lower(), ch) for ch in word)


def _speakable(word: str) -> bool:
    """Whether an all-caps word of four or five letters reads as a Norwegian word (NATO, IKEA) rather than letters."""
    vowels = [i for i, ch in enumerate(word) if ch in VOWELS]
    if not vowels:
        return False
    onset, coda = word[:vowels[0]], word[vowels[-1] + 1:]
    if len(onset) > 1 and onset not in ONSETS:
        return False
    if len(coda) > 3 or (len(coda) == 3 and coda not in CODAS3):
        return False
    return all(len(run) <= 3 for run in re.findall(r"[^AEIOUYÆØÅ]+", word[vowels[0]:vowels[-1] + 1]))


def _acronym(m: re.Match) -> str:
    word, gen = m.group(1), m.group(2) or ""
    if word in ACRONYM_WORDS:
        return ACRONYM_WORDS[word] + gen
    if len(word) >= 4 and _speakable(word):
        return word.lower() + gen
    return _spell(word) + gen


def _abbreviation(words: str, terminal: bool):
    def rep(m: re.Match) -> str:
        if "." not in m.group(0) and m.group(0).isupper() and len(m.group(0)) > 2:
            return m.group(0)                                      # PGA, MVA: an acronym, not an abbreviation
        w = words[0].upper() + words[1:] if m.group(0)[0].isupper() else words
        if terminal and m.group(1):
            w += "."
        nxt = m.string[m.end():m.end() + 1]
        return w + (" " if nxt.isalnum() else "")
    return rep


def _is_year(m: re.Match) -> bool:
    """A bare number from 1100 to 1999 is a year after a word such as i, fra, siden or a month, at the start of a
    sentence, or when no lowercase word follows it; otherwise it is a count (tusen fem hundre personer)."""
    before, after = m.string[:m.start()], m.string[m.end():]
    prev = re.search(r"([^\W\d_]+)\W*$", before)
    if prev and prev.group(1).lower() in YEAR_CONTEXT:
        return True
    if not before.strip() or re.search(r"[.!?:;(\"]\s*$", before):
        return True
    return not re.match(r"\s+[a-zæøå]", after)


def _plain_number(m: re.Match) -> str:
    s = m.group(0)
    if len(s) > 1 and s[0] == "0":
        return " ".join(UNITS[int(d)] for d in s)                 # 007, 0150: digit by digit
    n = _num(s)
    if len(s) == 4 and 1100 <= n <= 1999 and _is_year(m):
        return year_words(n)
    nxt = re.match(r"\s+([^\W\d_]+)", m.string[m.end():])
    return int_words(n, "ett" if nxt and nxt.group(1).lower() in NEUTER else "én")


def _digit_group(s: str) -> str:
    return " ".join(UNITS[int(d)] for d in s) if len(s) > 1 and s[0] == "0" else int_words(int(s), "en")


def _phone(m: re.Match) -> str:
    """Telephone numbers in their written groups (223 34 455), or in pairs after a telephone word (22334455)."""
    groups = [g for g in m.groups() if g]
    if len(groups) == 1:
        if not re.search(r"\b(?i:telefon\w*|mobil\w*|tlf|ring|sms|nummer|nr)\b(?:\W+\w+){0,2}\W*$",
                         m.string[:m.start()]):
            return m.group(0)
        groups = re.findall(r"\d\d", groups[0])
    return " ".join(_digit_group(g) for g in groups)


def _date(d: int, mo: int, y: int | None = None) -> str | None:
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return None
    return f"{ordinal_words(d)} {MONTHS[mo - 1]}" + (f" {year_words(y)}" if y is not None else "")


def _web(m: re.Match) -> str:
    s = re.sub(r"^https?://", "", m.group(0))
    www = s.startswith("www.")
    s = s[4:] if www else s
    for ch, w in ((".", " punktum "), ("@", " krøllalfa "), ("/", " skråstrek "), ("-", " bindestrek "),
                  ("_", " understrek ")):
        s = s.replace(ch, w)
    return ("dobbelt-ve dobbelt-ve dobbelt-ve punktum " if www else "") + s


_RANGE_NUM = r"\d{1,3}(?:[ .]\d{3})+(?!\d)|\d+(?:[.:]\d{2})?"


def _range(m: re.Match) -> str:
    """Rising numbers joined by a dash are a range (9-17: ni til sytten); others are read in turn (a score, 3-1)."""
    def value(s: str) -> float:
        return float(re.sub(r"[ .]", "", s)) if re.fullmatch(r"\d{1,3}(?:[ .]\d{3})+", s) else \
            float(s.replace(":", "."))
    a, dot, b = m.group(1), m.group(2), m.group(3)
    return f"{a}{dot} til {b}" if value(a) < value(b) else f"{a}{dot} {b}"


def normalize(text: str) -> str:
    t = nfc(text).replace("−", "-")
    t = re.sub(r"(?<=\d),(?:-{1,2}|–)(?!\d)", "", t)                      # 12,- kr: whole kroner
    t = re.sub(rf"(?<![\d.,:])({_RANGE_NUM})(\.?)\s?–\s?({_RANGE_NUM})", _range, t)   # 9–17, 12.–14. mars
    t = unify_punctuation(t)
    # e-mail and web addresses
    t = re.sub(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b|\b(?:https?://)?(?:www\.)?[\w-]+(?:\.[\w-]+)*"
               r"\.(?:no|com|org|net|se|dk|eu|io|ai|info)\b(?:/[\w\-./?=&]*)?", _web, t)
    for pat, words, terminal in ABBREVIATIONS:
        t = re.sub(r"(?<![\w.])(?i:" + pat + r")" + (r"(?=(\s+[A-ZÆØÅ])|)" if terminal else "()"),
                   _abbreviation(words, terminal), t)
    t = re.sub(r"(?<![\w.])St\.(?=\s[A-ZÆØÅ])", "Sankt", t)
    # dates: 2025-03-12, 12.03.2025, 12/3/2025, 12. mars, 12. mar., den 12.03
    t = re.sub(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b",
               lambda m: _date(int(m.group(3)), int(m.group(2)), int(m.group(1))) or m.group(0), t)
    t = re.sub(r"\b(\d{1,2})([./-])(\d{1,2})\2(\d{4})\b",
               lambda m: _date(int(m.group(1)), int(m.group(3)), int(m.group(4))) or m.group(0), t)
    month_rx = "|".join(MONTHS)
    abbr_rx = "|".join(sorted(MONTH_ABBR, key=len, reverse=True))
    t = re.sub(rf"\b(\d{{1,2}})\.?\s?(?i:({month_rx})\b|({abbr_rx})\.)",
               lambda m: _date(int(m.group(1)), MONTHS.index(m.group(2).lower()) + 1 if m.group(2)
                               else MONTH_ABBR[m.group(3).lower()]) or m.group(0), t)
    t = re.sub(r"\b([Dd]en)\s(\d{1,2})\.(\d{1,2})\b\.?(?!\d)",
               lambda m: f"{m.group(1)} {_date(int(m.group(2)), int(m.group(3)))}"
               if _date(int(m.group(2)), int(m.group(3))) else m.group(0), t)
    t = re.sub(r"\b([Dd]en)\s(\d{1,2})\.(?!\d)", lambda m: f"{m.group(1)} {ordinal_words(int(m.group(2)))}", t)
    t = re.sub(r"\b(\d{4})/(\d{2}|\d{4})\b", r"\1 til \2", t)              # 2024/25
    t = re.sub(rf"(?<![\d.,:])({_RANGE_NUM})(\.?)-({_RANGE_NUM})", _range, t)  # 10-15, 3-1
    t = re.sub(r"(?<![\w,.])-(?=\d)", "minus ", t)                         # -5
    # clock times after klokka (kl.)
    t = re.sub(r"\b((?i:klokka|klokken))\s?(\d{1,2})(?:[.:](\d{2}))?(?!\d|[.,:]\d)",
               lambda m: f"{m.group(1)} {_clock(int(m.group(2)), int(m.group(3) or 0))}"
               if int(m.group(2)) <= 24 and int(m.group(3) or 0) < 60 else m.group(0), t)
    # money: kr 12,50 / 12,50 kr / 1 500,- kr / € 3,50 / 2,5 mill. kr / NOK 3 mrd.
    amount = r"(?P<w>\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.](?P<f>\d+))?"
    scale = (r"(?:\s?(?P<s>(?:mill|mrd)(?![\wæøå])" + ABBR_DOT +
             r"|(?:millioner|milliarder|million|milliard)(?![\wæøå])))?")
    kr = r"(?i:kr)(?![\wæøå])" + ABBR_DOT
    cur_pre = r"(?<!\w)(?P<c>" + kr + r"|NOK|EUR|USD|GBP|SEK|DKK|€|\$|£)\s?"
    cur_post = r"\s?(?P<c>" + kr + r"|(?:kroner|krone|NOK|EUR|USD|GBP|SEK|DKK|euro|dollar|pund)\b|€|\$|£)"

    def money(m: re.Match) -> str:
        key = CURRENCY_KEYS[m.group("c").lower().rstrip(".")]
        if m.group("s"):
            return f"{_scaled(m.group('w'), m.group('f'), m.group('s'))} {CURRENCIES[key][1]}"
        return _money(m.group("w"), m.group("f"), key)
    t = re.sub(cur_pre + amount + scale, money, t)
    t = re.sub(amount + scale + cur_post, money, t)
    # percent and per mille
    t = re.sub(r"(?<![\d.,:])" + AMOUNT + r"\s?([%‰])", lambda m: (_decimal(m.group(1), m.group(2)) if m.group(2)
                                                                    else int_words(_num(m.group(1)))) +
               (" prosent" if m.group(3) == "%" else " promille"), t)
    # units
    unit_rx = "|".join(re.escape(u) for u in sorted(UNIT_WORDS, key=len, reverse=True))

    def unit(m: re.Match) -> str:
        sg, pl, gender = UNIT_WORDS[m.group(3)]
        if m.group(2):
            return f"{_decimal(m.group(1), m.group(2))} {pl}"
        return _counted(_num(m.group(1)), sg, pl, gender)
    t = re.sub(r"(?<![\d.,:])" + AMOUNT + r"\s?(" + unit_rx + r")(?![\wæøå²³-])(?:\.(?=\s+[a-zæøå\d]))?", unit, t)
    t = re.sub(r"\b(kroner|krone|øre|euro|dollar|cent|kilometer|meter|liter|kilo)/(" +
               "|".join(re.escape(u) for u in sorted(PER_UNIT, key=len, reverse=True)) + r")(?![\wæøå²])\.?",
               lambda m: f"{m.group(1)} per {PER_UNIT[m.group(2)]}", t)
    # other clock times: 14:30, 14.30
    t = re.sub(r"\b(\d{1,2})[:.](\d{2})\b(?![.,:]\d)",
               lambda m: _clock(int(m.group(1)), int(m.group(2)))
               if int(m.group(1)) <= 24 and int(m.group(2)) < 60 else m.group(0), t)
    # ordinals: 3. plass, 21. gang; decades: 1990-tallet, 80-årene
    t = re.sub(r"\b(\d{1,3})\.(?=\s+[a-zæøå])", lambda m: ordinal_words(int(m.group(1))), t)

    def decade(m: re.Match) -> str:
        n = int(m.group(1))
        if len(m.group(1)) == 2:
            return int_words(n) + m.group(2)
        if 2010 <= n < 2100:
            return "tjue" + _below_100(n % 100) + m.group(2)
        return year_words(n) + m.group(2)
    t = re.sub(r"\b(\d{2}|\d{4})-(tallet|tallets|årene|årenes)\b", decade, t)
    # scales without currency: 2,5 mill., 3 milliarder
    t = re.sub(r"(\d{1,3}(?:[ .]\d{3})+|\d+)(?:,(\d+))?\s?((?:mill|mrd)(?![\wæøå])" + ABBR_DOT +
               r"|(?:millioner|milliarder|million|milliard)(?![\wæøå]))",
               lambda m: _scaled(m.group(1), m.group(2), m.group(3)), t)
    # fractions, multiplication, decimals, section numbers
    t = re.sub(r"(?<=\d)\s?([½¼¾])", lambda m: " og" + SYMBOLS[m.group(1)].rstrip(), t)    # 3 ½: tre og en halv
    t = re.sub(r"\b(\d)/(\d)\b", lambda m: FRACTIONS.get((int(m.group(1)), int(m.group(2))), m.group(0)), t)
    t = re.sub(r"(?<=\d)\s?[x×]\s?(?=\d)", " ganger ", t)
    t = re.sub(r"\b(\d{1,3}(?:[ .]\d{3})+|\d+),(\d+)\b", lambda m: _decimal(m.group(1), m.group(2)), t)
    t = re.sub(r"\b\d+(?:\.\d+)+\b", lambda m: m.group(0) if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", m.group(0)) else
               " punkt ".join(_digit_group(p) for p in m.group(0).split(".")), t)          # 3.5, 2.1.4 (not 1.500)
    t = re.sub(r"(?<![\d.,])(?:(\d{3}) (\d{2}) (\d{3})|(\d{8}))(?!\d|[.,]\d)", _phone, t)
    # remaining integers (years, counts with én/ett), after splitting digits from letters (E6, 4G, 2b)
    t = re.sub(r"(?<![\w])([^\W\d_])(?=\d)|(?<=\d)([^\W\d_])(?!\w)",
               lambda m: f" {LETTERS.get((m.group(1) or m.group(2)).lower(), m.group(0))} ", t)
    t = re.sub(r"(?<=[^\W\d_])(?=\d)|(?<=\d)(?=[^\W\d_])", " ", t)
    t = re.sub(r"\b\d{1,3}(?:[ .]\d{3})+\b|\b\d+\b", _plain_number, t)
    t = re.sub(r"(?<![\w.])(?i:kr)\b" + ABBR_DOT, "kroner", t)
    t = re.sub(r"(?<![\w.])stk\b" + ABBR_DOT, "stykk", t)
    t = re.sub(r"(?<![\w.])(?:mill\b|mrd\b)" + ABBR_DOT,
               lambda m: "millioner" if m.group(0).startswith("mill") else "milliarder", t)
    # symbols, currency codes and acronyms
    for sym, word in SYMBOLS.items():
        t = t.replace(sym, word)
    t = re.sub(r"\b(" + "|".join(CODE_WORDS) + r")\b", lambda m: CODE_WORDS[m.group(1)], t)
    t = re.sub(r"\b([A-ZÆØÅ]{2,5})(?:'?(s))?\b", _acronym, t)
    t = re.sub(r"\b([A-ZÆØÅ][a-zæøå][A-ZÆØÅ])\b", lambda m: _spell(m.group(1)), t)      # KrF, UiO
    t = t.replace("/", " ")
    return keep_final_punct(text, clean_spaces(t))


def _espeak_form(words: str) -> str:
    w = _NUMBER_COMPOUND.sub(lambda m: f"{m.group(1)}-{'én' if m.group(2) == 'en' else m.group(2)}", words.lower())
    return _BYTE.sub("bajt", w)


class NorwegianG2P:
    """Callable like the misaki G2P classes: returns (phonemes, None)."""

    lang = "no"

    def __init__(self):
        self.espeak = Espeak("nb")

    def phonemize_normalized(self, text: str) -> str:
        pairs = chunk(text)
        if not pairs:
            return ""
        ph = self.espeak([_espeak_form(w) for w, _ in pairs])
        ps = join_chunks([_STJ.sub("ʃ", _LANG_SWITCH.sub("", p)) for p in ph], [p for _, p in pairs])
        return to_vocab(map_symbols(ps, list(SYMBOL_MAP)))

    def __call__(self, text: str):
        return self.phonemize_normalized(normalize(text)), None
