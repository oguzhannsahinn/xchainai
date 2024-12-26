import { useState, useEffect } from 'react';
import './CryptoList.css';

const CryptoList = () => {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const analyzeCrypto = (crypto) => {
    const changePercent = parseFloat(crypto.changePercent24Hr);
    const price = parseFloat(crypto.priceUsd);
    const volume = parseFloat(crypto.volumeUsd24Hr);
    const marketCap = parseFloat(crypto.marketCapUsd);
    const supply = parseFloat(crypto.supply);
    const maxSupply = parseFloat(crypto.maxSupply);
    const vwap24Hr = parseFloat(crypto.vwap24Hr); // 24 saatlik ağırlıklı ortalama fiyat

    // Temel metrikler
    const volumeToMarketCapRatio = volume / marketCap; // Yüksek oran = yüksek likidite
    const supplyRatio = maxSupply ? supply / maxSupply : 0.5; // Dolaşımdaki coin oranı
    const priceToVWAP = price / vwap24Hr; // 1'den büyükse fiyat ortalamanın üstünde

    let score = (
      // Mevcut faktörler (ağırlıkları güncellendi)
      (changePercent * 1.5) + // Değişim yüzdesi
      (Math.log10(volume) / 3) + // Hacim logaritmik olarak
      (price < 1 ? 3 : 0) + // Düşük fiyatlı coinler
      (price > 10000 ? -2 : 0) + // Yüksek fiyatlı coinler
      (marketCap > 1000000000 ? 2 : 0) + // Büyük market cap
      (Math.abs(changePercent) > 15 ? -8 : 0) + // Aşırı değişimler
      (marketCap < 1000000 ? -3 : 0) + // Çok düşük market cap

      // Yeni faktörler
      (volumeToMarketCapRatio * 10) + // Likidite skoru
      (supplyRatio < 0.9 ? 2 : -1) + // Düşük arz oranı pozitif
      (priceToVWAP > 1.1 ? -2 : priceToVWAP < 0.9 ? 2 : 0) + // VWAP'a göre fiyat pozisyonu
      (volume > 100000000 ? 3 : 0) + // Yüksek işlem hacmi
      (marketCap > 10000000000 ? 1 : -1) // Büyük projeler daha stabil
    );

    // Normalize etme (skoru -10 ile +10 arasına getirme)
    score = Math.max(-10, Math.min(10, score / 2));

    return score;
  };

  useEffect(() => {
    const fetchCryptos = async () => {
      try {
        setUpdating(true);
        setShowToast(true);

        const response = await fetch('https://api.coincap.io/v2/assets');
        const data = await response.json();
        
        // Önce market değerine göre sırala ve en yüksek 20'yi al
        const marketCapSortedCryptos = data.data
          .sort((a, b) => parseFloat(b.marketCapUsd) - parseFloat(a.marketCapUsd))
          .slice(0, 20);
        
        // Sonra analiz skorlarına göre sırala
        const analyzedCryptos = marketCapSortedCryptos.map(crypto => ({
          ...crypto,
          analysisScore: analyzeCrypto(crypto)
        }));

        // Son olarak skorlara göre sırala
        const sortedCryptos = analyzedCryptos.sort((a, b) => b.analysisScore - a.analysisScore);
        
        setCryptos(sortedCryptos);
        
        setTimeout(() => {
          setUpdating(false);
          setShowToast(false);
        }, 1000);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        setLoading(false);
        setUpdating(false);
        setShowToast(false);
      }
    };

    fetchCryptos();
    const interval = setInterval(fetchCryptos, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change) => {
    return parseFloat(change).toFixed(2);
  };

  const getRecommendationClass = (score) => {
    if (score > 10) return 'strong-buy';
    if (score > 5) return 'buy';
    if (score > 0) return 'neutral';
    if (score > -5) return 'sell';
    return 'strong-sell';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="crypto-container">
      <div className="disclaimer">
        Bu liste sadece bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.
      </div>
      
      <div className="info-section">
        <div className="info-header" onClick={() => setIsInfoOpen(!isInfoOpen)}>
          <span className={`info-icon ${isInfoOpen ? 'open' : ''}`}>▼</span>
          <span>Nasıl Kullanılır?</span>
        </div>
        <div className={`info-content ${isInfoOpen ? 'open' : ''}`}>
          Kripto para birimlerini gerçek zamanlı olarak takip edebileceğiniz bu panelde:
          <br /><br />
          • Fiyat değişimlerini anlık olarak görebilir,<br />
          • Renk kodlarıyla piyasa yönünü kolayca analiz edebilir,<br />
          • Teknik analiz verilerine dayalı alım-satım sinyallerini inceleyebilirsiniz.<br />
          <br />
          <strong>Renk Kodları:</strong><br />
          🟢 Koyu Yeşil: Güçlü alım fırsatı<br />
          🟩 Açık Yeşil: Alım fırsatı<br />
          ⬜️ Gri: Nötr bölge<br />
          🟧 Turuncu: Satış sinyali<br />
          🔴 Kırmızı: Güçlü satış sinyali<br />
          <br />
          Veriler her 30 saniyede bir otomatik olarak güncellenir.
        </div>
      </div>
      
      {showToast && (
        <div className="toast">
          <div className="toast-content">
            <div className="spinner"></div>
            Veriler analiz ediliyor...
          </div>
        </div>
      )}
      
      <div className={`crypto-list ${updating ? 'updating' : ''}`}>
        {cryptos.map((crypto, index) => (
          <div 
            key={crypto.id} 
            className={`crypto-item ${getRecommendationClass(crypto.analysisScore)}`}
          >
            <div className="crypto-rank">{index + 1}</div>
            <div className="crypto-name">
              <span className="symbol">{crypto.symbol}</span>
              <span className="name">{crypto.name}</span>
            </div>
            <div className="crypto-price">{formatPrice(crypto.priceUsd)}</div>
            <div className={`crypto-change ${parseFloat(crypto.changePercent24Hr) >= 0 ? 'positive' : 'negative'}`}>
              {formatChange(crypto.changePercent24Hr)}%
            </div>
            <div className="crypto-score">
              <span className="score-label">Skor:</span>
              <span className="score-value">{crypto.analysisScore.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoList;