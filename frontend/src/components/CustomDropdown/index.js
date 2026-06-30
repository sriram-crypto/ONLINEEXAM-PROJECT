
import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";

const styles = {
  container: {
    width: "260px",
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #b0b8c0",
    background: "rgba(255,255,255,0.5)",
    backdropFilter: "blur(6px)",
    cursor: "pointer",
    fontSize: "15px",
  },
  dropdown: {
    position: "fixed",
    minWidth: "220px",
    background: "white",
    borderRadius: "10px",
    marginTop: 0,
    border: "1px solid #ddd",
    boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
    zIndex: 9999,
    maxHeight: "400px",
    overflowY: "auto",
    transition: "top 0.2s",
  },
  item: {
    padding: "12px",
    cursor: "pointer",
    fontSize: "15px",
  }
};

function CustomDropdown({ options, value, onChange, placeholder = "Select an option", style = {}, disabled = false, label }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [hovered, setHovered] = useState(-1);
  const [dropdownDirection, setDropdownDirection] = useState('down');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Decide dropdown direction (up/down) and position for portal dropdown
  useEffect(() => {
    function updateDropdownPos() {
      if (open && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        let direction = 'down';
        let top = rect.bottom;
        let bottom = undefined;
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
          direction = 'up';
          top = undefined;
          bottom = window.innerHeight - rect.top;
        }
        setDropdownDirection(direction);
        setDropdownPos({
          top,
          bottom,
          left: rect.left,
          width: rect.width,
        });
      }
    }
    if (open) {
      updateDropdownPos();
      window.addEventListener('scroll', updateDropdownPos, true);
      window.addEventListener('resize', updateDropdownPos);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPos, true);
      window.removeEventListener('resize', updateDropdownPos);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} style={{ ...styles.container, ...style }}>
      <input
        type="text"
        value={value ? options.find(opt => opt.value === value)?.label || value : ""}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          ...styles.input,
          cursor: disabled ? "not-allowed" : styles.input.cursor,
          background: disabled ? "#f5f5f5" : styles.input.background,
          color: disabled ? "#aaa" : "#222",
        }}
      />
      {open && !disabled && ReactDOM.createPortal(
        <div
          style={{
            ...styles.dropdown,
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            ...(dropdownDirection === 'up' ? { bottom: dropdownPos.bottom, top: undefined } : {}),
            pointerEvents: 'auto',
            zIndex: 9999,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {options.map((opt, i) => (
            <div
              key={opt.value ?? i}
              onMouseDown={e => {
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                ...styles.item,
                background: hovered === i ? '#e3f2fd' : '#fff',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(-1)}
            >
              {opt.label ?? opt.value}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

CustomDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.any.isRequired,
      label: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  disabled: PropTypes.bool,
};

export default CustomDropdown;
