import { useEffect, useRef } from 'react';
import './AutocompleteDropdown.css';

interface AutocompleteDropdownProps {
  suggestions: string[];
  selectedIndex: number;
  position: { x: number; y: number };
  onSelect: (suggestion: string) => void;
  onClose: () => void;
}

export function AutocompleteDropdown({
  suggestions,
  selectedIndex,
  position,
  onSelect,
  onClose,
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="autocomplete-dropdown"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion}-${index}`}
          ref={index === selectedIndex ? selectedRef : null}
          className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={(e) => e.currentTarget.classList.add('hovered')}
          onMouseLeave={(e) => e.currentTarget.classList.remove('hovered')}
        >
          <span className="autocomplete-match">{suggestion.slice(0, suggestions[0].length)}</span>
          <span className="autocomplete-rest">{suggestion.slice(suggestions[0].length)}</span>
        </div>
      ))}
    </div>
  );
}
