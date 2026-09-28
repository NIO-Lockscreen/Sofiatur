# Sofias biltur – GitHub og Vercel

Eksportert 28. september 2026. Hele spillet, kartet, terrenget og 3D-modellene ligger i `dist/`. Ingen API-nøkler eller miljøvariabler er nødvendige for å spille.

## Publiser

1. Pakk ut ZIP-filen på PC-en.
2. Opprett et nytt repository på GitHub.
3. Last opp **innholdet** i mappen `sofias-biltur`, inkludert hele `dist`-mappen. `vercel.json` og `package.json` skal ligge på øverste nivå i repositoryet. Ikke last opp selve ZIP-filen.
4. I Vercel velger du **Add New → Project** og importerer GitHub-repositoryet.
5. Behold **Root Directory** som prosjektets rot. Vercel-oppsettet følger med i `vercel.json`: Framework **Other**, ingen installasjon eller build, Output Directory **dist**.
6. Trykk **Deploy**, og åpne lenken fra Vercel på iPad.

Hvis du la hele `sofias-biltur`-mappen inn i repositoryet, må Root Directory settes til `sofias-biltur`.

## Videre endringer

Spillets redigerbare JavaScript, CSS, HTML og ferdige kartdata ligger i `dist/`. Denne mappen er kildekoden til det statiske spillet og skal være med i Git. Vercel publiserer endringene når du pusher til produksjonsgrenen.

For lokal utvikling: installer en oppdatert Node.js LTS, kjør `npm ci`, deretter `npm run dev`, og åpne adressen som vises. Ikke dobbeltklikk `index.html`: spillet laster kartet med fetch og trenger en webserver.

README.md inneholder dokumentasjon om kartkilder, modellene og testene. `docs/` inneholder referansene brukt til bygningene. Kart- og terrengdata er ferdig inkludert; Python-skriptene trengs bare ved eventuell regenerering av kartgrunnlaget.

Denne pakken er kontrollert lokalt, men er ikke deployet til din Vercel-konto.
