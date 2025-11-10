"use client";
import { useState } from "react";

export default function CustomDropdown(props) {
  const { onSelectSetting, screeningSetting, settingList, placeholder, invalid, variant } = props as any;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="dropdown w-100">
      <button
        disabled={settingList.length === 0}
        className="dropdown-btn fade-in-bottom"
        style={{ width: "100%", textTransform: "capitalize", fontFamily: 'Satoshi, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontSize: 16, fontWeight: screeningSetting ? 600 : 500, color: screeningSetting ? '#181D27' : '#717680', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${invalid ? '#FDA29B' : '#E9EAEB'}`, borderRadius: 8, background: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          {variant === 'screening' && screeningSetting && (
            <>
              {screeningSetting === 'Good Fit and Above' && <img src="/icons/checkV5.svg" alt="single check" width={20} height={12} />}
              {screeningSetting === 'Only Strong Fit' && <img src="/icons/doublecheck.svg" alt="double check" width={20} height={12} />}
              {screeningSetting === 'No Automatic Promotion' && <img src="/icons/x.svg" alt="no auto" width={16} height={16} style={{ opacity: 0.6 }} />}
            </>
          )}
          {variant === 'preScreening' && screeningSetting && (
            (() => {
              const selectedItem = settingList.find(item => item.name === screeningSetting);
              return selectedItem?.icon ? <img src={selectedItem.icon} alt="" width={16} height={16} /> : null;
            })()
          )}
          {screeningSetting ? (
            <span>{screeningSetting.replace("_", " ")}</span>
          ) : (
            <span style={{ fontWeight: 500 }}>{placeholder}</span>
          )}
        </span>
        <i className="la la-angle-down ml-10"></i>
      </button>
      <div
        className={`dropdown-menu w-100 mt-1 org-dropdown-anim${dropdownOpen ? " show" : ""}`}
        style={{
          padding: 10,
          maxHeight: variant === 'preScreening' ? 'none' : 200,
          overflowY: variant === 'preScreening' ? 'visible' : 'auto',
          background: '#fff',
          border: '1px solid #E9EAEB',
          borderRadius: 12,
          boxShadow: '0 4px 8px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.03)',
          overflow: 'hidden' // <-- clip child hover backgrounds
        }}
      >
        {settingList.map((setting, index) => {
          const selected = setting.name === screeningSetting;
          const isNone = setting.name === 'No Automatic Promotion';
          return (
            <div key={index} style={{}}>
              <button
                // Removed bootstrap dropdown-item class to avoid its hover
                className="nwz-dd-item"
                style={{
                  width: '100%',
                  border: 'none',
                  background: selected ? '#F8F9FC' : 'transparent',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontWeight: selected ? 700 : 500,
                  color: selected ? '#181D27' : '#181D27'
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = '#F3F0FF'; // subtle hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = selected ? '#F8F9FC' : 'transparent';
                }}
                onClick={() => { onSelectSetting(setting.name); setDropdownOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {variant === 'screening' && (
                    <>
                      {setting.name === 'Good Fit and Above' && <img src="/icons/checkV5.svg" width={20} height={12} />}
                      {setting.name === 'Only Strong Fit' && <img src="/icons/doublecheck.svg" width={20} height={12} style={{ opacity: selected ? 1 : 0.35 }} />}
                      {setting.name === 'No Automatic Promotion' && <img src="/icons/x.svg" width={16} height={16} style={{ opacity: 0.6 }} />}
                    </>
                  )}
                  {variant === 'preScreening' && setting.icon && (
                    <img src={setting.icon} width={16} height={16} />
                  )}
                  <span style={{ fontSize: 14 }}>{setting.name}</span>
                </div>
                {selected && (variant === 'screening' || variant === 'preScreening') && (
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.5 1.5l-8 9-5-5" stroke="#6172F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}