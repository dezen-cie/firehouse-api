import React from 'react';
import './Toggle.scss';

type Props = {
  checked: boolean;
  onChange: (val: boolean) => void;
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  labelOn?: string;
  labelOff?: string;
};

/**
 * Composant toggle accessible (switch).
 * - Gère un état binaire (ON/OFF)
 * - Compatible ARIA (role="switch")
 * - Peut être utilisé pour activer/désactiver une option (ex : rôle admin/user)
 */
export default function Toggle({
  checked,
  onChange,
  id,
  disabled,
  ariaLabel,
  labelOn = 'Admin',
  labelOff = 'Utilisateur',
}: Props) {
  
  /**
   * Modifie l'état du switch si non désactivé.
   */
  function toggle() {
    if (!disabled) {
      onChange(!checked);
    }
  }

  /**
   * Active le switch avec clavier (espace ou entrée).
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div className={'fh-toggle-wrap' + (disabled ? ' is-disabled' : '')}>
      <button
        type="button"
        className="label-btn"
        onClick={toggle}
        disabled={disabled}
        aria-hidden
      >
        {checked ? labelOn : labelOff}
      </button>

      <button
        type="button"
        id={id}
        className={'fh-toggle' + (checked ? ' is-on' : '')}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (checked ? labelOn : labelOff)}
        onClick={toggle}
        onKeyDown={onKeyDown}
        disabled={disabled}
      >
        <span className="track">
          <span className="thumb" />
        </span>
      </button>
    </div>
  );
}
