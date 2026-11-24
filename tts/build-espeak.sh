#!/usr/bin/env bash
# Bygger den norske fonemiseringen (espeak-ng -> WebAssembly) som Piper-stemmen trenger i nettleseren.
# Resultat: tts/espeak-nb.mjs, tts/espeak-nb.wasm og tts/espeak-nb.data (bare norske data, ca. 1 MB).
# Krever: git, cmake, make, en C-kompilator, Python 3 og Emscripten (emsdk) i PATH (source emsdk_env.sh).
# Samme espeak-ng-versjon som Piper 1.8 (piper1-gpl) bruker, så fonemene blir like som stemmen ble trent med.
set -euo pipefail
ESPEAK_COMMIT=724808c   # piper1-gpl CMakeLists.txt: GIT_TAG 724808c (2026-Apr-06)
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-$(mktemp -d)}"; mkdir -p "$WORK"
cd "$WORK"
[ -d espeak-ng ] || git clone -q https://github.com/espeak-ng/espeak-ng
git -C espeak-ng checkout -q "$ESPEAK_COMMIT"
# 1) Vanlig bygg for å kompilere fonemtabeller og den norske ordboka (med spillets uttaleliste no_listx).
cmake -S espeak-ng -B native -DCMAKE_BUILD_TYPE=Release -DUSE_ASYNC=OFF -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF -DENABLE_TESTS=OFF >/dev/null
cmake --build native -j4 --target data >/dev/null
mkdir -p dict && cp espeak-ng/dictsource/no_list espeak-ng/dictsource/no_rules "$HERE/src/no_listx" dict/
(cd dict && "$WORK/native/src/espeak-ng" --path="$WORK/native" --compile=nb)
D="$WORK/native/espeak-ng-data"; P="$WORK/pkg/espeak-ng-data"
rm -rf "$WORK/pkg" && mkdir -p "$P/lang/gmq"
cp "$D/phontab" "$D/phonindex" "$D/phondata" "$D/intonations" "$D/no_dict" "$P/" && cp "$D/lang/gmq/nb" "$P/lang/gmq/"
# 2) Biblioteket til WebAssembly. Emscripten har wint_t=int, ucd-tools vil ha unsigned.
emcmake cmake -S espeak-ng -B wasm -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DCOMPILE_INTONATIONS=OFF -DENABLE_TESTS=OFF \
  -DUSE_ASYNC=OFF -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF -DUSE_KLATT=OFF -DUSE_SPEECHPLAYER=OFF -DESPEAK_COMPAT=OFF \
  "-DCMAKE_C_FLAGS=-Oz -Wno-builtin-macro-redefined -U__WINT_TYPE__ -D__WINT_TYPE__=unsigned -D_FILE_OFFSET_BITS=64 -I$WORK/espeak-ng/src/ucd-tools/src/include" >/dev/null
emmake make -C wasm -j4 espeak-ng ucd >/dev/null
# 3) Bro (samme kall som Pipers espeakbridge.c) + data pakket inn.
cd "$WORK/pkg"
emcc -Oz "$HERE/src/bridge.c" "$WORK/wasm/src/libespeak-ng/libespeak-ng.a" "$WORK/wasm/src/ucd-tools/libucd.a" -I"$WORK/espeak-ng/src/include" \
  -o "$HERE/espeak-nb.mjs" -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createEspeak -sENVIRONMENT=web,worker,node \
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=4MB -sSTACK_SIZE=256KB -sFILESYSTEM=1 -sFORCE_FILESYSTEM=1 \
  -sEXPORTED_FUNCTIONS=_ph_init,_ph_text,_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,UTF8ToString,stringToNewUTF8 \
  -sINCOMING_MODULE_JS_API=locateFile,print,printErr,wasmBinary,getPreloadedPackage \
  --preload-file espeak-ng-data@/espeak-ng-data
echo "Ferdig: $(ls -la "$HERE"/espeak-nb.* | awk '{print $5, $9}')"
