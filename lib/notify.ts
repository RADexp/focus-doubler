export type PermissionResult = NotificationPermission | "unsupported";

const ICON = "/icon-192.png";

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): PermissionResult {
  if (!notifySupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotifyPermission(): Promise<PermissionResult> {
  if (!notifySupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Powiadomienie systemowe. Preferujemy service workera — na iOS (PWA dodane do
 * ekranu głównego) to jedyna działająca droga, a na desktopie dzięki temu klik
 * w powiadomienie potrafi przywrócić okno aplikacji.
 */
export async function notify(
  title: string,
  body: string,
  tag: string,
): Promise<void> {
  if (!notifySupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: ICON,
    badge: ICON,
    lang: "pl",
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        ...options,
        // check-in ma czekać, aż wrócisz — nie znikać po kilku sekundach
        requireInteraction: tag === "checkin",
      } as NotificationOptions);
      return;
    }
    new Notification(title, options);
  } catch (e) {
    console.error("Powiadomienie nieudane:", e);
  }
}

/** Zamyka wiszące powiadomienie o danym tagu (np. po odbębnieniu check-inu). */
export async function closeNotifications(tag: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg?.getNotifications) return;
    const list = await reg.getNotifications({ tag });
    list.forEach((n) => n.close());
  } catch {
    /* ignore */
  }
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // W dev SW cache'owałby zasoby HMR — rejestrujemy tylko w wersji produkcyjnej.
  if (process.env.NODE_ENV !== "production") return;
  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.error("Rejestracja service workera nieudana:", e);
    });
  };
  // Hydracja Reacta potrafi wypaść po zdarzeniu "load" — wtedy listener
  // nigdy by nie wystrzelił, więc sprawdzamy stan dokumentu.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
