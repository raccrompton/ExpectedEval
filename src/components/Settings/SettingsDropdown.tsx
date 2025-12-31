/**
 * SettingsDropdown Component
 *
 * Dropdown menu for configuring application settings:
 * - Probability Threshold (10%, 5%, 2%, 1%)
 * - Maia Level (1100-1900)
 * - SF Depth (10, 12, 14, 16, 18)
 * - Winrate Loss Threshold (3%, 5%, 10%)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSettingsContext } from '@/contexts/SettingsContext'

const PROB_OPTIONS = [
  { value: 0.10, label: '10%' },
  { value: 0.05, label: '5%' },
  { value: 0.02, label: '2%' },
  { value: 0.01, label: '1%' },
]

const MAIA_OPTIONS = [
  { value: 1100, label: '1100' },
  { value: 1200, label: '1200' },
  { value: 1300, label: '1300' },
  { value: 1400, label: '1400' },
  { value: 1500, label: '1500' },
  { value: 1600, label: '1600' },
  { value: 1700, label: '1700' },
  { value: 1800, label: '1800' },
  { value: 1900, label: '1900' },
]

const SF_DEPTH_OPTIONS = [
  { value: 10, label: '10' },
  { value: 12, label: '12' },
  { value: 14, label: '14' },
  { value: 16, label: '16' },
  { value: 18, label: '18' },
]

const WINRATE_LOSS_OPTIONS = [
  { value: 0.03, label: '3%' },
  { value: 0.05, label: '5%' },
  { value: 0.10, label: '10%' },
]

export function SettingsDropdown() {
  const { settings, updateSetting } = useSettingsContext()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, handleClickOutside])

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <div className="settings-container" ref={dropdownRef}>
      <button
        className="settings-button"
        data-testid="settings-button"
        onClick={toggleDropdown}
        aria-label="Settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Settings
      </button>

      {isOpen && (
        <div className="settings-dropdown" data-testid="settings-dropdown">
          <div className="settings-group">
            <label htmlFor="settings-prob-threshold">Prob Threshold</label>
            <select
              id="settings-prob-threshold"
              data-testid="settings-prob-threshold"
              value={settings.probabilityThreshold}
              onChange={(e) => updateSetting('probabilityThreshold', Number(e.target.value))}
            >
              {PROB_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label htmlFor="settings-maia-level">Maia Level</label>
            <select
              id="settings-maia-level"
              data-testid="settings-maia-level"
              value={settings.maiaLevel}
              onChange={(e) => updateSetting('maiaLevel', Number(e.target.value))}
            >
              {MAIA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label htmlFor="settings-sf-depth">SF Depth</label>
            <select
              id="settings-sf-depth"
              data-testid="settings-sf-depth"
              value={settings.stockfishDepth}
              onChange={(e) => updateSetting('stockfishDepth', Number(e.target.value))}
            >
              {SF_DEPTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group">
            <label htmlFor="settings-winrate-loss">Winrate Loss</label>
            <select
              id="settings-winrate-loss"
              data-testid="settings-winrate-loss"
              value={settings.winrateLossThreshold}
              onChange={(e) => updateSetting('winrateLossThreshold', Number(e.target.value))}
            >
              {WINRATE_LOSS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-container {
          position: relative;
        }

        .settings-button {
          background: transparent;
          border: 1px solid var(--color-border, #333);
          color: var(--color-text, #fff);
          padding: 6px 12px;
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .settings-button:hover {
          background: var(--color-surface-hover, #2a2a2a);
        }

        .settings-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--color-surface, #1a1a1a);
          border: 1px solid var(--color-border, #333);
          border-radius: var(--radius-md, 8px);
          padding: var(--space-md, 16px);
          min-width: 200px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 100;
        }

        .settings-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: var(--space-sm, 8px);
        }

        .settings-group:last-child {
          margin-bottom: 0;
        }

        .settings-group label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-text-muted, #888);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .settings-group select {
          background: var(--color-surface-alt, #222);
          border: 1px solid var(--color-border, #333);
          color: var(--color-text, #fff);
          padding: 6px 8px;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .settings-group select:focus {
          outline: none;
          border-color: var(--color-primary, #3b82f6);
        }
      `}</style>
    </div>
  )
}
