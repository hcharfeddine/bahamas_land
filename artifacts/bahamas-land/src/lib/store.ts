import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new Event("local-storage"));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}" on change:`, error);
      }
    };

    window.addEventListener("local-storage", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("local-storage", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue] as const;
}

// specific hooks
export const useUsername = () => useLocalStorage<string>("ogs_username", "");
export const useCoins = () => useLocalStorage<number>("ogs_coins", 1000);

export type Verdict = { id: string; username: string; text: string; verdict: string; timestamp: number };
export const useVerdicts = () => useLocalStorage<Verdict[]>("ogs_verdicts", []);

export type MuseumItem = { id: string; image: string | null; caption: string; username: string; label: string; respect: number; timestamp: number };
export const useMuseum = () => useLocalStorage<MuseumItem[]>("ogs_museum", []);

export const useSecretVisitors = () => useLocalStorage<number>("ogs_secret_visitors", 0);
