import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Search, MessageCircle, Clock, Truck, CreditCard, Package, HelpCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    category: "Bestellung & Lieferung",
    icon: Truck,
    questions: [
      {
        q: "Wie schnell liefert ihr?",
        a: "Wir liefern in der Regel innerhalb von 15-20 Minuten nach Bestelleingang. Bei hohem Bestellaufkommen kann es etwas länger dauern – wir halten dich aber per App auf dem Laufenden!"
      },
      {
        q: "In welchen Gebieten liefert ihr?",
        a: "Aktuell liefern wir ausschließlich in Münster (PLZ 48xxx). Wir arbeiten daran, unser Liefergebiet zu erweitern!"
      },
      {
        q: "Gibt es einen Mindestbestellwert?",
        a: "Ja, der Mindestbestellwert beträgt 15€. Ab einem Bestellwert von 30€ ist die Lieferung kostenlos!"
      },
      {
        q: "Was kostet die Lieferung?",
        a: "Die Liefergebühr beträgt 2,99€. Ab 30€ Bestellwert liefern wir kostenlos! 🎉"
      },
      {
        q: "Kann ich eine Lieferzeit vorbestellen?",
        a: "Ja! Du kannst bei der Bestellung ein Zeitfenster für die Lieferung auswählen – perfekt für Partys oder wenn du erst später zu Hause bist."
      }
    ]
  },
  {
    category: "Bezahlung",
    icon: CreditCard,
    questions: [
      {
        q: "Welche Zahlungsmethoden akzeptiert ihr?",
        a: "Du kannst bei uns mit Kreditkarte, PayPal, Klarna, Apple Pay, Google Pay oder bar bei Lieferung bezahlen. Online-Zahlung wird empfohlen für eine schnellere Abwicklung."
      },
      {
        q: "Ist die Online-Zahlung sicher?",
        a: "Absolut! Wir nutzen Stripe als Zahlungsanbieter – einer der sichersten Zahlungsdienstleister weltweit. Deine Daten sind bei uns in besten Händen. 🔒"
      },
      {
        q: "Kann ich auch bar bezahlen?",
        a: "Ja, Barzahlung bei Lieferung ist möglich. Bitte halte den passenden Betrag bereit, da unsere Fahrer nur begrenzt Wechselgeld dabei haben."
      }
    ]
  },
  {
    category: "Produkte & Qualität",
    icon: Package,
    questions: [
      {
        q: "Woher kommen eure Produkte?",
        a: "Wir arbeiten mit lokalen Großhändlern und ausgewählten Lieferanten zusammen, um dir frische und qualitativ hochwertige Produkte zu liefern."
      },
      {
        q: "Was ist, wenn ein Produkt nicht verfügbar ist?",
        a: "Sollte ein Produkt nicht verfügbar sein, kontaktieren wir dich und bieten dir eine Alternative an. Du entscheidest, ob du das Ersatzprodukt möchtest oder nicht."
      },
      {
        q: "Sind die Produkte gekühlt?",
        a: "Ja! Kühlprodukte werden in speziellen Kühltaschen transportiert, damit alles frisch bei dir ankommt. 🧊"
      }
    ]
  },
  {
    category: "Probleme & Reklamationen",
    icon: HelpCircle,
    questions: [
      {
        q: "Was mache ich, wenn etwas mit meiner Bestellung nicht stimmt?",
        a: "Kontaktiere uns sofort über den Live-Chat oder per E-Mail an info@speeti.de. Wir finden eine Lösung – versprochen! Bei beschädigten oder falschen Produkten erstatten wir natürlich den Betrag."
      },
      {
        q: "Kann ich meine Bestellung stornieren?",
        a: "Solange deine Bestellung noch nicht in Bearbeitung ist, kannst du sie stornieren. Kontaktiere uns dafür schnellstmöglich über den Live-Chat."
      },
      {
        q: "Mein Fahrer findet mich nicht – was tun?",
        a: "Der Fahrer wird dich anrufen, wenn er dich nicht findet. Achte darauf, dass deine Telefonnummer korrekt ist und dein Handy nicht auf lautlos steht!"
      }
    ]
  },
  {
    category: "Konto & Datenschutz",
    icon: Shield,
    questions: [
      {
        q: "Muss ich ein Konto erstellen?",
        a: "Ja, für die Bestellung ist ein Konto erforderlich. So können wir deine Lieferadresse speichern und du hast Zugriff auf deine Bestellhistorie."
      },
      {
        q: "Wie kann ich mein Konto löschen?",
        a: "Schreibe uns eine E-Mail an info@speeti.de mit dem Betreff 'Kontolöschung'. Wir löschen dein Konto und alle zugehörigen Daten innerhalb von 48 Stunden."
      },
      {
        q: "Was passiert mit meinen Daten?",
        a: "Deine Daten werden ausschließlich für die Bestellabwicklung verwendet und nicht an Dritte weitergegeben. Mehr dazu in unserer Datenschutzerklärung."
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <ChevronDown 
          size={20} 
          className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} 
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-gray-600 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredFaqs = searchQuery
    ? faqs.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.questions.length > 0)
    : faqs;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-rose-500 to-pink-600 text-white pt-12 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6">
            <ArrowLeft size={20} />
            Zurück zum Shop
          </Link>
          <h1 className="text-3xl font-bold mb-2">❓ Häufige Fragen</h1>
          <p className="text-white/80">Hier findest du Antworten auf die wichtigsten Fragen</p>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-2">
          <div className="flex items-center gap-3 px-4">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Fragen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {filteredFaqs.map((category) => (
          <div key={category.category} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 flex items-center gap-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <category.icon size={20} className="text-rose-500" />
              </div>
              <h2 className="font-bold text-gray-900">{category.category}</h2>
            </div>
            <div className="px-6">
              {category.questions.map((item, i) => (
                <FAQItem key={i} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>
        ))}
        
        {filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Keine Fragen gefunden für "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Contact CTA */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 text-white text-center">
          <MessageCircle size={32} className="mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">Noch Fragen?</h3>
          <p className="text-white/80 mb-4">Unser Support-Team hilft dir gerne weiter!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/support" 
              className="bg-white text-rose-500 px-6 py-3 rounded-xl font-semibold hover:bg-rose-50 transition-colors"
            >
              💬 Live-Chat starten
            </Link>
            <a 
              href="mailto:info@speeti.de"
              className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              📧 E-Mail schreiben
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
