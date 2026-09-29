# Huskeliste

En mobilvennlig norsk huskeliste som lagrer alt lokalt i nettleserens IndexedDB. Appen har en enkel, regelstyrt hjelper, fungerer uten nett etter første besøk og krever verken konto, API-nøkkel eller serverdatabase.

## Kom i gang

Du trenger bare en nyere versjon av Node.js. Det er ingen pakker å installere.

```bash
npm run dev
```

Åpne adressen som vises (vanligvis `http://localhost:4173`). Kjør testene med `npm test`.

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
- Hjelperen forstår å legge til, finne, flytte, fullføre og slette. Ved flere treff ber den deg velge, og sletting krever bekreftelse.
- Åpne menyen **•••** for å eksportere eller importere en JSON-sikkerhetskopi.
- Oppgaver forblir på enheten. Tømming av nettleserdata kan slette dem, så ta sikkerhetskopi jevnlig.

Bakgrunnsvarsler er med hensikt ikke implementert i denne første versjonen.
