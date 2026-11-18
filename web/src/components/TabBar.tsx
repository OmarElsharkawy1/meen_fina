import { useRef, type KeyboardEvent, type ReactNode } from 'react';

type Tab<T extends string> = { id: T; label: string; count: number };

type Props<T extends string> = {
  label: string;
  tabs: Tab<T>[];
  selected: T;
  onSelect(id: T): void;
  idPrefix: string;
  children: ReactNode;
};

/** Segmented tabs that stay pinned under the header; arrow keys move between them. */
export function TabBar<T extends string>({ label, tabs, selected, onSelect, idPrefix, children }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, index: number) {
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (e.key === forward) next = (index + 1) % tabs.length;
    else if (e.key === backward) next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <>
      <div className="tabbar" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={active ? 0 : -1}
              className="tab"
              onClick={() => onSelect(tab.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="count">{tab.count}</span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${idPrefix}-panel`}
        aria-labelledby={`${idPrefix}-tab-${selected}`}
        className="stack tab-panel"
        key={selected}
      >
        {children}
      </div>
    </>
  );
}
