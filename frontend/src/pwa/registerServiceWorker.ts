interface ServiceWorkerRegistrar {
  register(scriptURL: string): Promise<unknown>;
}

interface NavigatorWithServiceWorker {
  serviceWorker?: ServiceWorkerRegistrar;
}

interface WindowWithLoadEvent {
  addEventListener(
    type: 'load',
    listener: () => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

interface RegisterServiceWorkerOptions {
  enabled?: boolean;
  serviceWorkerUrl?: string;
  navigatorRef?: NavigatorWithServiceWorker;
  windowRef?: WindowWithLoadEvent;
  onError?: (error: unknown) => void;
}

export function registerServiceWorker(options: RegisterServiceWorkerOptions = {}): void {
  const enabled = options.enabled ?? import.meta.env.PROD;
  const navigatorRef = options.navigatorRef ?? navigator;
  const windowRef = options.windowRef ?? window;
  const serviceWorkerUrl = options.serviceWorkerUrl ?? '/sw.js';
  const onError =
    options.onError ??
    ((error: unknown) => {
      console.warn('Service worker registration failed:', error);
    });

  if (!enabled || !navigatorRef.serviceWorker) {
    return;
  }

  windowRef.addEventListener(
    'load',
    () => {
      void navigatorRef.serviceWorker?.register(serviceWorkerUrl).catch(onError);
    },
    { once: true },
  );
}
