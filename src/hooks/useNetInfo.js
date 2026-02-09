/**
 * Hook stato rete (audit 6.3). Richiede: npm install @react-native-community/netinfo
 * Se il pacchetto non è installato, restituisce isConnected: true per non bloccare l'app.
 */
import { useState, useEffect } from 'react';

let netInfoModule = null;
try {
  netInfoModule = require('@react-native-community/netinfo').default;
} catch (_) {
  // Pacchetto non installato: l'app funziona uguale, solo il banner offline non viene mostrato
}

export function useNetInfo() {
  const [isConnected, setIsConnected] = useState(netInfoModule ? null : true);

  useEffect(() => {
    if (!netInfoModule) return;
    try {
      const unsubscribe = netInfoModule.addEventListener((state) => {
        setIsConnected(state?.isConnected ?? false);
      });
      return () => unsubscribe?.();
    } catch (_) {
      setIsConnected(true);
    }
  }, []);

  return { isConnected: isConnected === null ? true : isConnected };
}
