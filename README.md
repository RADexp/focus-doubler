# Focus Doubler

Sesje skupienia z regularnymi check-inami. Aplikacja Next.js (App Router) w całości
statyczna — **wszystkie dane zostają w `localStorage` przeglądarki**, nie ma backendu,
bazy danych ani żadnego ruchu sieciowego po załadowaniu strony. Działa też jako PWA:
można ją zainstalować jako osobne okienko na desktopie i jako aplikację na telefonie,
a po pierwszym wejściu chodzi offline.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja startuje na http://localhost:3000

## Deploy na Vercel

Vercel wykrywa Next.js automatycznie — nie trzeba nic konfigurować, nie ma zmiennych
środowiskowych.

1. Wrzuć katalog na GitHub (`git init && git add . && git commit -m "init"`, potem push).
2. Na vercel.com → **Add New → Project** → wybierz repo → **Deploy**.

Albo prosto z terminala:

```bash
npx vercel --prod
```

## Powiadomienia systemowe

Dzwonek 🔔 w nagłówku włącza powiadomienia — pierwsze kliknięcie prosi przeglądarkę
o zgodę. Powiadomienie leci przy check-inie i na koniec sesji, ale **tylko gdy okno
aplikacji nie jest aktywne** (`document.hasFocus()`), więc nie dubluje modala, który
i tak masz przed oczami. Wysyłamy je przez service workera — na iOS to jedyna działająca
droga, a na desktopie dzięki temu klik w powiadomienie przywraca okno aplikacji.

Wymagania: HTTPS (Vercel) albo `localhost`. Na iPhonie powiadomienia działają dopiero
po dodaniu aplikacji do ekranu głównego (iOS 16.4+) — w zwykłym Safari nie zadziałają.

## Instalacja jako aplikacja

- **Desktop (Chrome/Edge)** — ikona instalacji w pasku adresu albo menu → „Zainstaluj
  Focus Doubler". Dostajesz osobne okno bez paska przeglądarki, można je zmniejszyć
  do wąskiego paska z timerem; layout schodzi wtedy w tryb kompaktowy.
- **iPhone (Safari)** — Udostępnij → „Dodaj do ekranu początkowego".
- **Android (Chrome)** — menu → „Zainstaluj aplikację".

## Jak to działa

- **Setup** — zadanie, długość sesji (30/45/60 min), częstotliwość check-inów (10/15/20 min).
- **Sesja** — pierścień odlicza czas; co N minut wyskakuje check-in (timer stoi, gra cichy sygnał).
- **Check-in** — co zrobione / nad czym teraz / notatka + ocena 👍 skupiony albo 👎 rozproszony.
- **Podsumowanie** — bilans 👍/👎 i pełny dziennik; sesja ląduje w historii pogrupowanej po dniach.

## Dane

| Klucz w `localStorage` | Zawartość |
| --- | --- |
| `focus-doubler:sessions` | historia zakończonych sesji |
| `focus-doubler:active` | sesja w trakcie (przeżywa odświeżenie strony) |
| `focus-doubler:sound` | czy dźwięk check-inu jest włączony |
| `focus-doubler:notify` | czy powiadomienia systemowe są włączone |

Dane są przypisane do konkretnej przeglądarki i domeny — nie synchronizują się między
urządzeniami. W panelu „Historia sesji" są przyciski **Eksport** (pobiera JSON) i
**Import** (dokłada sesje z pliku, pomijając duplikaty po `id`) — to jedyna kopia zapasowa.

## Struktura

```
app/          layout, strona, style globalne, manifest PWA, ikona
components/   App (logika sesji) + ekrany i widoki
lib/          typy, storage (localStorage), czas, dźwięk, powiadomienia + service worker
public/       sw.js (cache offline + klik w powiadomienie), ikony PNG
scripts/      make-icons.mjs — generuje ikony PWA (node scripts/make-icons.mjs)
```

Timer liczy różnicę realnego czasu (`Date.now()`), a nie tyknięcia interwału, więc
uśpiona/przyduszona karta przeglądarki nie rozjeżdża odliczania.

Service worker rejestruje się **tylko w buildzie produkcyjnym** — w `npm run dev`
cache'owałby zasoby HMR. Żeby przetestować offline i powiadomienia lokalnie:

```bash
npm run build && npm start
```

Po zmianie zawartości `public/sw.js` podbij `CACHE` (`focus-doubler-v1` → `-v2`),
żeby stare pliki wyleciały z cache u osób, które już aplikację otworzyły.
