# The horn's sound effects

From 3 October 2026 the horn (the reward for the eleventh trip) plays a real recording for each ride instead of the voice saying "Tut tut!",
"Voff voff!" and so on; the pig, found inside the house, got its grunts on 5 October 2026. The taxi has none of its own: it honks like the car. All ten come from [Freesound](https://freesound.org), all under **Creative Commons 0** (public domain: free to use,
change and share, no attribution required; credited here all the same). Each licence was checked on the sound's own page on 3 October 2026 (the pig's on 5 October 2026).

| File (`dist/sounds/`) | Ride | Source | By | What it is |
|---|---|---|---|---|
| `horn-car.mp3` | Car | [Car horn beep beep two beeps honk honk](https://freesound.org/s/423990/) | AmishRob | A small car horn, two quick beeps ("tut tut") |
| `horn-cat.mp3` | Cat | [cat meow](https://freesound.org/s/110011/) | tuberatanka | A hungry cat meowing |
| `horn-dog.mp3` | Dog | [LBS_FX DOG Small Alert Bark001](https://freesound.org/s/163459/) | LittleBigSounds | A small dog, two alert barks ("voff voff") |
| `horn-duck.mp3` | Duck | [quack.wav](https://freesound.org/s/242664/) | Reitanna | One duck quack, played twice ("kvakk kvakk") |
| `horn-rocket.mp3` | Rocket | [tiny_rocket.wav](https://freesound.org/s/140726/) | j1987 | A small whistling firework rocket going up ("sjuuuu") |
| `horn-unicorn.mp3` | Unicorn | [horse neigh shortened.wav](https://freesound.org/s/269571/) | shadoWisp, from [Horse_Whinny.wav](https://freesound.org/s/149024/) by foxen10 | A horse's whinny |
| `horn-firetruck.mp3` | Fire engine | [German fire engine](https://freesound.org/s/465700/) | Breviceps | A fire engine's two-tone siren ("ba-bu, ba-bu"), as it passes |
| `horn-balloon.mp3` | Hot-air balloon | [Hot air balloon burner](https://freesound.org/s/778358/) | YannSauvin | A hot-air balloon's burner, one blast ("fffff") |
| `horn-trex.mp3` | T. rex | [DRAGON_ROAR.wav](https://freesound.org/s/85568/) | JoelAudio | A big beast's roar (no one has heard a T. rex; film dinosaurs are made the same way) |
| `horn-pig.mp3` | Pig | [Pig.ogg](https://freesound.org/s/536746/) | egomassive, cut from [A pig grunting, grumbling and falling asleep](https://freesound.org/s/158746/) by felix.blume | A large pig's grunts, the first two of three ("nøff nøff"); both sounds are CC0 |

## How they were chosen and made

- **Search**: Freesound's search with the licence filter set to Creative Commons 0, sorted by downloads, two or three searches a ride (for example
  "car horn honk", "cat meow", "duck quack", "firework whistle", "hot air balloon burner", "dinosaur roar"); 29 candidates were downloaded and
  compared by length, loudness envelope and description. One candidate (a car horn under CC BY) was left out to keep every file CC0.
- **The pig** (5 October 2026): searched "pig oink", "pig oink oink", "pig grunt", "pig snort" and "piglet" with the CC0 filter; 33 candidates were downloaded
  (the 128 kbit/s previews) and compared by length, loudness envelope, tags and description, and by spectrum (the pitch and the centre of the spectrum of the loud
  parts, to tell grunts from squeals). The ones with a bright spectrum (centre above 2.2 kHz, pitch 600 Hz and up) are squeals and were left out: the four
  "Pig" clips by qubodup are pitched-up remixes of an angry pig's squeal, and Jarred Gibb's "Grunt and Squeal" and "Multiple Snorts" are squeals and snorts of
  several pigs with long gaps. Left out for other reasons: "Angry Pig Oinking" (angry, 8 s), "Ugly Pig Voice" (a man doing a pig), "Pigs oinking" (a street in
  the background), "Pig grunts" (a toy pig; another with a piglet eating), the Hackney City Farm recording (22 s of breathing), the geese with the pigs, and
  Felix Blume's own recording (two minutes). Jarred Gibb's single grunts are one low growl each, with nothing to say "nøff nøff" twice. "Pig.ogg" by
  egomassive is a short cut from Felix Blume's recording: three clean, low grunts one after the other (the darkest spectrum of all, 1.6 kHz, and a pitch around
  300 Hz), no background and no squeal, so it sounds friendly rather than scary. The first two grunts were used.
- **The fire engine**: no recording of a Norwegian fire engine was found on Freesound (searches for Norway, Norwegian, Oslo); the European
  two-tone siren is the "ba-bu" children here know, so a German fire engine's was used.
- **Processing** (ffmpeg 7.0.2 static build and NumPy; not part of the game): Freesound's 128 kbit/s preview of each sound, cut to the part that
  is the sound (the second burner blast of the balloon recording, 12.6–14.7 s; the first 2.7 s of the fire engine; the two horn beeps, the two
  barks, the meow, the whinny, the whistle of the rocket, the roar), a short fade in and a longer fade out, mono, all brought to the same loudness
  (RMS −16 dBFS over the part that sounds, peaks at most −1 dBFS), encoded as MP3 at 96 kbit/s, 44.1 kHz. 0.5–2.7 s each, 170 KB together.
  The duck's quack is the same quack twice with 70 ms between. The pig's is 0.9 s and 11 KB: the first two grunts of Pig.ogg (0.04–0.90 s), a 15 ms fade in and
  a 250 ms fade out, RMS −16.4 dBFS over the part that sounds, peak −3.1 dBFS.
- **In the game** (`music.js`, `HORNS`; the taxi plays the car's): loaded and decoded with Web Audio from the start button's tap (iOS starts audio only after a gesture), played one
  at a time straight to the speakers, not through the music. While a clip is not loaded yet (or if it fails to load) the voice says the word as
  before. The sound button switches the horn off with everything else.
