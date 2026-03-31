'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface GameSettingsContextValue {
  cardsHidden: boolean;
  toggleCardsHidden: () => void;
}

const GameSettingsContext = createContext<GameSettingsContextValue>({
  cardsHidden: false,
  toggleCardsHidden: () => {},
});

export function GameSettingsProvider({ children }: { children: ReactNode }) {
  const [cardsHidden, setCardsHidden] = useState(false);
  return (
    <GameSettingsContext.Provider value={{ cardsHidden, toggleCardsHidden: () => setCardsHidden(h => !h) }}>
      {children}
    </GameSettingsContext.Provider>
  );
}

export default function useGameSettings() {
  return useContext(GameSettingsContext);
}
