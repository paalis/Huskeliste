# Huskeliste

En mobilvennlig norsk huskeliste som lagrer alt lokalt i nettleserens IndexedDB. Appen har en enkel, regelstyrt hjelper og fungerer uten nett etter første besøk. Logger du inn med e-post, synkroniseres oppgavene med Supabase slik at de blir like på alle enhetene dine.

## Kom i gang

Du trenger bare en nyere versjon av Node.js. Det er ingen pakker å installere.

```bash
npm run dev
```

Åpne adressen som vises (vanligvis `http://localhost:4173`). Kjør testene med `npm test`.

## Supabase-synkronisering

Appen bruker Supabase-prosjektet **Huskeliste** (organisasjonen *Privat*). Tabellen `tasks` er beskrevet i `supabase/migrations/`, og radnivåsikkerhet (RLS) sørger for at hver bruker bare ser sine egne oppgaver.

Byggesteget leser to miljøvariabler og skriver dem til `src/config.js`:

- `SUPABASE_URL` – prosjektets API-adresse
- `SUPABASE_PUBLISHABLE_KEY` – den publiserbare nøkkelen (`sb_publishable_…`)

I GitHub Actions hentes de fra repository-secrets med samme navn. Lokalt kan du kjøre `SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… npm run dev`. Uten variablene virker appen som før, bare lokalt.

Innstillinger i Supabase-dashbordet (**Authentication → URL Configuration**):

- Sett **Site URL** til adressen på GitHub Pages, og legg den også til under **Redirect URLs** (og `http://localhost:4173/` for lokal utvikling).
- Vil du kunne logge inn med kode i stedet for lenke – nyttig for appen på Hjem-skjermen i iOS, som ikke deler innlogging med Safari – legger du `{{ .Token }}` inn i e-postmalen **Magic Link** under **Authentication → Emails**.

Sammenslåingen skjer per oppgave: den sist endrede versjonen vinner, og slettede oppgaver markeres med `deleted_at` slik at slettingen også når andre enheter. Endringer gjort uten nett sendes ved neste synkronisering.

## Publiser på GitHub Pages over HTTPS

1. Opprett et tomt repository på GitHub og push prosjektet dit.
2. Åpne **Settings → Pages** i repositoryet.
3. Velg **GitHub Actions** under **Build and deployment → Source**.
4. Åpne fanen **Actions**. Arbeidsflyten «Publiser på GitHub Pages» tester, bygger og publiserer automatisk ved hver push til `main` eller `work`.
5. Når jobben er grønn, vises HTTPS-adressen både i jobben og under **Settings → Pages**. Åpne den og kontroller at siden virker uten nett etter det første besøket.

Hvis prosjektet ennå ikke har en GitHub-remote, kjør kommandoene GitHub viser under «…or push an existing repository from the command line», for eksempel:

```bash
git remote add origin https://github.com/DITT-BRUKERNAVN/Huskeliste.git
git push -u origin work
```

Det følger med en ferdig GitHub Actions-konfigurasjon i `.github/workflows/pages.yml`; du trenger ikke laste opp `dist` manuelt.

Alle kildefilene, inkludert appikonet, er tekstfiler. Dermed kan endringene opprettes som en pull request også i nettbaserte utviklingsverktøy som ikke støtter binærfiler.

> Service workers og installasjon på mobil krever HTTPS, bortsett fra ved lokal utvikling på `localhost`.

## Legg appen på mobilen

**iPhone/iPad (Safari):** Åpne HTTPS-adressen i Safari, trykk Del, velg **Legg til på Hjem-skjerm**, og trykk **Legg til**.

**Android (Chrome):** Åpne HTTPS-adressen i Chrome, åpne menyen (⋮), velg **Installer app** eller **Legg til på startskjermen**, og bekreft.

## Bruk

- Legg til med den store **+**-knappen, eller skriv for eksempel «Legg til betale strøm i morgen høy prioritet».
- Trykk på mikrofonen ved meldingsfeltet og snakk, for eksempel «legg til ring tannlegen i morgen». Hjelperen svarer også med tale. Første gang ber nettleseren om tilgang til mikrofonen. Knappen vises bare i nettlesere som støtter talegjenkjenning (Safari og Chrome).
- Hjelperen forstår å legge til, finne, flytte, fullføre og slette. Ved flere treff ber den deg velge, og sletting krever bekreftelse.
- Åpne menyen **•••** for å eksportere eller importere en JSON-sikkerhetskopi.
- Under **•••** kan du logge inn med e-post for å synkronisere mellom enheter.
- Uten innlogging forblir oppgavene på enheten. Tømming av nettleserdata kan slette dem, så ta sikkerhetskopi jevnlig.

Bakgrunnsvarsler er med hensikt ikke implementert i denne første versjonen.
