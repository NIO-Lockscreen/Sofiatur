// Norwegian phonemizer for the browser: the same espeak-ng calls as Piper's espeakbridge.c.
// Returns clauses as "phonemes\x1fterminator\x1fS|C\x1e" so JS can rebuild Piper's sentences.
#include <stdlib.h>
#include <string.h>
#include <espeak-ng/speak_lib.h>
#include <emscripten.h>

#define CLAUSE_INTONATION_FULL_STOP 0x00000000
#define CLAUSE_INTONATION_COMMA 0x00001000
#define CLAUSE_INTONATION_QUESTION 0x00002000
#define CLAUSE_INTONATION_EXCLAMATION 0x00003000
#define CLAUSE_TYPE_CLAUSE 0x00040000
#define CLAUSE_TYPE_SENTENCE 0x00080000
#define CLAUSE_PERIOD (40 | CLAUSE_INTONATION_FULL_STOP | CLAUSE_TYPE_SENTENCE)
#define CLAUSE_COMMA (20 | CLAUSE_INTONATION_COMMA | CLAUSE_TYPE_CLAUSE)
#define CLAUSE_QUESTION (40 | CLAUSE_INTONATION_QUESTION | CLAUSE_TYPE_SENTENCE)
#define CLAUSE_EXCLAMATION (45 | CLAUSE_INTONATION_EXCLAMATION | CLAUSE_TYPE_SENTENCE)
#define CLAUSE_COLON (30 | CLAUSE_INTONATION_FULL_STOP | CLAUSE_TYPE_CLAUSE)
#define CLAUSE_SEMICOLON (30 | CLAUSE_INTONATION_COMMA | CLAUSE_TYPE_CLAUSE)

static char *out = NULL;
static size_t cap = 0, len = 0;
static void put(const char *s) {
  size_t n = strlen(s);
  if (len + n + 1 > cap) { cap = (len + n + 1) * 2; out = realloc(out, cap); }
  memcpy(out + len, s, n); len += n; out[len] = 0;
}

EMSCRIPTEN_KEEPALIVE int ph_init(const char *voice) {
  if (espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, "/espeak-ng-data", 0) < 0) return -1;
  return espeak_SetVoiceByName(voice) == EE_OK ? 0 : -2;
}

EMSCRIPTEN_KEEPALIVE const char *ph_text(const char *text) {
  len = 0; put("");
  while (text != NULL) {
    int terminator = 0;
    const char *t = "";
    const char *ph = espeak_TextToPhonemesWithTerminator((const void **)&text, espeakCHARS_AUTO, espeakPHONEMES_IPA, &terminator);
    terminator &= 0x000FFFFF;
    if (terminator == CLAUSE_PERIOD) t = ".";
    else if (terminator == CLAUSE_QUESTION) t = "?";
    else if (terminator == CLAUSE_EXCLAMATION) t = "!";
    else if (terminator == CLAUSE_COMMA) t = ",";
    else if (terminator == CLAUSE_COLON) t = ":";
    else if (terminator == CLAUSE_SEMICOLON) t = ";";
    put(ph ? ph : ""); put("\x1f"); put(t); put("\x1f");
    put((terminator & CLAUSE_TYPE_SENTENCE) == CLAUSE_TYPE_SENTENCE ? "S" : "C"); put("\x1e");
  }
  return out;
}
