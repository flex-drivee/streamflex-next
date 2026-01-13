import { useEffect } from "react";

/**
 * Hook: Detects clicks outside a target element AND Escape key presses.
 * Designed for modals, dropdowns, menus, etc.
 *
 * ✅ Supports mouse, touch, and ESC key.
 * ✅ Uses passive listeners for better performance on mobile.
 * ✅ Cleans up listeners automatically.
 *
 * @param ref - React ref to the element to detect clicks outside of
 * @param onClose - Callback when outside click or ESC key is detected
 * @param active - (optional) Attach listeners only when true (default: true)
 */
export function useClickOutside<T extends HTMLElement | null>(
  ref: React.RefObject<T>,
  onClose: () => void,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      // If clicked outside the element, trigger onClose
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // ✅ Passive listeners improve scroll & touch performance
    document.addEventListener("mousedown", handleClick, { passive: true });
    document.addEventListener("touchstart", handleClick, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    // ✅ Clean up on unmount or when `active` becomes false
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  // ✅ Dependency array limited to `active` for stability:
  // - Avoids reattaching listeners every render due to unstable callbacks.
  }, [active]);
}
