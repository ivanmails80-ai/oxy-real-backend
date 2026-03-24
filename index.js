/**
 * Entry point con ErrorBoundary radice: evita schermata rossa di crash
 * e mostra fallback "Qualcosa è andato storto" per errori JS in fase di render.
 * I crash nativi (es. modulo nativo che fallisce all'avvio) non sono catturabili qui.
 */
import React from 'react';
import registerRootComponent from 'expo/src/launch/registerRootComponent';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';

function AppWithRootBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

registerRootComponent(AppWithRootBoundary);
