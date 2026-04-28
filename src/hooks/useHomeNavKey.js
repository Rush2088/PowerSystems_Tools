import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Registers keyboard shortcuts that navigate to "/" (landing page).
 *
 * Bindings:
 *   • Alt + ArrowLeft  — always fires (browser back-nav equivalent)
 *   • Backspace        — fires only when focus is NOT on an editable element
 *                        (input, textarea, select, contenteditable)
 */
export function useHomeNavKey() {
  const navigate = useNavigate();

  useEffect(() => {
    function isEditableTarget(el) {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e) {
      // Alt + ArrowLeft — always navigate home
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate('/');
        return;
      }

      // Backspace — only when not focused on an editable element
      if (e.key === 'Backspace' && !isEditableTarget(document.activeElement)) {
        e.preventDefault();
        navigate('/');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
