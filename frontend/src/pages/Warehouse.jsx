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

// Barcode Scanner with AI Vision fallback
function BarcodeScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionCountRef = useRef({});

  useEffect(() => {
    let mounted = true;
    
    const initScanner = async () => {
      try {
        const Quagga = (await import('@ericblade/quagga2')).default;
        
        if (!mounted) return;
        
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              facingMode: "environment",
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true,
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 10,
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader", 
              "upc_reader",
              "upc_e_reader",
              "code_128_reader",
              "code_39_reader",
              "i2of5_reader",
            ],
            multiple: false,
          },
          locate: true,
        }, (err) => {
          if (err) {
            console.error('Quagga init error:', err);
            if (mounted) setError('Kamera konnte nicht gestartet werden');
            return;
          }
          
          Quagga.start();
          if (mounted) setScanning(true);
        });

        // Detection handler with verification (multiple reads = more confident)
        Quagga.onDetected((result) => {
          const code = result.codeResult.code;
          if (!code) return;
          
          // Count detections for confidence
          detectionCountRef.current[code] = (detectionCountRef.current[code] || 0) + 1;
          
          // Require 3 consistent reads for confidence
          if (detectionCountRef.current[code] >= 3) {
            console.log('✅ Barcode erkannt:', code);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            Quagga.stop();
            onScan(code);
          }
        });
        
      } catch (err) {
        console.error('Scanner error:', err);
        if (mounted) {
          setError('Kamera nicht verfügbar. Nutze Foto oder manuelle Eingabe.');
        }
      }
    };
    
    initScanner();
    
    return () => {
      mounted = false;
      import('@ericblade/quagga2').then(({ default: Quagga }) => {
        Quagga.stop();
      }).catch(() => {});
    };
  }, [onScan]);

  // Toggle torch
  const toggleTorch = async () => {
    try {
      const Quagga = (await import('@ericblade/quagga2')).default;
      const track = Quagga.CameraAccess.getActiveTrack();
      if (track) {
        const capabilities = track.getCapabilities?.();
        if (capabilities?.torch) {
          await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
          setTorchOn(!torchOn);
        } else {
          alert('Taschenlampe nicht verfügbar auf diesem Gerät');
        }
      }
    } catch (e) {
      console.log('Torch error:', e);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  // Capture current video frame and scan with AI
  const captureAndScan = async () => {
    if (!scanning) return;
    
    setProcessing(true);
    setProcessingText('📸 Bild wird aufgenommen...');
    
    try {
      const Quagga = (await import('@ericblade/quagga2')).default;
      const track = Quagga.CameraAccess.getActiveTrack();
      
      if (!track) {
        alert('Kamera nicht verfügbar');
        setProcessing(false);
        return;
      }
      
      // Get video element from Quagga
      const video = document.querySelector('#scanner-container video');
      if (!video) {
        alert('Video nicht gefunden');
        setProcessing(false);
        return;
      }
      
      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Captured frame, size:', Math.round(imageData.length / 1024), 'KB');
      
      // First try Quagga on the captured frame
      setProcessingText('🔍 Analysiere Barcode...');
      
      const blob = await (await fetch(imageData)).blob();
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const imageUrl = URL.createObjectURL(file);
      
      const quaggaResult = await new Promise((resolve) => {
        Quagga.decodeSingle({
          src: imageUrl,
          numOfWorkers: 0,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader"],
          },
          locate: true,
          locator: { patchSize: "large", halfSample: false },
        }, resolve);
      });
      
      URL.revokeObjectURL(imageUrl);
      
      if (quaggaResult?.codeResult?.code) {
        console.log('✅ Quagga found:', quaggaResult.codeResult.code);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        Quagga.stop();
        setProcessing(false);
        onScan(quaggaResult.codeResult.code);
        return;
      }
      
      // Quagga failed - try AI
      setProcessingText('🤖 AI analysiert Bild...');
      const aiResult = await scanWithAI(file);
      
      if (aiResult) {
        console.log('✅ AI found:', aiResult);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        Quagga.stop();
        setProcessing(false);
        onScan(aiResult);
        return;
      }
      
      setProcessing(false);
      alert('Barcode nicht erkannt.\n\nTipps:\n• Halte das Produkt näher\n• Bessere Beleuchtung\n• Barcode gerade halten');
      
    } catch (err) {
      console.error('Capture error:', err);
      setProcessing(false);
      alert('Fehler beim Scannen');
    }
  };

  // AI Vision barcode recognition
  const scanWithAI = async (file) => {
    setProcessingText('🤖 AI analysiert Bild...');
    
    try {
      const base64 = await fileToBase64(file);
      
      const response = await fetch('/api/ai/scan-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      
      const data = await response.json();
      
      if (data.barcode) {
        return data.barcode;
      }
      return null;
    } catch (err) {
      console.error('AI scan error:', err);
      return null;
    }
  };

  // Photo scanning - Quagga first, then AI fallback
  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setProcessing(true);
    setProcessingText('📷 Scanne Barcode...');
    
    try {
      const Quagga = (await import('@ericblade/quagga2')).default;
      const imageUrl = URL.createObjectURL(file);
      
      // Try Quagga first
      const quaggaResult = await new Promise((resolve) => {
        Quagga.decodeSingle({
          src: imageUrl,
          numOfWorkers: 0,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader", "code_39_reader"],
          },
          locate: true,
          locator: { patchSize: "large", halfSample: false },
        }, resolve);
      });
      
      URL.revokeObjectURL(imageUrl);
      
      if (quaggaResult?.codeResult?.code) {
        console.log('✅ Quagga erkannt:', quaggaResult.codeResult.code);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        Quagga.stop();
        setProcessing(false);
        onScan(quaggaResult.codeResult.code);
        return;
      }
      
      // Quagga failed - try AI Vision
      console.log('Quagga fehlgeschlagen, versuche AI...');
      const aiResult = await scanWithAI(file);
      
      if (aiResult) {
        console.log('✅ AI erkannt:', aiResult);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        Quagga.stop();
        setProcessing(false);
        onScan(aiResult);
        return;
      }
      
      // Both failed
      setProcessing(false);
      alert('Barcode nicht erkannt.\n\nTipps:\n• Besseres Licht\n• Barcode größer im Bild\n• Schärferes Foto\n\nOder manuell eingeben.');
      
    } catch (err) {
      console.error('Photo scan error:', err);
      setProcessing(false);
      alert('Fehler beim Scannen.');
    }
  };

  const handleManualSubmit = async () => {
    if (manualInput.trim()) {
      try {
        const Quagga = (await import('@ericblade/quagga2')).default;
        Quagga.stop();
      } catch (e) {}
      onScan(manualInput.trim());
    }
  };

  const handleClose = async () => {
    try {
      const Quagga = (await import('@ericblade/quagga2')).default;
      Quagga.stop();
    } catch (e) {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black p-4 flex items-center justify-between z-20">
        <div>
          <h2 className="text-white font-bold text-xl">Barcode scannen</h2>
          <p className="text-white/70 text-sm">
            {processing ? processingText || '⏳ Wird gescannt...' : 
             scanning ? '📷 Barcode vor die Kamera halten' : 
             error ? '⚠️ ' + error : 
             '⏳ Kamera startet...'}
          </p>
        </div>
        <button onClick={handleClose} className="p-3 bg-white/20 rounded-full">
          <XMarkIcon className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Scanner View */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {/* Camera viewport */}
        <div 
          ref={scannerRef}
          id="scanner-container"
          className="absolute inset-0"
          style={{ 
            width: '100%', 
            height: '100%',
          }}
        />
        
        {/* Overlay with scan area */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Darkened areas */}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Clear scan area */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-36 bg-transparent border-0">
            {/* Cut out the dark overlay */}
            <div className="absolute inset-0" style={{ 
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }} />
            
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-rose-500 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-rose-500 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-rose-500 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-rose-500 rounded-br" />
            
            {/* Animated scan line */}
            {scanning && (
              <div className="absolute left-2 right-2 h-0.5 bg-rose-500" 
                style={{ 
                  animation: 'scanline 2s ease-in-out infinite',
                  boxShadow: '0 0 8px rgba(244,63,94,0.8)'
                }} 
              />
            )}
          </div>
        </div>
        
        {/* Torch button */}
        <button 
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-20 p-4 rounded-full shadow-lg pointer-events-auto ${
            torchOn ? 'bg-yellow-400 text-black' : 'bg-white/90 text-gray-800'
          }`}
        >
          🔦
        </button>
        
        {/* Help text */}
        <div className="absolute bottom-4 left-0 right-0 text-center z-20">
          <p className="text-white/80 text-sm">
            Halte den Barcode ruhig in den Rahmen
          </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black p-4 space-y-3 z-20">
        {showManual && (
          <div className="bg-white rounded-2xl p-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Barcode manuell eingeben:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="z.B. 4000417025005"
                className="flex-1 p-3 border-2 rounded-xl text-lg font-mono focus:border-rose-500 focus:outline-none"
                autoFocus
              />
              <button 
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
                className="px-5 py-3 bg-rose-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </div>
        )}
        
        {/* Main scan button */}
        {scanning && !showManual && (
          <button 
            onClick={captureAndScan}
            disabled={processing}
            className={`w-full py-4 mb-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 ${
              processing ? 'bg-gray-500' : 'bg-green-500 active:bg-green-600'
            } text-white`}
          >
            {processing ? processingText : '🎯 JETZT SCANNEN'}
          </button>
        )}
        
        <div className="flex justify-center gap-2">
          <button onClick={handleClose} className="px-4 py-3 bg-gray-700 text-white rounded-full text-sm">
            ✕
          </button>
          <label className={`px-4 py-3 bg-blue-500 text-white rounded-full text-sm font-medium cursor-pointer ${processing ? 'opacity-50' : ''}`}>
            {processing ? '⏳' : '📸 Foto'}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handlePhotoCapture}
              disabled={processing}
            />
          </label>
          <button 
            onClick={() => setShowManual(!showManual)} 
            className="px-4 py-3 bg-rose-500 text-white rounded-full text-sm font-medium"
          >
            {showManual ? '📷' : '⌨️'}
          </button>
        </div>
      </div>
      
      {/* Scan animation */}
      <style>{`
        @keyframes scanline {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
        #scannerRef video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}

// Product Lookup Modal - Extended with more product details
function ProductLookupModal({ barcode, existingProduct, onConfirm, onCancel, onManualAdd }) {
  const [loading, setLoading] = useState(!existingProduct);
  const [productInfo, setProductInfo] = useState(existingProduct || null);
  const [quantity, setQuantity] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_de,brands,image_front_url,image_url,categories_tags,quantity,serving_size,nutriments,ingredients_text_de,ingredients_text,nutriscore_grade,ecoscore_grade,nova_group,packaging,origins,countries,stores`);
      const offData = await offRes.json();
      
      if (offData.status === 1 && offData.product) {
        const p = offData.product;
        const nutriments = p.nutriments || {};
        
        setProductInfo({
          name: p.product_name_de || p.product_name || 'Unbekanntes Produkt',
          brand: p.brands || '',
          image: p.image_front_url || p.image_url || null,
          category: mapCategory(p.categories_tags?.[0]) || 'Sonstiges',
          barcode: code,
          source: 'Open Food Facts',
          // Extended info
          quantity_info: p.quantity || '', // e.g. "500ml", "250g"
          serving_size: p.serving_size || '',
          ingredients: p.ingredients_text_de || p.ingredients_text || '',
          packaging: p.packaging || '',
          origin: p.origins || '',
          // Nutrition per 100g
          nutrition: {
            energy_kcal: nutriments['energy-kcal_100g'],
            fat: nutriments.fat_100g,
            saturated_fat: nutriments['saturated-fat_100g'],
            carbs: nutriments.carbohydrates_100g,
            sugar: nutriments.sugars_100g,
            protein: nutriments.proteins_100g,
            salt: nutriments.salt_100g,
            fiber: nutriments.fiber_100g,
          },
          // Scores
          nutriscore: p.nutriscore_grade?.toUpperCase(),
          ecoscore: p.ecoscore_grade?.toUpperCase(),
          nova: p.nova_group,
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
            source: 'UPC Database',
            description: item.description || '',
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('UPC lookup failed');
      }

      // No database has this product - show not found but allow AI identification later
      console.log('Product not found in any database, barcode:', code);
      setProductInfo({
        name: '',
        brand: '',
        image: null,
        category: 'Sonstiges',
        barcode: code,
        source: 'Nicht gefunden',
        needsManualEntry: true
      });
      setNotFound(true);
    } catch (err) {
      console.error('Lookup error:', err);
      setNotFound(true);
    }
    setLoading(false);
  };
  
  // AI product identification from captured image
  const identifyWithAI = async () => {
    setLoading(true);
    try {
      // We need to capture a new image or use a stored one
      // For now, prompt user to take a photo
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
          setLoading(false);
          return;
        }
        
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const response = await fetch('/api/ai/identify-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                image: reader.result,
                barcode: barcode
              })
            });
            
            const data = await response.json();
            
            if (data.product) {
              setProductInfo({
                name: data.product.name || 'Unbekanntes Produkt',
                brand: data.product.brand || '',
                image: null,
                category: data.product.category || 'Sonstiges',
                barcode: barcode,
                source: '🤖 AI erkannt',
                description: data.product.description || '',
                quantity_info: data.product.quantity_info || '',
                price: data.product.estimated_price || null
              });
              setNotFound(false);
            } else {
              alert('AI konnte das Produkt nicht identifizieren.\nBitte manuell eingeben.');
            }
          } catch (err) {
            console.error('AI identify error:', err);
            alert('Fehler bei der AI-Erkennung');
          }
          setLoading(false);
        };
        reader.readAsDataURL(file);
      };
      
      input.click();
    } catch (err) {
      setLoading(false);
    }
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
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
              </div>
              <p className="font-bold text-lg mb-1">Produkt nicht in Datenbank</p>
              <p className="text-sm text-gray-500 mb-1">Barcode erkannt:</p>
              <p className="text-lg font-mono font-bold text-rose-600 mb-4">{barcode}</p>
              
              <p className="text-sm text-gray-600 mb-4">
                Dieses Produkt ist nicht in Open Food Facts oder UPC Database.
                <br/>Nutze AI-Erkennung oder gib es manuell ein.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={identifyWithAI}
                  className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  🤖 Mit AI erkennen (Foto)
                </button>
                <button
                  onClick={() => onManualAdd(barcode)}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  ✏️ Manuell eingeben
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Product Header */}
              <div className="flex gap-4 mb-4">
                {productInfo?.image ? (
                  <img src={productInfo.image} alt="" className="w-20 h-20 object-cover rounded-xl bg-gray-100" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                    <CubeIcon className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg leading-tight">{productInfo?.name}</p>
                  {productInfo?.brand && <p className="text-gray-500 text-sm">{productInfo.brand}</p>}
                  {productInfo?.quantity_info && (
                    <p className="text-rose-600 font-medium text-sm mt-1">{productInfo.quantity_info}</p>
                  )}
                  <p className="text-xs text-gray-400 font-mono mt-1">{barcode}</p>
                </div>
              </div>

              {/* Extended Product Info (collapsible) */}
              {(productInfo?.nutrition || productInfo?.ingredients) && (
                <div className="mb-4">
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full py-2 text-sm text-rose-600 font-medium flex items-center justify-center gap-1"
                  >
                    {showDetails ? '▲ Weniger Details' : '▼ Mehr Details anzeigen'}
                  </button>
                  
                  {showDetails && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm space-y-3">
                      {/* Scores */}
                      {(productInfo.nutriscore || productInfo.ecoscore) && (
                        <div className="flex gap-2">
                          {productInfo.nutriscore && (
                            <span className={`px-2 py-1 rounded font-bold text-white text-xs ${
                              productInfo.nutriscore === 'A' ? 'bg-green-500' :
                              productInfo.nutriscore === 'B' ? 'bg-lime-500' :
                              productInfo.nutriscore === 'C' ? 'bg-yellow-500' :
                              productInfo.nutriscore === 'D' ? 'bg-orange-500' : 'bg-red-500'
                            }`}>
                              Nutri-Score {productInfo.nutriscore}
                            </span>
                          )}
                          {productInfo.ecoscore && (
                            <span className={`px-2 py-1 rounded font-bold text-white text-xs ${
                              productInfo.ecoscore === 'A' ? 'bg-green-500' :
                              productInfo.ecoscore === 'B' ? 'bg-lime-500' :
                              productInfo.ecoscore === 'C' ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}>
                              Eco-Score {productInfo.ecoscore}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Nutrition Table */}
                      {productInfo.nutrition && Object.values(productInfo.nutrition).some(v => v) && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Nährwerte (pro 100g):</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {productInfo.nutrition.energy_kcal && <div>Kalorien: <b>{Math.round(productInfo.nutrition.energy_kcal)} kcal</b></div>}
                            {productInfo.nutrition.fat && <div>Fett: <b>{productInfo.nutrition.fat}g</b></div>}
                            {productInfo.nutrition.carbs && <div>Kohlenhydrate: <b>{productInfo.nutrition.carbs}g</b></div>}
                            {productInfo.nutrition.sugar && <div>Zucker: <b>{productInfo.nutrition.sugar}g</b></div>}
                            {productInfo.nutrition.protein && <div>Eiweiß: <b>{productInfo.nutrition.protein}g</b></div>}
                            {productInfo.nutrition.salt && <div>Salz: <b>{productInfo.nutrition.salt}g</b></div>}
                          </div>
                        </div>
                      )}
                      
                      {/* Ingredients */}
                      {productInfo.ingredients && (
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Zutaten:</p>
                          <p className="text-xs text-gray-600 line-clamp-3">{productInfo.ingredients}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Menge hinzufügen</label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <MinusIcon className="w-6 h-6" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center text-3xl font-bold border-b-2 border-rose-500 focus:outline-none"
                  />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <PlusIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Quick Quantity Buttons */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {[1, 5, 10, 20, 50].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`py-2 rounded-lg font-semibold text-sm ${
                      quantity === q ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Add Button */}
              <button
                onClick={() => onConfirm({ ...productInfo, quantity })}
                className="w-full py-4 bg-rose-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {existingProduct ? 'Bestand erhöhen' : 'Hinzufügen + zum Shop'}
              </button>
              
              {!existingProduct && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Produkt wird auch im Shop angelegt
                </p>
              )}
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

// Edit Inventory Modal with Image Upload
function EditInventoryModal({ item, onSave, onCancel, token }) {
  const [form, setForm] = useState({
    name: item.name || '',
    brand: item.brand || '',
    category: item.category || 'Sonstiges',
    price: item.price || '',
    image: item.image || '',
    min_stock: item.min_stock || 5
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const categories = ['Getränke', 'Snacks', 'Süßigkeiten', 'Obst & Gemüse', 'Milchprodukte', 'Tiefkühl', 'Haushalt', 'Pflege', 'Sonstiges'];

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('/api/upload/product', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setForm({ ...form, image: data.url });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...item, ...form });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-bold text-lg">Produkt bearbeiten</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produktbild</label>
            <div className="flex items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-rose-500 transition-colors"
              >
                {uploading ? (
                  <ArrowPathIcon className="w-8 h-8 text-rose-500 animate-spin" />
                ) : form.image ? (
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <CameraIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Klicke zum Hochladen</p>
                <p className="text-xs text-gray-400">JPG, PNG max. 5MB</p>
                {form.image && (
                  <button type="button" onClick={() => setForm({...form, image: ''})} className="text-xs text-red-500 mt-1">
                    Bild entfernen
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full p-3 border rounded-xl" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marke</label>
            <input type="text" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="w-full p-3 border rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full p-3 border rounded-xl bg-white">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preis (€)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="w-full p-3 border rounded-xl" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min. Bestand (Warnung)</label>
            <input type="number" value={form.min_stock} onChange={(e) => setForm({...form, min_stock: parseInt(e.target.value) || 5})} className="w-full p-3 border rounded-xl" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">
              Abbrechen
            </button>
            <button type="submit" className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold">
              Speichern
            </button>
          </div>
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
        
        <div className="flex-1 min-w-0" onClick={() => onEdit(item)}>
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
        <button onClick={() => onEdit(item)} className="py-2 px-3 bg-blue-50 text-blue-600 rounded-lg">
          <PencilIcon className="w-4 h-4" />
        </button>
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
  const user = useStore(state => state.user);
  const token = useStore(state => state.token);
  const _hasHydrated = useStore(state => state._hasHydrated);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [existingProduct, setExistingProduct] = useState(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [editItem, setEditItem] = useState(null);
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
      if (res.ok) {
        const data = await res.json();
        // Handle both array and object responses (API might return {} when empty)
        const items = Array.isArray(data) ? data : (data && typeof data === 'object' ? Object.values(data) : []);
        setInventory(Array.isArray(items) ? items : []);
      } else {
        setInventory([]);
      }
    } catch (err) {
      console.error('Load inventory error:', err);
      setInventory([]);
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
    const invArray = Array.isArray(inventory) ? inventory : [];
    const existing = invArray.find(i => i.barcode === barcode);
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

  const handleEditSave = async (data) => {
    try {
      const res = await fetch(`/api/inventory/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: data.name,
          brand: data.brand,
          category: data.category,
          price: data.price,
          image: data.image,
          min_stock: data.min_stock
        })
      });
      if (res.ok) {
        showToast('Gespeichert!');
        loadInventory();
      } else {
        showToast('Fehler beim Speichern', 'error');
      }
    } catch (err) {
      showToast('Netzwerkfehler', 'error');
    }
    setEditItem(null);
  };

  const safeInventory = Array.isArray(inventory) ? inventory : [];
  
  const filtered = safeInventory.filter(i => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.name?.toLowerCase().includes(q) && !i.barcode?.includes(q) && !i.brand?.toLowerCase().includes(q)) return false;
    }
    if (filter === 'low' && i.stock > 10) return false;
    if (filter === 'out' && i.stock > 0) return false;
    return true;
  });

  const stats = {
    total: safeInventory.length,
    totalStock: safeInventory.reduce((s, i) => s + (i.stock || 0), 0),
    low: safeInventory.filter(i => i.stock > 0 && i.stock <= 10).length,
    out: safeInventory.filter(i => i.stock === 0).length
  };

  if (!_hasHydrated) return <div className='min-h-screen flex items-center justify-center'><div className='w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin'></div></div>;
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
              onEdit={setEditItem}
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

      {editItem && (
        <EditInventoryModal
          item={editItem}
          token={token}
          onSave={handleEditSave}
          onCancel={() => setEditItem(null)}
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
