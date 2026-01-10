"use client";

import { useEffect, useState } from "react";

/**
 * Hook para detectar media queries e responsividade
 * @param query - Media query string (ex: "(min-width: 768px)")
 * @returns boolean indicando se a media query está ativa
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Verificar se está no ambiente do navegador
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(query);

    // Definir valor inicial
    setMatches(media.matches);

    // Listener para mudanças
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Adicionar listener (compatível com navegadores antigos)
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      // Fallback para navegadores antigos
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hooks pré-configurados para breakpoints Tailwind
 */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () => useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const useIsLargeDesktop = () => useMediaQuery("(min-width: 1280px)");
