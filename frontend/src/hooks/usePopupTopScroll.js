import { useEffect } from 'react';

export default function usePopupTopScroll(isOpen, refs = [], dependencies = []) {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const scrollTargetsToTop = () => {
      refs.forEach((ref) => {
        ref?.current?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      });

      const primaryTarget = refs.find((ref) => ref?.current)?.current;
      primaryTarget?.scrollIntoView?.({ block: 'start', inline: 'nearest', behavior: 'auto' });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    let timeoutId = null;

    const frameId = window.requestAnimationFrame(() => {
      scrollTargetsToTop();
      timeoutId = window.setTimeout(scrollTargetsToTop, 0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isOpen, ...dependencies]);
}
