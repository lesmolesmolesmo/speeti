import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  QrCodeIcon, 
  PlusIcon, 
  MinusIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  CameraIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

// Barcode Scanner Component
function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    let html5QrCode = null;
    let mounted = true;
    
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        
        if (!mounted) return;
        
        html5QrCode = new Html5Qrcode("barcode-reader");
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.777
          },
          (decodedText) => {
            if (navigator.vibrate) navigator.vibrate(200);
            onScan(decodedText);
          },
          () => {} // Ignore continuous errors
        );
      } catch (err) {
        console.error('Scanner error:', err);
        if (mounted) {
          setError('Kamera-Zugriff verweigert. Bitte erlaube den Kamera-Zugriff in deinen Browser-Einstellungen.');
          setHasCamera(false);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-xl">Barcode scannen</h2>
              <p className="text-white/60 text-sm">Halte den Barcode in den Rahmen</p>
            </div>
            <button onClick={onClose} className="p-3 bg-white/20 rounded-full backdrop-blur">
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div id="barcode-reader" className="flex-1 w-full" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6">
            <div className="text-center max-w-sm">
              <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <p className="text-white text-lg mb-6">{error}</p>
              <button onClick={onClose} className="px-8 py-3 bg-rose-500 text-white rounded-full font-medium">
                Schließen
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
          <div className="flex justify-center gap-4">
            <button onClick={onClose} className="px-6 py-3 bg-white/20 text-white rounded-full backdrop-blur">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Lookup Modal
function ProductLookupModal({ barcode, existingProduct, onConfirm, onCancel, onManualAdd }) {
  const [loading, setLoading] = useState(!existingProduct);
  const [productInfo, setProductInfo] = useState(existingProduct || null);
  const [quantity, setQuantity] = useState(1);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!existingProduct) {
      lookupBarcode(barcode);
    }
  }, [barcode, existingProduct]);

  const lookupBarcode = async (code) => {
    setLoading(true);
    setNotFound(false);
    
    try {
      // Try Open Food Facts (best for food products in Germany)
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
      const offData = await offRes.json();
      
      if (offData.status === 1 && offData.product) {
        const p = offData.product;
        setProductInfo({
          name: p.product_name_de || p.product_name || 'Unbekanntes Produkt',
          brand: p.brands || '',
          image: p.image_front_url || p.image_url || null,
          category: mapCategory(p.categories_tags?.[0]) || 'Sonstiges',
          barcode: code,
          source: 'Open Food Facts',
          quantity_info: p.quantity || ''
        });
        setLoading(false);
        return;
      }

      // Fallback: UPC Database
      try {
        const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
        const upcData = await upcRes.json();
        
        if (upcData.items?.length > 0) {
          const item = upcData.items[0];
          setProductInfo({
            name: item.title || 'Unbekanntes Produkt',
            brand: item.brand || '',
            image: item.images?.[0] || null,
            category: 'Sonstiges',
            barcode: code,
            source: 'UPC Database'
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('UPC lookup failed');
      }

      setNotFound(true);
    } catch (err) {
      console.error('Lookup error:', err);
      setNotFound(true);
    }
    setLoading(false);
  };

  const mapCategory = (tag) => {
    if (!tag) return 'Sonstiges';
    const t = tag.toLowerCase();
    if (t.includes('beverage') || t.includes('drink') || t.includes('getränk')) return 'Getränke';
    if (t.includes('snack') || t.includes('chips')) return 'Snacks';
    if (t.includes('sweet') || t.includes('chocolate') || t.includes('süß')) return 'Süßigkeiten';
    if (t.includes('dairy') || t.includes('milk') || t.includes('milch')) return 'Milchprodukte';
    if (t.includes('frozen') || t.includes('tiefkühl')) return 'Tiefkühl';
    return 'Sonstiges';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-bold text-lg">{existingProduct ? 'Bestand auffüllen' : 'Produkt hinzufügen'}</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Suche Produktinfos...</p>
              <p className="text-sm text-gray-400 mt-2 font-mono">{barcode}</p>
            </div>
          ) : notFound ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-10 h-10 text-amber-600" />
              </div>
              <p className="font-bold text-lg mb-1">Produkt nicht gefunden</p>
              <p className="text-sm text-gray-500 mb-6 font-mono">{barcode}</p>
              <button
                onClick={() => onManualAdd(barcode)}
                className="w-full py-4 bg-rose-500 text-white rounded-xl font-semibold"
              >
                Manuell anlegen
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-6">
                {productInfo?.image ? (
                  <img src={productInfo.image} alt="" className="w-24 h-24 object-cover rounded-xl bg-gray-100" />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                    <CubeIcon className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate">{productInfo?.name}</p>
                  {productInfo?.brand && <p className="text-gray-500">{productInfo.brand}</p>}
                  <p className="text-xs text-gray-400 mt-1 font-mono">{barcode}</p>
                  {productInfo?.source && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-rose-100 text-rose-600 text-xs rounded-full">
                      {productInfo.source}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Menge hinzufügen</label>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                  >
                    <MinusIcon className="w-6 h-6" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 text-center text-4xl font-bold border-b-2 border-rose-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                  >
                    <PlusIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {[1, 5, 10, 20, 50].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`py-3 rounded-xl font-semibold transition-all ${
                      quantity === q ? 'bg-rose-500 text-white scale-105' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onConfirm({ ...productInfo, quantity })}
                className="w-full py-4 bg-rose-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-rose-600"
              >
                <CheckCircleIcon className="w-6 h-6" />
                {existingProduct ? 'Bestand erhöhen' : 'Hinzufügen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Manual Add Modal
function ManualAddModal({ barcode, onConfirm, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    price: '',
    category: 'Sonstiges',
    quantity: 1,
    barcode: barcode || ''
  });

  const categories = ['Getränke', 'Snacks', 'Süßigkeiten', 'Obst & Gemüse', 'Milchprodukte', 'Tiefkühl', 'Haushalt', 'Pflege', 'Sonstiges'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onConfirm(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-bold text-lg">Neues Produkt</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm({...form, barcode: e.target.value})}
              className="w-full p-3 border rounded-xl bg-gray-50 font-mono"
              placeholder="EAN/UPC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produktname *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-500"
              placeholder="z.B. Coca-Cola 0,5L"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marke</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({...form, brand: e.target.value})}
              className="w-full p-3 border rounded-xl"
              placeholder="z.B. Coca-Cola"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className="w-full p-3 border rounded-xl bg-white"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preis (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({...form, price: e.target.value})}
                className="w-full p-3 border rounded-xl"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Menge</label>
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => setForm({...form, quantity: Math.max(1, form.quantity - 1)})} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <MinusIcon className="w-5 h-5" />
              </button>
              <span className="text-3xl font-bold w-16 text-center">{form.quantity}</span>
              <button type="button" onClick={() => setForm({...form, quantity: form.quantity + 1})} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-rose-500 text-white rounded-xl font-bold">
            Produkt anlegen
          </button>
        </form>
      </div>
    </div>
  );
}

// Inventory Item Component
const InventoryItem = memo(function InventoryItem({ item, onUpdateStock, onEdit, onDelete }) {
  const stockColor = item.stock === 0 ? 'text-red-500 border-red-500' : 
                     item.stock <= 10 ? 'text-amber-500 border-amber-500' : 
                     'text-green-600 border-green-500';

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
      item.stock === 0 ? 'border-l-red-500' : item.stock <= 10 ? 'border-l-amber-500' : 'border-l-green-500'
    }`}>
      <div className="flex gap-3">
        {item.image ? (
          <img src={item.image} alt="" className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <CubeIcon className="w-8 h-8 text-gray-300" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{item.name}</h3>
          {item.brand && <p className="text-sm text-gray-500 truncate">{item.brand}</p>}
          <p className="text-xs text-gray-400 font-mono mt-1">{item.barcode || '—'}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <div className={`text-2xl font-bold ${stockColor}`}>{item.stock}</div>
          <p className="text-xs text-gray-400">Stück</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t">
        <button onClick={() => onUpdateStock(item.id, -1)} disabled={item.stock === 0} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm disabled:opacity-40">-1</button>
        <button onClick={() => onUpdateStock(item.id, -5)} disabled={item.stock < 5} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm disabled:opacity-40">-5</button>
        <button onClick={() => onUpdateStock(item.id, 5)} className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg font-medium text-sm">+5</button>
        <button onClick={() => onUpdateStock(item.id, 1)} className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg font-medium text-sm">+1</button>
        <button onClick={() => onDelete(item.id)} className="py-2 px-3 bg-gray-100 text-gray-600 rounded-lg">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// Main Warehouse Page
export default function Warehouse() {
  const navigate = useNavigate();
  const { user, token } = useStore();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [existingProduct, setExistingProduct] = useState(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadInventory();
  }, [user, navigate]);

  const loadInventory = async () => {
    try {
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setInventory(await res.json());
    } catch (err) {
      console.error('Load inventory error:', err);
    }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleScan = useCallback((barcode) => {
    setShowScanner(false);
    // Check if product already exists
    const existing = inventory.find(i => i.barcode === barcode);
    if (existing) {
      setExistingProduct(existing);
    }
    setScannedBarcode(barcode);
  }, [inventory]);

  const handleConfirm = async (data) => {
    try {
      const endpoint = existingProduct 
        ? `/api/inventory/${existingProduct.id}/stock`
        : '/api/inventory/add';
      
      const res = await fetch(endpoint, {
        method: existingProduct ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(existingProduct ? { change: data.quantity } : data)
      });

      if (res.ok) {
        showToast(`${data.quantity}x ${data.name} ${existingProduct ? 'aufgefüllt' : 'hinzugefügt'}!`);
        loadInventory();
      } else {
        showToast('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showToast('Netzwerkfehler', 'error');
    }
    setScannedBarcode(null);
    setExistingProduct(null);
  };

  const handleManualAdd = (barcode) => {
    setScannedBarcode(null);
    setExistingProduct(null);
    setManualBarcode(barcode || '');
    setShowManualAdd(true);
  };

  const handleManualConfirm = async (data) => {
    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...data, source: 'Manual' })
      });
      if (res.ok) {
        showToast(`${data.quantity}x ${data.name} hinzugefügt!`);
        loadInventory();
      } else {
        showToast('Fehler', 'error');
      }
    } catch (err) {
      showToast('Netzwerkfehler', 'error');
    }
    setShowManualAdd(false);
  };

  const updateStock = async (id, change) => {
    try {
      const res = await fetch(`/api/inventory/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ change })
      });
      if (res.ok) loadInventory();
    } catch (err) {
      showToast('Fehler', 'error');
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Produkt wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Gelöscht');
        loadInventory();
      }
    } catch (err) {
      showToast('Fehler', 'error');
    }
  };

  const filtered = inventory.filter(i => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.name?.toLowerCase().includes(q) && !i.barcode?.includes(q) && !i.brand?.toLowerCase().includes(q)) return false;
    }
    if (filter === 'low' && i.stock > 10) return false;
    if (filter === 'out' && i.stock > 0) return false;
    return true;
  });

  const stats = {
    total: inventory.length,
    totalStock: inventory.reduce((s, i) => s + (i.stock || 0), 0),
    low: inventory.filter(i => i.stock > 0 && i.stock <= 10).length,
    out: inventory.filter(i => i.stock === 0).length
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 text-white">
        <div className="p-4 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Lagerverwaltung</h1>
              <p className="text-rose-200 text-sm">Bestand & Barcode-Scanner</p>
            </div>
            <button onClick={() => navigate('/admin')} className="p-2 bg-white/20 rounded-full backdrop-blur">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-rose-200">Produkte</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats.totalStock}</p>
              <p className="text-xs text-rose-200">Einheiten</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-300">{stats.low}</p>
              <p className="text-xs text-rose-200">Niedrig</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-300">{stats.out}</p>
              <p className="text-xs text-rose-200">Leer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="sticky top-0 z-10 bg-white border-b p-4 shadow-sm">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Name oder Barcode..."
            className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { k: 'all', l: 'Alle', c: stats.total },
            { k: 'low', l: 'Niedrig', c: stats.low },
            { k: 'out', l: 'Leer', c: stats.out }
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                filter === f.k ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {f.l}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === f.k ? 'bg-white/20' : 'bg-gray-200'
              }`}>{f.c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-16">
            <ArrowPathIcon className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Lade Inventar...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CubeIcon className="w-20 h-20 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-1">{search ? 'Keine Treffer' : 'Noch keine Produkte'}</p>
            <p className="text-gray-400 text-sm">Scanne einen Barcode zum Hinzufügen</p>
          </div>
        ) : (
          filtered.map(item => (
            <InventoryItem 
              key={item.id} 
              item={item} 
              onUpdateStock={updateStock}
              onDelete={deleteItem}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-4 flex flex-col gap-3">
        <button
          onClick={() => setShowManualAdd(true)}
          className="w-14 h-14 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <ClipboardDocumentListIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowScanner(true)}
          className="w-16 h-16 bg-rose-500 text-white rounded-full shadow-xl flex items-center justify-center animate-pulse"
        >
          <CameraIcon className="w-8 h-8" />
        </button>
      </div>

      {/* Modals */}
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      
      {scannedBarcode && (
        <ProductLookupModal
          barcode={scannedBarcode}
          existingProduct={existingProduct}
          onConfirm={handleConfirm}
          onCancel={() => { setScannedBarcode(null); setExistingProduct(null); }}
          onManualAdd={handleManualAdd}
        />
      )}

      {showManualAdd && (
        <ManualAddModal
          barcode={manualBarcode}
          onConfirm={handleManualConfirm}
          onCancel={() => { setShowManualAdd(false); setManualBarcode(''); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 p-4 rounded-xl shadow-lg z-50 flex items-center gap-3 animate-slide-down ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {toast.type === 'error' ? <ExclamationTriangleIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
