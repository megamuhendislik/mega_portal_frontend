import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Users } from 'lucide-react';

const OrgChartContextMenu = ({ visible, position, employee, onClose, onEditManagers }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible || !employee) return null;

  const menuWidth = 220;
  const menuHeight = 44;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const left = position.x + menuWidth > vw ? position.x - menuWidth : position.x;
  const top = position.y + menuHeight > vh ? position.y - menuHeight : position.y;

  const handleEditManagers = () => {
    onEditManagers(employee);
    onClose();
  };

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed bg-slate-800 rounded-lg shadow-2xl py-1 animate-fade-in"
      style={{
        left,
        top,
        zIndex: 10002,
        minWidth: menuWidth,
        opacity: 1,
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={handleEditManagers}
        className="px-4 py-2.5 text-sm text-white hover:bg-white/10 cursor-pointer flex items-center gap-3 transition-colors rounded-lg"
      >
        <Users size={16} />
        <span>Yöneticileri Düzenle</span>
      </div>
    </div>,
    document.body
  );
};

export default OrgChartContextMenu;
