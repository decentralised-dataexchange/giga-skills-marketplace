'use client';

import { useEffect, useState } from 'react';

/**
 * True when the wallet is most likely on this same device, so a deep link
 * (`openid-credential-offer://`, `openid4vp://`) will open it directly and a
 * QR code would be useless: nobody can scan their own screen.
 *
 * Decided from a coarse pointer and a narrow viewport rather than a
 * user-agent string, so it follows the device rather than the browser's
 * claims. It starts false and settles after mount, which keeps the server
 * and the first client render identical. (The demonstrators' pattern.)
 */
export function useSameDevice(): boolean {
  const [sameDevice, setSameDevice] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse) and (max-width: 900px)');
    const update = () => setSameDevice(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return sameDevice;
}
