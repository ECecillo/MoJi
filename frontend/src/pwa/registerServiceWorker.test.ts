import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './registerServiceWorker';

describe('registerServiceWorker', () => {
  it('ne fait rien quand le mode PWA est désactivé', () => {
    const register = vi.fn();
    const windowRef = makeImmediateLoadWindow();

    registerServiceWorker({
      enabled: false,
      navigatorRef: { serviceWorker: { register } },
      windowRef,
    });

    expect(windowRef.addEventListener).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("ne fait rien si l'API serviceWorker est absente", () => {
    const windowRef = makeImmediateLoadWindow();

    registerServiceWorker({
      enabled: true,
      navigatorRef: {},
      windowRef,
    });

    expect(windowRef.addEventListener).not.toHaveBeenCalled();
  });

  it('enregistre le service worker au chargement de la page', () => {
    const register = vi.fn().mockResolvedValue({});
    const windowRef = makeImmediateLoadWindow();

    registerServiceWorker({
      enabled: true,
      navigatorRef: { serviceWorker: { register } },
      windowRef,
    });

    expect(windowRef.addEventListener).toHaveBeenCalledWith('load', expect.any(Function), {
      once: true,
    });
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it("appelle le callback d'erreur si l'enregistrement échoue", async () => {
    const error = new Error('boom');
    const onError = vi.fn();
    const windowRef = makeImmediateLoadWindow();

    registerServiceWorker({
      enabled: true,
      navigatorRef: { serviceWorker: { register: vi.fn().mockRejectedValue(error) } },
      windowRef,
      onError,
    });
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
  });
});

function makeImmediateLoadWindow() {
  return {
    addEventListener: vi.fn((_type: 'load', listener: () => void) => {
      listener();
    }),
  };
}
