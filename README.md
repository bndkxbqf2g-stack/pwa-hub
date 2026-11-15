# PWA Hub

PWA Hub ist eine eigenständige, installierbare Startseite für deine bereits vorhandenen PWAs. Jede App bleibt technisch unabhängig: Beim Öffnen wird ihre hinterlegte HTTP(S)-URL in einem neuen Tab gestartet; es gibt kein iframe und kein Backend.

## Lokal starten

Für Service Worker und Installierbarkeit muss die App über HTTP(S) geöffnet werden. Der enthaltene dependency-freie Devserver startet direkt mit Node:

```text
npm run dev
```

Danach `http://127.0.0.1:8080` im Browser öffnen. Alternativ kann jeder andere einfache statische HTTP-Server verwendet werden.

Die enthaltene Prüfung läuft ohne Installation zusätzlicher Pakete:

```text
npm run check
```

## Nutzung

- Apps mit Name, HTTP(S)-URL, Beschreibung, Kategorie und Symbol anlegen.
- Kacheln anklicken, um die jeweilige PWA in einem neuen Tab zu öffnen.
- Favoriten, Suche, Kategorie-Filter und Sortierung nutzen.
- Über Einstellungen die Einträge als JSON exportieren oder importieren.

Die App startet bewusst ohne erfundene Beispieldaten. Repositories und andere PWAs können manuell über ihre URL hinzugefügt oder gesammelt über den JSON-Import übernommen werden.

## Kostenlos veröffentlichen

Das Projekt besteht aus statischen Dateien und kann kostenlos über GitHub Pages veröffentlicht werden:

1. Repository zu GitHub pushen.
2. Unter **Settings → Pages** die Quelle **Deploy from a branch** wählen.
3. Den gewünschten Branch und als Ordner **/(root)** auswählen.
4. Nach dem Deployment die angezeigte Pages-URL öffnen.

Ein eigener Build-Schritt ist nicht nötig. Das Projekt enthält außerdem eine kleine GitHub-Actions-Prüfung, die die JavaScript-Syntax bei Pushes und Pull Requests kontrolliert.

## Daten und Einschränkungen

Die App speichert Einträge nur im `localStorage` des jeweiligen Browsers. Es gibt keine Anmeldung, kein Backend und keine automatische Synchronisierung zwischen Geräten oder Browsern. Für die Übertragung auf ein anderes Gerät bitte zuerst JSON exportieren und dort wieder importieren.

Beim Import werden ungültige Einträge verständlich gemeldet. Bereits vorhandene URLs werden nach einem Hinweis übersprungen; bestehende Einträge werden nicht still überschrieben.

