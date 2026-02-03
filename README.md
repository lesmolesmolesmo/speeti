# ⚡ Speeti - Lieferdienst App

Blitzschnelle Lieferung in Münster! Eine moderne Flink-Style Lieferdienst-App.

## Features

### 🛒 Kunden-App
- Modernes, responsives Design
- Kategorien & Produktsuche
- Warenkorb mit Live-Updates
- Einfacher Checkout
- Bestellverfolgung in Echtzeit
- Chat mit Fahrer

### 🚗 Fahrer-App (in Entwicklung)
- Bestellungen annehmen
- Artikel picken
- Kunden-Chat
- Navigation

### ⚙️ Admin-Dashboard (in Entwicklung)
- Produkte verwalten
- Kategorien bearbeiten
- Bestellungen überwachen
- Fahrer verwalten
- Statistiken

## Tech Stack

- **Frontend:** React 18, Tailwind CSS, Framer Motion, Zustand
- **Backend:** Node.js, Express, Socket.io
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT

## Installation

```bash
# Dependencies installieren
npm install
cd backend && npm install
cd ../frontend && npm install

# Datenbank mit Beispieldaten füllen
cd backend && npm run seed

# Entwicklungsserver starten
cd .. && npm run dev
```

## Accounts

Nach dem Seeden:

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@speeti.de | admin123 |
| Fahrer | fahrer@speeti.de | fahrer123 |

## Projektstruktur

```
speeti/
├── backend/           # Express API
│   ├── server.js      # Hauptserver
│   ├── seed.js        # Datenbankseeding
│   └── speeti.db      # SQLite Datenbank
├── frontend/          # React App
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store.js   # Zustand State
│   │   └── App.jsx
│   └── index.html
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Aktueller User

### Produkte
- `GET /api/categories` - Alle Kategorien
- `GET /api/products` - Alle Produkte (mit Filter)
- `GET /api/products/:id` - Einzelnes Produkt

### Bestellungen
- `GET /api/orders` - Bestellungen des Users
- `POST /api/orders` - Neue Bestellung
- `GET /api/orders/:id` - Bestelldetails
- `PATCH /api/orders/:id/status` - Status ändern

### Adressen
- `GET /api/addresses` - Adressen des Users
- `POST /api/addresses` - Neue Adresse

## Farben

- **Primary:** Türkis (#14B8A6)
- **Accent:** Violet (#8B5CF6)

## Lizenz

MIT

---

Made with ❤️ für Münster
