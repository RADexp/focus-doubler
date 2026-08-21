# Do wrócenia: docelowy stack techniczny

**Status:** odłożone świadomie. Nie blokuje niczego, ale nie zamykamy tematu.
**Data zapisu:** 2026-08-21

## Decyzja na teraz

Zostajemy na Next.js + React + TypeScript. Priorytetem jest mieć działającą
aplikację szybko i móc ją swobodnie rozwijać, zmieniać i przeprojektowywać.
Dopiero jak zobaczymy, czym to się okaże na końcu, wrócimy do pytania o stack.

## Skąd w ogóle temat

Next.js został wybrany domyślnie, nie po analizie — padło „deploy na Vercel",
a Next to framework Vercela. Wyjściowy artefakt był jednym plikiem HTML.

## Rachunek (pomiar z 2026-08-21)

| | artefakt HTML | obecna aplikacja |
| --- | --- | --- |
| transfer przy pierwszym wejściu | 8,5 kB (gzip) | ~148 kB (gzip) |
| zależności | 0 | ~300 MB `node_modules` |
| build | brak | tak |

Z tych ~148 kB gros to React + runtime Next.js. **Nie używamy ani jednej funkcji,
za którą się w nim płaci rozmiarem:** brak routingu, brak SSR (strona jest w 100%
statyczna), brak API routes, brak optymalizacji obrazków, brak potrzeb SEO.

Kontrargument: przy aplikacji lokalnej, cache'owanej przez service workera, te
148 kB pobiera się raz. Realnym zyskiem z odchudzenia nie byłaby szybkość, tylko
prostota — mniej zależności, szybszy build, mniej rzeczy do aktualizowania.

## Opcje na później

1. **Czysty HTML/CSS/JS, jeden plik** — Vercel wdroży bez konfiguracji, zero builda.
   Powrót do ręcznego DOM-u i brak typów.
2. **Vite + vanilla TS** — build i typy zostają, framework znika. Kilkanaście kB.
3. **Vite + Preact** ← *rekomendacja* — ergonomia Reacta (komponenty, hooki, kod
   prawie 1:1), ale ~4 kB zamiast ~100. Szacunek: ~godzina pracy.

## Co ułatwia ewentualny port

Cała logika siedzi w `lib/` i nie zna Reacta — typy, `localStorage`, czas, dźwięk
check-inu, powiadomienia i rejestracja service workera. Warstwa React to tylko
`components/`. Trzymajmy ten podział przy dalszym rozwoju, bo to on decyduje,
czy zmiana stacku jest godziną, czy tygodniem.

## Kiedy wrócić

Kiedy przestaniemy aktywnie przeprojektowywać i będzie wiadomo, czym aplikacja
docelowo jest. Sygnały, że warto zająć się tym wcześniej:
- build albo `npm install` zaczyna irytować,
- wchodzimy w rzeczy, które źle się dogadują z SSR/hydracją,
- pojawia się potrzeba, której Next akurat *nie* obsługuje lepiej niż alternatywy.

Sygnał w drugą stronę — **zostajemy na Next** — jeśli dojdzie routing, wiele
widoków, backend, synchronizacja między urządzeniami albo cokolwiek serwerowego.
