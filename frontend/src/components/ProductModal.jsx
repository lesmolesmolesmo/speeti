import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Tag, Box, Barcode, Scale, Image, Loader2, Sparkles, Check, ChevronRight, Zap, Upload, Link, Wand2 } from 'lucide-react';
import { api } from '../store';

// Known brand database for intelligent extraction
const KNOWN_BRANDS = {
  'coca-cola': 'Coca-Cola', 'coca cola': 'Coca-Cola', 'coke': 'Coca-Cola',
  'pepsi': 'Pepsi', 'fanta': 'Fanta', 'sprite': 'Sprite', 'mezzo mix': 'Mezzo Mix',
  'red bull': 'Red Bull', 'monster': 'Monster', 'rockstar': 'Rockstar',
  'haribo': 'Haribo', 'milka': 'Milka', 'lindt': 'Lindt', 'ritter sport': 'Ritter Sport',
  'kinder': 'Kinder', 'ferrero': 'Ferrero', 'nutella': 'Ferrero',
  'knorr': 'Knorr', 'maggi': 'Maggi', 'heinz': 'Heinz', 'barilla': 'Barilla',
  'dr. oetker': 'Dr. Oetker', 'dr oetker': 'Dr. Oetker', 'oetker': 'Dr. Oetker',
  'nestlé': 'Nestlé', 'nestle': 'Nestlé', 'nescafé': 'Nescafé', 'nescafe': 'Nescafé',
  'pringles': 'Pringles', 'lays': "Lay's", "lay's": "Lay's", 'lorenz': 'Lorenz',
  'oral-b': 'Oral-B', 'oral b': 'Oral-B', 'colgate': 'Colgate', 'elmex': 'Elmex', 'sensodyne': 'Sensodyne',
  'oreo': 'Oreo', 'leibniz': 'Leibniz', 'bahlsen': 'Bahlsen',
  'müller': 'Müller', 'muller': 'Müller', 'weihenstephan': 'Weihenstephan',
  'landliebe': 'Landliebe', 'alpro': 'Alpro', 'oatly': 'Oatly',
  'volvic': 'Volvic', 'evian': 'Evian', 'gerolsteiner': 'Gerolsteiner',
  'schweppes': 'Schweppes', 'bionade': 'Bionade', 'fritz-kola': 'Fritz-Kola', 'fritz kola': 'Fritz-Kola',
  'beck\'s': "Beck's", 'becks': "Beck's", 'krombacher': 'Krombacher',
  'warsteiner': 'Warsteiner', 'paulaner': 'Paulaner', 'erdinger': 'Erdinger',
  'jägermeister': 'Jägermeister', 'absolut': 'Absolut', 'bacardi': 'Bacardi',
  'lavazza': 'Lavazza', 'jacobs': 'Jacobs', 'tchibo': 'Tchibo', 'dallmayr': 'Dallmayr',
  'lipton': 'Lipton', 'teekanne': 'Teekanne', 'twinings': 'Twinings',
  'ben & jerry': "Ben & Jerry's", 'häagen-dazs': 'Häagen-Dazs', 'magnum': 'Magnum',
  'iglo': 'Iglo', 'frosta': 'Frosta', 'wagner': 'Wagner',
  'katjes': 'Katjes', 'hitschler': 'Hitschler', 'trolli': 'Trolli', 'maoam': 'Maoam',
  'kellogs': "Kellogg's", 'kelloggs': "Kellogg's",
  'hipp': 'HiPP', 'alete': 'Alete', 'pampers': 'Pampers', 'penaten': 'Penaten',
  'persil': 'Persil', 'ariel': 'Ariel', 'fairy': 'Fairy', 'pril': 'Pril', 'spee': 'Spee',
  'nivea': 'NIVEA', 'dove': 'Dove', 'axe': 'AXE', 'gillette': 'Gillette', 'venus': 'Venus',
  'always': 'Always', 'tampax': 'Tampax', 'ob': 'o.b.', 'carefree': 'Carefree',
  'duracell': 'Duracell', 'energizer': 'Energizer', 'varta': 'Varta',
  'tempo': 'Tempo', 'zewa': 'Zewa', 'hakle': 'Hakle',
  'finish': 'Finish', 'somat': 'Somat', 'calgon': 'Calgon',
  'frosch': 'Frosch', 'sagrotan': 'Sagrotan', 'cillit': 'Cillit Bang',
  'head & shoulders': 'Head & Shoulders', 'pantene': 'Pantene', 'schauma': 'Schauma', 'garnier': 'Garnier',
  'loreal': "L'Oréal", "l'oreal": "L'Oréal", 'maybelline': 'Maybelline',
  'whiskas': 'Whiskas', 'pedigree': 'Pedigree', 'felix': 'Felix', 'sheba': 'Sheba',
  'melitta': 'Melitta', 'tassimo': 'Tassimo', 'senseo': 'Senseo', 'dolce gusto': 'Dolce Gusto'
};

// Category suggestion mappings with keywords - MASSIVELY EXPANDED
const CATEGORY_MAPPINGS = [
  // GETRÄNKE
  { keywords: ['cola', 'coke', 'coca', 'pepsi', 'fanta', 'sprite', 'mezzo', 'schweppes', 'limonade', 'limo', 'softdrink', 'soda', '7up', 'dr pepper', 'fritz', 'bluna', 'orangina', 'bitter lemon', 'tonic', 'ginger ale', 'afri cola', 'vita cola', 'club mate', 'spezi'], match: 'softdrink', score: 15 },
  { keywords: ['energy', 'energie', 'red bull', 'monster', 'rockstar', 'energydrink', 'power', 'effect', 'relentless', 'burn', 'booster'], match: 'energy', score: 15 },
  { keywords: ['water', 'wasser', 'mineralwasser', 'sprudel', 'still', 'medium', 'volvic', 'evian', 'gerolsteiner', 'vittel', 'spa', 'apollinaris', 'selters', 'rhodius', 'vilsa'], match: 'wasser', score: 12 },
  { keywords: ['juice', 'saft', 'säfte', 'smoothie', 'nektar', 'orangensaft', 'apfelsaft', 'multivitamin', 'traubensaft', 'ananassaft', 'tomatensaft', 'karottensaft', 'direktsaft', 'fruchtsaft', 'gemüsesaft', 'hohes c', 'granini', 'valensina'], match: 'saft', score: 12 },
  { keywords: ['beer', 'bier', 'pils', 'weizen', 'lager', 'radler', 'helles', 'dunkel', 'krombacher', 'warsteiner', 'becks', 'paulaner', 'bitburger', 'veltins', 'jever', 'astra', 'radeberger', 'köstritzer', 'augustiner', 'weihenstephaner', 'franziskaner', 'alkoholfrei'], match: 'bier', score: 15 },
  { keywords: ['wine', 'wein', 'rotwein', 'weißwein', 'rosé', 'sekt', 'prosecco', 'champagner', 'riesling', 'merlot', 'chardonnay', 'cabernet', 'spätburgunder', 'grauburgunder', 'sauvignon', 'dornfelder', 'glühwein', 'sangria'], match: 'wein', score: 15 },
  { keywords: ['spirits', 'spirituosen', 'vodka', 'whisky', 'whiskey', 'rum', 'gin', 'likör', 'schnaps', 'jägermeister', 'bacardi', 'havana', 'captain morgan', 'absolut', 'smirnoff', 'gordons', 'bombay', 'hendricks', 'baileys', 'amaretto', 'ouzo', 'tequila', 'cognac', 'brandy', 'grappa', 'obstler', 'korn', 'wodka'], match: 'spirit', score: 15 },
  { keywords: ['coffee', 'kaffee', 'espresso', 'cappuccino', 'latte', 'lavazza', 'jacobs', 'tchibo', 'dallmayr', 'nescafe', 'melitta', 'senseo', 'tassimo', 'dolce gusto', 'kaffeebohnen', 'filterkaffee', 'instantkaffee', 'mokka', 'crema', 'lungo', 'ristretto', 'kaffeepads', 'kaffeekapseln'], match: 'kaffee', score: 12 },
  { keywords: ['tea', 'tee', 'eistee', 'ice tea', 'lipton', 'teekanne', 'grüntee', 'schwarztee', 'kräutertee', 'pfefferminztee', 'kamillentee', 'früchtetee', 'rooibos', 'chai', 'matcha', 'teebeutel', 'twinings', 'milford'], match: 'tee', score: 12 },
  
  // MILCHPRODUKTE
  { keywords: ['milk', 'milch', 'vollmilch', 'fettarm', 'laktosefrei', 'h-milch', 'frischmilch', 'weidemilch', 'biomilch', 'hafermilch', 'sojamilch', 'mandelmilch', 'kokosmilch', 'reismilch', 'buttermilch', 'kakao', 'milchmix', 'trinkschokolade'], match: 'milch', score: 12 },
  { keywords: ['cheese', 'käse', 'gouda', 'emmentaler', 'cheddar', 'mozzarella', 'parmesan', 'frischkäse', 'scheibletten', 'edamer', 'tilsiter', 'butterkäse', 'bergkäse', 'camembert', 'brie', 'feta', 'hirtenkäse', 'schafskäse', 'ziegenkäse', 'reibekäse', 'streukäse', 'schmelzkäse', 'philadelphia', 'bresso'], match: 'milch', score: 12 },
  { keywords: ['yogurt', 'joghurt', 'quark', 'skyr', 'pudding', 'sahne', 'cream', 'schmand', 'creme fraiche', 'saure sahne', 'schlagsahne', 'kochsahne', 'kaffeesahne', 'mascarpone', 'ricotta', 'hüttenkäse', 'fruchtjoghurt', 'naturjoghurt', 'griechisch'], match: 'milch', score: 10 },
  { keywords: ['butter', 'margarine', 'rama', 'lätta', 'becel', 'sanella', 'butterschmalz', 'pflanzenfett'], match: 'milch', score: 10 },
  
  // FLEISCH & WURST
  { keywords: ['meat', 'fleisch', 'wurst', 'sausage', 'schinken', 'ham', 'bacon', 'speck', 'salami', 'aufschnitt', 'hähnchen', 'chicken', 'rind', 'schwein', 'pute', 'truthahn', 'ente', 'lamm', 'kalb', 'hackfleisch', 'gehacktes', 'steak', 'schnitzel', 'filet', 'braten', 'gulasch', 'geschnetzeltes', 'bratwurst', 'wiener', 'bockwurst', 'leberwurst', 'teewurst', 'mortadella', 'lyoner', 'bierschinken', 'kochschinken', 'räucherschinken', 'serrano', 'prosciutto', 'chorizo', 'pepperoni'], match: 'fleisch', score: 12 },
  
  // BROT & BACKWAREN
  { keywords: ['bread', 'brot', 'brötchen', 'toast', 'semmel', 'croissant', 'baguette', 'vollkorn', 'ciabatta', 'roggenbrot', 'weißbrot', 'schwarzbrot', 'pumpernickel', 'knäckebrot', 'toastbrot', 'sandwichbrot', 'brezn', 'laugengebäck', 'hörnchen', 'brioche', 'kuchen', 'torte', 'muffin', 'donut', 'berliner', 'krapfen'], match: 'brot', score: 12 },
  
  // NUDELN & REIS
  { keywords: ['pasta', 'nudel', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'linguine', 'lasagne', 'barilla', 'farfalle', 'rigatoni', 'tortellini', 'ravioli', 'gnocchi', 'makkaroni', 'bandnudeln', 'spätzle', 'maultaschen', 'cannelloni'], match: 'nudel', score: 12 },
  { keywords: ['rice', 'reis', 'risotto', 'basmati', 'jasmin', 'langkorn', 'milchreis', 'wildreis', 'naturreis', 'parboiled', 'sushi reis', 'klebreis', 'vollkornreis'], match: 'reis', score: 12 },
  
  // SNACKS
  { keywords: ['chips', 'crisps', 'kartoffelchips', 'pringles', 'lays', 'crunchips', 'nachos', 'tortilla', 'doritos', 'cheetos', 'flips', 'erdnussflips', 'stapelchips', 'kesselchips', 'gemüsechips'], match: 'chips', score: 15 },
  { keywords: ['snack', 'cracker', 'popcorn', 'pretzel', 'brezel', 'knabber', 'salzstangen', 'erdnüsse', 'nüsse', 'cashew', 'mandeln', 'walnüsse', 'haselnüsse', 'pistazien', 'studentenfutter', 'nussmix', 'tuc', 'ritz', 'grissini', 'snackbar', 'müsliriegel', 'fruchtriegel'], match: 'chips', score: 10 },
  
  // SÜSSWAREN
  { keywords: ['chocolate', 'schoko', 'schokolade', 'praline', 'riegel', 'milka', 'lindt', 'kinder', 'kakao', 'ritter sport', 'toblerone', 'twix', 'snickers', 'mars', 'bounty', 'kitkat', 'duplo', 'hanuta', 'bueno', 'raffaello', 'ferrero', 'rocher', 'merci', 'mon cheri', 'schokoriegel', 'tafel', 'vollmilch', 'zartbitter', 'weiße schokolade', 'nougat', 'trüffel'], match: 'schokolade', score: 15 },
  { keywords: ['candy', 'süßigkeit', 'bonbon', 'gummi', 'haribo', 'weingummi', 'lakritz', 'gummibär', 'fruchtgummi', 'katjes', 'maoam', 'trolli', 'nimm2', 'lutscher', 'lollipop', 'kaubonbon', 'karamell', 'toffee', 'drops', 'pastillen', 'fishermans', 'tic tac', 'mentos', 'skittles', 'mms', 'smarties', 'jelly beans', 'marshmallow', 'schaumzucker'], match: 'süß', score: 15 },
  { keywords: ['cookie', 'keks', 'biscuit', 'waffel', 'oreo', 'leibniz', 'bahlsen', 'prinzen', 'butterkeks', 'doppelkeks', 'schokokeks', 'haferkeks', 'vollkornkeks', 'spekulatius', 'lebkuchen', 'zimtstern', 'spritzgebäck', 'löffelbiskuit', 'biskuit', 'digestive', 'shortbread'], match: 'keks', score: 12 },
  { keywords: ['ice cream', 'eis', 'gelato', 'magnum', 'häagen', 'ben & jerry', 'eiscreme', 'sorbet', 'wassereis', 'stieleis', 'hörnchen', 'eiskonfekt', 'softeis', 'frozen yogurt', 'langnese', 'cornetto', 'nogger', 'flutschfinger', 'calippo', 'solero', 'cremissimo', 'carte dor'], match: 'eis', score: 15 },
  
  // FRÜHSTÜCK & MÜSLI
  { keywords: ['cereal', 'müsli', 'cornflakes', 'haferflocken', 'oat', 'frühstück', 'kellogs', 'cerealien', 'granola', 'crunchy', 'smacks', 'frosties', 'choco pops', 'cini minis', 'honey loops', 'special k', 'fitness', 'vitalis', 'knusperflakes', 'porridge', 'overnight oats', 'weetabix', 'nesquik'], match: 'frühstück', score: 12 },
  { keywords: ['marmelade', 'konfitüre', 'gelee', 'honig', 'nutella', 'nussnougat', 'schokocreme', 'erdnussbutter', 'aufstrich', 'brotaufstrich', 'sirup', 'ahornsirup', 'agavendicksaft', 'rübensirup'], match: 'frühstück', score: 10 },
  
  // SOSSEN & GEWÜRZE
  { keywords: ['sauce', 'soße', 'ketchup', 'mayo', 'mayonnaise', 'senf', 'mustard', 'dressing', 'heinz', 'dip', 'bbq', 'grill', 'currysauce', 'sojasauce', 'worcester', 'tabasco', 'sriracha', 'chilisauce', 'tomatensauce', 'pesto', 'hollandaise', 'béarnaise', 'remoulade', 'aioli', 'tzatziki', 'hummus', 'guacamole', 'salsa'], match: 'sauce', score: 12 },
  { keywords: ['spice', 'gewürz', 'herbs', 'kräuter', 'salz', 'pfeffer', 'curry', 'paprika', 'oregano', 'basilikum', 'thymian', 'rosmarin', 'petersilie', 'schnittlauch', 'dill', 'koriander', 'kreuzkümmel', 'kurkuma', 'ingwer', 'zimt', 'muskat', 'nelken', 'vanille', 'chili', 'knoblauch', 'zwiebel', 'gewürzmischung', 'brühe', 'fond', 'bouillon', 'maggi', 'knorr'], match: 'gewürz', score: 10 },
  { keywords: ['oil', 'öl', 'olivenöl', 'sonnenblumenöl', 'rapsöl', 'speiseöl', 'kokosöl', 'sesamöl', 'walnussöl', 'leinöl', 'traubenkernöl', 'erdnussöl', 'maiskeimöl', 'kürbiskernöl', 'bratöl', 'frittieröl'], match: 'öl', score: 10 },
  { keywords: ['vinegar', 'essig', 'balsamico', 'apfelessig', 'weißweinessig', 'rotweinessig', 'sherryessig', 'reisessig', 'branntweinessig'], match: 'essig', score: 10 },
  
  // KONSERVEN & FERTIGGERICHTE
  { keywords: ['canned', 'konserve', 'dose', 'mais', 'bohnen', 'erbsen', 'thunfisch', 'tomaten gehackt', 'passierte tomaten', 'tomatenmark', 'ananas', 'mandarinen', 'pfirsich', 'birne', 'kidney', 'kichererbsen', 'linsen', 'champignons', 'pilze', 'oliven', 'gewürzgurken', 'cornichons', 'sauerkraut', 'rotkohl', 'sardinen', 'hering', 'makrele', 'muscheln', 'suppe'], match: 'konserve', score: 10 },
  { keywords: ['pizza', 'tiefkühlpizza', 'wagner', 'ristorante', 'dr oetker pizza', 'gustavo', 'salami pizza', 'margherita', 'hawaii', 'quattro', 'steinofen'], match: 'pizza', score: 15 },
  { keywords: ['frozen', 'tiefkühl', 'tk', 'tiefgefroren', 'frost', 'iglo', 'frosta', 'pommes', 'frites', 'kroketten', 'rösti', 'kartoffelpuffer', 'fischstäbchen', 'schlemmerfilet', 'spinat', 'erbsen', 'bohnen', 'gemüsemix', 'früchtemix'], match: 'tiefkühl', score: 10 },
  
  // EIER
  { keywords: ['egg', 'ei', 'eier', 'freiland', 'bio-eier', 'bodenhaltung', 'hühnerei', 'wachteleier'], match: 'ei', score: 12 },
  
  // BABY
  { keywords: ['baby', 'säugling', 'infant', 'hipp', 'alete', 'babybrei', 'milchpulver', 'babynahrung', 'folgemilch', 'pre-nahrung', 'windel', 'pampers', 'feuchttücher', 'babytücher', 'schnuller', 'fläschchen', 'babypflege', 'penaten', 'bübchen'], match: 'baby', score: 15 },
  
  // HAUSTIER
  { keywords: ['pet', 'hund', 'katze', 'dog', 'cat', 'tier', 'futter', 'hundefutter', 'katzenfutter', 'whiskas', 'pedigree', 'felix', 'sheba', 'chappi', 'frolic', 'kitekat', 'brekkies', 'leckerli', 'snack hund', 'snack katze', 'katzenstreu', 'vogelfutter', 'fischfutter', 'nagerfutter', 'hamsterfutter'], match: 'tiernahrung', score: 15 },
  
  // HAUSHALT & REINIGUNG
  { keywords: ['cleaning', 'reinig', 'waschmittel', 'spülmittel', 'putzmittel', 'persil', 'ariel', 'fairy', 'pril', 'spee', 'weißer riese', 'frosch', 'sagrotan', 'cillit', 'meister proper', 'ajax', 'domestos', 'wc reiniger', 'badreiniger', 'glasreiniger', 'allzweckreiniger', 'entkalker', 'essigreiniger', 'scheuermilch', 'spülmaschinen', 'tabs', 'klarspüler', 'regeneriersalz', 'weichspüler', 'fleckenentferner', 'bleiche', 'desinfektion'], match: 'haushalt', score: 12 },
  { keywords: ['papier', 'toilettenpapier', 'klopapier', 'küchenrolle', 'taschentücher', 'tempo', 'zewa', 'hakle', 'servietten', 'alufolie', 'frischhaltefolie', 'backpapier', 'müllbeutel', 'müllsack', 'gefrierbeutel', 'ziplock'], match: 'haushalt', score: 10 },
  
  // DROGERIE & KÖRPERPFLEGE - MASSIV ERWEITERT!
  { keywords: ['hygiene', 'soap', 'seife', 'shampoo', 'dusch', 'duschgel', 'duschbad', 'badezusatz', 'schaumbad', 'bodylotion', 'körperlotion', 'handcreme', 'gesichtscreme', 'tagescreme', 'nachtcreme', 'feuchtigkeitscreme', 'nivea', 'dove', 'bebe', 'balea', 'cien'], match: 'körperpflege', score: 12 },
  { keywords: ['zahn', 'zahnpasta', 'zahncreme', 'zahnbürste', 'zahnseide', 'mundspülung', 'mundwasser', 'oral-b', 'colgate', 'elmex', 'sensodyne', 'meridol'], match: 'zahnpflege', score: 15 },
  { keywords: ['deo', 'deodorant', 'antitranspirant', 'axe', 'rexona', 'fa', 'right guard', '8x4', 'deoroller', 'deospray', 'deostick'], match: 'körperpflege', score: 12 },
  { keywords: ['rasier', 'rasierer', 'rasierschaum', 'rasiergel', 'rasierklingen', 'gillette', 'wilkinson', 'venus', 'rasiercreme', 'aftershave', 'rasurpflege'], match: 'körperpflege', score: 12 },
  { keywords: ['haar', 'haarpflege', 'shampoo', 'conditioner', 'spülung', 'haarkur', 'haarspray', 'haarfarbe', 'head & shoulders', 'pantene', 'schauma', 'garnier'], match: 'haarpflege', score: 12 },
  { keywords: ['makeup', 'make-up', 'kosmetik', 'schminke', 'lippenstift', 'mascara', 'wimperntusche', 'eyeliner', 'kajal', 'lidschatten', 'rouge', 'puder', 'foundation', 'concealer', 'primer', 'highlighter', 'bronzer', 'nagellack', 'nagelpflege', 'abschminken', 'make up entferner', 'loreal', 'maybelline', 'essence', 'catrice', 'manhattan'], match: 'körperpflege', score: 12 },
  { keywords: ['tampons', 'binden', 'slipeinlagen', 'always', 'tampax', 'ob', 'carefree', 'menstruation', 'periode', 'damenhygiene', 'intimwaschlotion'], match: 'körperpflege', score: 12 },
  { keywords: ['sonnen', 'sonnencreme', 'sonnenschutz', 'sonnenmilch', 'after sun', 'bräunungscreme', 'selbstbräuner', 'lsf', 'spf', 'uv-schutz'], match: 'körperpflege', score: 12 },
  { keywords: ['parfüm', 'parfum', 'eau de toilette', 'edt', 'eau de parfum', 'edp', 'duft', 'körperspray', 'bodyspray'], match: 'körperpflege', score: 12 },
  { keywords: ['batterie', 'batterien', 'akku', 'akkus', 'duracell', 'energizer', 'varta', 'aa', 'aaa', 'c', 'd', 'knopfzelle', '9v'], match: 'körperpflege', score: 10 },
  { keywords: ['pflaster', 'verband', 'mullbinde', 'wunddesinfektion', 'hansaplast', 'erste hilfe', 'schmerztablette', 'kopfschmerz', 'ibuprofen', 'aspirin', 'paracetamol', 'nasenspray', 'hustensaft', 'halstabletten', 'erkältung', 'fieberthermometer', 'medizin', 'apotheke'], match: 'körperpflege', score: 12 },
  { keywords: ['kontaktlinsen', 'linsen', 'kontaktlinsenlösung', 'augentropfen', 'brille', 'brillenputztücher', 'gleitsichtbrille', 'lesebrille'], match: 'körperpflege', score: 10 },
  { keywords: ['kondom', 'kondome', 'verhütung', 'durex', 'billy boy', 'ritex', 'gleitgel', 'gleitmittel'], match: 'körperpflege', score: 12 },
];

// Suggest categories based on all form data
const suggestCategoryFromForm = (form, categories) => {
  const searchText = [
    form.name || '',
    form.description || '',
    form.brand || '',
    form.ingredients || '',
    form.allergens || ''
  ].join(' ').toLowerCase();
  
  if (searchText.trim().length < 2) return null;
  
  const scores = {};
  
  for (const mapping of CATEGORY_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword)) {
        const cat = categories.find(c => c.name.toLowerCase().includes(mapping.match));
        if (cat) {
          scores[cat.id] = (scores[cat.id] || 0) + mapping.score;
        }
      }
    }
  }
  
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 10) {
    return parseInt(sorted[0][0]);
  }
  return null;
};

// Suggest categories based on product name only (for live suggestions)
const suggestCategories = (name, categories) => {
  if (!name || name.length < 2) return [];
  
  const searchText = name.toLowerCase();
  const scores = {};
  
  for (const mapping of CATEGORY_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword)) {
        const cat = categories.find(c => c.name.toLowerCase().includes(mapping.match));
        if (cat) {
          scores[cat.id] = (scores[cat.id] || 0) + mapping.score;
        }
      }
    }
  }
  
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => categories.find(c => c.id === parseInt(id)))
    .filter(Boolean);
};

// Extract brand intelligently
const extractBrand = (product) => {
  const name = (product.product_name || product.product_name_de || '').toLowerCase();
  const rawBrand = (product.brands || '').toLowerCase().trim();
  
  for (const [key, brandName] of Object.entries(KNOWN_BRANDS)) {
    if (name.includes(key) || rawBrand.includes(key)) {
      return brandName;
    }
  }
  
  if (rawBrand && rawBrand.length > 0) {
    let brand = rawBrand.split(',')[0].trim();
    brand = brand.replace(/\s*(zero|light|classic|original|regular|diet|free|mini|maxi)$/i, '');
    return brand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  
  return '';
};

// Extract brand from user input
const extractBrandFromName = (name) => {
  if (!name) return '';
  const lowerName = name.toLowerCase();
  for (const [key, brandName] of Object.entries(KNOWN_BRANDS)) {
    if (lowerName.includes(key)) {
      return brandName;
    }
  }
  return '';
};

// Map Open Food Facts categories to Speeti categories
const mapCategory = (product, categories) => {
  const cats = (product.categories_tags || []).map(c => c.toLowerCase().replace('en:', '').replace('de:', ''));
  const catText = (product.categories || '').toLowerCase();
  const name = (product.product_name || product.product_name_de || '').toLowerCase();
  const brand = (product.brands || '').toLowerCase();
  
  const searchText = [name, brand, cats.join(' '), catText].join(' ').toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const mapping of CATEGORY_MAPPINGS) {
    let score = 0;
    for (const keyword of mapping.keywords) {
      if (name.includes(keyword)) {
        score += 10 + mapping.score;
      } else if (brand.includes(keyword)) {
        score += 5 + mapping.score;
      } else if (searchText.includes(keyword)) {
        score += 2 + mapping.score;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping.match;
    }
  }
  
  if (bestMatch) {
    const match = categories.find(c => c.name.toLowerCase().includes(bestMatch));
    if (match) return match.id;
  }
  
  return null;
};

const ProductModal = ({ isOpen, onClose, editItem, categories, onSave }) => {
  const [form, setForm] = useState({
    name: '', description: '', price: '', original_price: '', category_id: '',
    unit: 'Stück', unit_amount: '1', image: '', sku: '', ean: '', weight: '', weight_unit: 'g',
    stock_count: 100, min_order: 1, max_order: 99, tax_rate: 19, deposit: 0, storage_temp: '',
    allergens: '', ingredients: '', nutrition_info: '', origin: '', brand: '',
    featured: false, in_stock: true, visible: true
  });
  const [activeSection, setActiveSection] = useState('basic');
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [imageMode, setImageMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [autoCategorySuccess, setAutoCategorySuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Live category suggestions based on product name
  const suggestedCategories = useMemo(() => {
    return suggestCategories(form.name, categories);
  }, [form.name, categories]);

  // Live brand suggestion
  const suggestedBrand = useMemo(() => {
    if (form.brand) return null;
    return extractBrandFromName(form.name);
  }, [form.name, form.brand]);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setForm({ ...editItem });
        setImageMode(editItem.image?.startsWith('/uploads') ? 'upload' : 'url');
      } else {
        setForm({
          name: '', description: '', price: '', original_price: '', 
          category_id: categories[0]?.id || '',
          unit: 'Stück', unit_amount: '1', image: '', sku: '', ean: '', weight: '', weight_unit: 'g',
          stock_count: 100, min_order: 1, max_order: 99, tax_rate: 19, deposit: 0, storage_temp: '',
          allergens: '', ingredients: '', nutrition_info: '', origin: '', brand: '',
          featured: false, in_stock: true, visible: true
        });
        setImageMode('url');
      }
      setActiveSection('basic');
      setSearchResults([]);
      setShowResults(false);
      setAutoCategorySuccess(false);
    }
  }, [isOpen, editItem?.id]);

  if (!isOpen) return null;

  // Auto-detect category from all form fields
  const handleAutoCategory = () => {
    const suggestedCatId = suggestCategoryFromForm(form, categories);
    if (suggestedCatId) {
      setForm(f => ({ ...f, category_id: suggestedCatId }));
      setAutoCategorySuccess(true);
      setTimeout(() => setAutoCategorySuccess(false), 2000);
    } else {
      alert('❌ Konnte keine passende Kategorie erkennen.\nBitte füge mehr Infos hinzu (Name, Beschreibung, Marke, etc.)');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Bitte nur Bilddateien hochladen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Bild darf maximal 5MB groß sein');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('speeti-token');
      const res = await fetch('/api/upload/product', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload fehlgeschlagen');

      const data = await res.json();
      setForm(f => ({ ...f, image: data.url }));
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const searchProducts = async () => {
    if (!form.name || form.name.length < 3) {
      alert('Bitte gib zuerst einen Produktnamen ein (min. 3 Zeichen)');
      return;
    }
    setAutoFillLoading(true);
    setSearchResults([]);
    try {
      const searchRes = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(form.name)}&search_simple=1&action=process&json=1&page_size=10&lc=de`);
      const searchData = await searchRes.json();
      if (searchData.products?.length > 0) {
        const results = searchData.products.map(p => ({
          code: p.code,
          name: p.product_name_de || p.product_name || 'Unbekannt',
          brand: extractBrand(p),
          quantity: p.quantity || '',
          image: p.image_small_url || p.image_url || null,
          _raw: p
        })).filter(p => p.name && p.name !== 'Unbekannt');
        
        if (results.length === 1) {
          applyProduct(results[0]._raw);
        } else if (results.length > 1) {
          setSearchResults(results);
          setShowResults(true);
        } else {
          alert('❌ Kein Produkt gefunden.');
        }
      } else {
        alert('❌ Kein Produkt gefunden.');
      }
    } catch (err) {
      alert('❌ Fehler bei der Suche.');
    } finally {
      setAutoFillLoading(false);
    }
  };

  const applyProduct = (product) => {
    const mappedCategory = mapCategory(product, categories);
    const smartBrand = extractBrand(product);
    
    setForm(f => ({
      ...f,
      name: product.product_name_de || product.product_name || f.name,
      description: product.generic_name_de || product.generic_name || f.description || '',
      brand: smartBrand || f.brand,
      ean: product.code || f.ean || '',
      weight: product.quantity ? product.quantity.replace(/[^0-9.,]/g, '') : f.weight || '',
      weight_unit: product.quantity?.toLowerCase().includes('ml') ? 'ml' : 
                   (product.quantity?.toLowerCase().includes('l') && !product.quantity?.toLowerCase().includes('ml') ? 'l' : 'g'),
      ingredients: product.ingredients_text_de || product.ingredients_text || f.ingredients || '',
      allergens: product.allergens_tags?.map(a => a.replace('en:', '').replace('de:', '')).join(', ') || f.allergens || '',
      nutrition_info: product.nutriments ? 
        `Energie: ${product.nutriments['energy-kcal_100g'] || '?'} kcal/100g, Fett: ${product.nutriments.fat_100g || '?'}g, KH: ${product.nutriments.carbohydrates_100g || '?'}g, Zucker: ${product.nutriments.sugars_100g || '?'}g, Eiweiß: ${product.nutriments.proteins_100g || '?'}g` 
        : f.nutrition_info || '',
      origin: product.origins || f.origin || '',
      image: product.image_url || product.image_front_url || f.image || '',
      category_id: mappedCategory || f.category_id,
    }));
    setImageMode('url');
    setShowResults(false);
    setSearchResults([]);
  };

  const sections = [
    { id: 'basic', label: 'Basis', icon: Info },
    { id: 'pricing', label: 'Preise', icon: Tag },
    { id: 'inventory', label: 'Bestand', icon: Box },
    { id: 'details', label: 'Details', icon: Barcode },
    { id: 'nutrition', label: 'Nährwerte', icon: Scale },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, price: parseFloat(form.price), original_price: form.original_price ? parseFloat(form.original_price) : null };
    await onSave(data, editItem);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">{editItem ? 'Produkt bearbeiten' : 'Neues Produkt anlegen'}</h2>
            <p className="text-sm text-gray-500">Fülle alle relevanten Felder aus</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex border-b border-gray-200 px-4 bg-white overflow-x-auto">
          {sections.map(sec => (
            <button key={sec.id} type="button" onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === sec.id ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500'}`}>
              <sec.icon size={16} />{sec.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produktname *</label>
                <div className="flex gap-2">
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" placeholder="z.B. Coca Cola Zero 330ml" />
                  <button type="button" onClick={searchProducts} disabled={autoFillLoading || !form.name || form.name.length < 3}
                    className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                    {autoFillLoading ? <><Loader2 size={18} className="animate-spin" /> Suche...</> : <><Sparkles size={18} /> Auto-Fill</>}
                  </button>
                </div>
              </div>

              {/* AI Category Suggestions */}
              {suggestedCategories.length > 0 && !editItem && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3"
                >
                  <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    KI-Vorschläge basierend auf "{form.name}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm({...form, category_id: cat.id})}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          form.category_id === cat.id 
                            ? 'bg-amber-500 text-white shadow-md' 
                            : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>
                  {suggestedBrand && (
                    <button
                      type="button"
                      onClick={() => setForm({...form, brand: suggestedBrand})}
                      className="mt-2 px-3 py-1.5 bg-white text-amber-700 border border-amber-300 rounded-lg text-sm hover:bg-amber-100 transition-colors"
                    >
                      Marke: <strong>{suggestedBrand}</strong> übernehmen
                    </button>
                  )}
                </motion.div>
              )}

              <AnimatePresence>
                {showResults && searchResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-violet-50 border-2 border-violet-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-violet-100 border-b border-violet-200">
                      <p className="font-medium text-violet-800 flex items-center gap-2"><Sparkles size={16} />{searchResults.length} Produkte gefunden - Wähle das richtige:</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-violet-100">
                      {searchResults.map((result, idx) => (
                        <button key={result.code || idx} type="button" onClick={() => applyProduct(result._raw)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-violet-100 transition-colors text-left">
                          <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-violet-200">
                            {result.image ? <img src={result.image} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Image size={20} /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{result.name}</p>
                            <p className="text-sm text-gray-500 truncate">{result.brand && <span className="text-violet-600">{result.brand}</span>}{result.brand && result.quantity && ' · '}{result.quantity}</p>
                          </div>
                          <ChevronRight size={20} className="text-violet-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                    <div className="p-2 bg-violet-100 border-t border-violet-200">
                      <button type="button" onClick={() => { setShowResults(false); setSearchResults([]); }} className="w-full text-sm text-violet-600 hover:text-violet-800 py-1">Abbrechen</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
                  <div className="flex gap-2">
                    <select value={form.category_id} onChange={(e) => setForm({...form, category_id: parseInt(e.target.value)})}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={handleAutoCategory}
                      className={`px-3 py-2.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                        autoCategorySuccess 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
                      }`}
                      title="Kategorie automatisch erkennen"
                    >
                      {autoCategorySuccess ? <Check size={18} /> : <Wand2 size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">🪄 Auto-Erkennung basiert auf Name, Beschreibung & Marke</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marke</label>
                  <input type="text" value={form.brand || ''} onChange={(e) => setForm({...form, brand: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
              </div>

              {/* Image Section with Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Produktbild</label>
                
                {/* Mode Toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      imageMode === 'upload' 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Upload size={16} />
                    Bild hochladen
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      imageMode === 'url' 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Link size={16} />
                    URL eingeben
                  </button>
                </div>

                <div className="flex gap-4 items-start">
                  {/* Preview */}
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-300">
                    {form.image ? (
                      <img src={form.image} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Image size={32} />
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex-1">
                    {imageMode === 'upload' ? (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-rose-400 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                        >
                          {uploading ? (
                            <><Loader2 size={20} className="animate-spin" /> Wird hochgeladen...</>
                          ) : (
                            <><Upload size={20} /> Bild auswählen (max. 5MB)</>
                          )}
                        </button>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG oder WebP</p>
                      </>
                    ) : (
                      <>
                        <input
                          type="url"
                          value={form.image || ''}
                          onChange={(e) => setForm({...form, image: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                          placeholder="https://example.com/bild.jpg"
                        />
                        <p className="text-xs text-gray-400 mt-1">Direkte URL zum Bild eingeben</p>
                      </>
                    )}
                    
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => setForm({...form, image: ''})}
                        className="text-xs text-red-500 mt-2 hover:text-red-700"
                      >
                        Bild entfernen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'pricing' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Verkaufspreis (€) *</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Streichpreis (€)</label>
                <input type="number" step="0.01" value={form.original_price || ''} onChange={(e) => setForm({...form, original_price: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">MwSt.</label>
                <select value={form.tax_rate} onChange={(e) => setForm({...form, tax_rate: parseInt(e.target.value)})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
                  <option value={7}>7% (Lebensmittel)</option><option value={19}>19% (Standard)</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Pfand (€)</label>
                <input type="number" step="0.01" value={form.deposit || 0} onChange={(e) => setForm({...form, deposit: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" /></div>
            </div>
          )}
          {activeSection === 'inventory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bestand</label>
                  <input type="number" value={form.stock_count} onChange={(e) => setForm({...form, stock_count: parseInt(e.target.value)})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.unit_amount} onChange={(e) => setForm({...form, unit_amount: e.target.value})} className="w-20 px-3 py-2.5 border border-gray-200 rounded-xl" />
                    <select value={form.unit} onChange={(e) => { const m = {ml:"ml",Liter:"l",l:"l",g:"g",kg:"kg",Stück:"stück"}; setForm({...form, unit: e.target.value, unit_type: m[e.target.value] || "stück"}); }} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl">
                      <option value="Stück">Stück</option><option value="kg">kg</option><option value="g">g</option><option value="l">Liter</option><option value="ml">ml</option></select></div></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({...form, in_stock: e.target.checked})} className="w-5 h-5 rounded" /><span className="text-sm">Verfügbar</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible} onChange={(e) => setForm({...form, visible: e.target.checked})} className="w-5 h-5 rounded" /><span className="text-sm">Sichtbar</span></label>
              </div>
            </div>
          )}
          {activeSection === 'details' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU</label><input type="text" value={form.sku || ''} onChange={(e) => setForm({...form, sku: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">EAN</label><input type="text" value={form.ean || ''} onChange={(e) => setForm({...form, ean: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Gewicht</label>
                <div className="flex gap-2"><input type="text" value={form.weight || ''} onChange={(e) => setForm({...form, weight: e.target.value})} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl" />
                  <select value={form.weight_unit} onChange={(e) => setForm({...form, weight_unit: e.target.value})} className="w-20 px-2 py-2.5 border border-gray-200 rounded-xl"><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option></select></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Herkunft</label><input type="text" value={form.origin || ''} onChange={(e) => setForm({...form, origin: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" /></div>
            </div>
          )}
          {activeSection === 'nutrition' && (
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Zutaten</label><textarea value={form.ingredients || ''} onChange={(e) => setForm({...form, ingredients: e.target.value})} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Allergene</label><input type="text" value={form.allergens || ''} onChange={(e) => setForm({...form, allergens: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="z.B. Gluten, Milch" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nährwerte</label><textarea value={form.nutrition_info || ''} onChange={(e) => setForm({...form, nutrition_info: e.target.value})} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" /></div>
            </div>
          )}
        </form>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50">Abbrechen</button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-medium flex items-center justify-center gap-2">
            <Check size={18} />{editItem ? 'Speichern' : 'Produkt anlegen'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductModal;
