// src/components/SearchableSelect/SearchableSelect.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';
import './SearchableSelect.css';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  meta?: any;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string, option?: SearchableOption) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Buscar...',
  disabled = false,
  required = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Encontrar la opción actualmente seleccionada
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Si no está abierto el menú, el texto visible en el input es la etiqueta seleccionada
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption ? selectedOption.label : '');
    }
  }, [selectedOption, isOpen]);

  // Filtrado de opciones en tiempo real
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim() || (selectedOption && searchTerm === selectedOption.label)) {
      return options;
    }
    const normalize = (str?: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const term = normalize(searchTerm);
    return options.filter((opt) => {
      const matchLabel = normalize(opt.label).includes(term);
      const matchSub = normalize(opt.sublabel).includes(term);
      const matchBadge = normalize(opt.badge).includes(term);
      return Boolean(matchLabel || matchSub || matchBadge);
    });
  }, [options, searchTerm, selectedOption]);

  // Reset del highlighted index al filtrar
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Click fuera para cerrar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    // Si ya está seleccionado, seleccionar el texto para poder escribir encima directamente
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleSelectOption = (option: SearchableOption) => {
    onChange(option.value, option);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.searchable-option-item');
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
    >
      <div
        className="searchable-input-wrapper"
        onClick={() => {
          if (!disabled && inputRef.current) {
            inputRef.current.focus();
          }
        }}
      >
        {selectedOption?.badge && (!isOpen || searchTerm === selectedOption.label) && (
          <span
            className="searchable-selected-badge"
            title={selectedOption.badge}
          >
            {selectedOption.badge}
          </span>
        )}

        <input
          ref={inputRef}
          id={id}
          type="text"
          className="searchable-input"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !value}
          autoComplete="off"
        />

        <div className="searchable-input-actions">
          {value && !disabled && (
            <button
              type="button"
              className="btn-searchable-clear"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Limpiar selección"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            className="btn-searchable-toggle"
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setIsOpen((prev) => !prev);
              if (!isOpen && inputRef.current) {
                inputRef.current.focus();
              }
            }}
            tabIndex={-1}
            aria-label="Desplegar opciones"
          >
            <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="searchable-dropdown" onClick={(e) => e.stopPropagation()}>
          {filteredOptions.length === 0 ? (
            <div className="searchable-empty-msg">
              <Search size={14} />
              <span>Sin resultados para "{searchTerm}"</span>
            </div>
          ) : (
            <ul ref={listRef} className="searchable-options-list" role="listbox">
              {filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    className={`searchable-option-item ${isSelected ? 'is-selected' : ''} ${
                      isHighlighted ? 'is-highlighted' : ''
                    }`}
                    onClick={() => handleSelectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="option-content">
                      <div className="option-main-row">
                        {option.badge && (
                          <span className="option-badge">{option.badge}</span>
                        )}
                        <span className="option-label">{option.label}</span>
                      </div>
                      {option.sublabel && (
                        <span
                          className={`option-sublabel ${
                            option.sublabel.toLowerCase() === 'guardia'
                              ? 'option-sublabel--guardia'
                              : ''
                          }`}
                        >
                          {option.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={16} className="option-check-icon" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
