"use client";

import { useEffect } from "react";

/**
 * Registra o service worker mínimo (`public/sw.js`) — necessário só pra
 * cumprir o critério de instalabilidade do Chrome/Android (PWA "Adicionar à
 * tela inicial"). Não implementa cache de dado de negócio nenhum — ver
 * comentários em `public/sw.js`. Mesmo padrão do lb-restaurante (ChefCont).
 */
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha silenciosa: o app funciona normalmente sem service worker,
      // só perde a instalabilidade como PWA.
    });
  }, []);

  return null;
}
