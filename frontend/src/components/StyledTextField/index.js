import React from "react";
import { TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

// Clean, modern styled TextField component
const StyledTextFieldRoot = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease-in-out',
    '& fieldset': {
      borderColor: '#d0d5dd',
      borderWidth: '1px',
      transition: 'border-color 0.2s ease-in-out',
    },
    '&:hover fieldset': {
      borderColor: '#98a2b3',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#1976d2',
      borderWidth: '2px',
    },
    '&.Mui-disabled': {
      backgroundColor: '#f9fafb',
      '& fieldset': {
        borderColor: '#e4e7ec',
      },
    },
    '& input': {
      padding: '10px 14px',
      fontSize: '14px',
      color: '#101828',
      fontFamily: 'inherit',
      '&::placeholder': {
        color: '#98a2b3',
        opacity: 1,
      },
    },
    '& textarea': {
      padding: '10px 14px',
      fontSize: '14px',
      color: '#101828',
      fontFamily: 'inherit',
      '&::placeholder': {
        color: '#98a2b3',
        opacity: 1,
      },
    },
    '& .MuiSelect-select': {
      padding: '10px 14px !important',
      fontSize: '14px',
      color: '#101828',
      fontFamily: 'inherit',
      display: 'flex',
      alignItems: 'center',
    },
    '& .MuiSelect-icon': {
      color: '#667085',
      right: '12px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '14px',
    color: '#344054',
    fontWeight: 500,
    transform: 'translate(14px, -9px) scale(0.85)',
    backgroundColor: '#fff',
    padding: '0 4px',
    fontFamily: 'inherit',
    '&.Mui-focused': {
      color: '#1976d2',
    },
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -9px) scale(0.85)',
    },
    '&.Mui-disabled': {
      color: '#98a2b3',
    },
  },
  '& .MuiFormHelperText-root': {
    fontSize: '12px',
    marginLeft: '4px',
    marginTop: '4px',
    fontFamily: 'inherit',
  },
}));



const StyledTextField = React.forwardRef((props, ref) => {
  const isSelect = !!props.select;

  // When clicking anywhere on the select box, open the dropdown
  const handleClick = (e) => {
    if (isSelect && ref && typeof ref !== 'function' && ref.current && typeof ref.current.focus === 'function') {
      ref.current.focus();
      // Try to open the dropdown by simulating a keydown (ArrowDown)
      const evt = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      ref.current.dispatchEvent(evt);
    }
    if (props.onClick) props.onClick(e);
  };

  return (
    <div onClick={handleClick} style={{ width: '100%' }}>
      <StyledTextFieldRoot
        {...props}
        ref={ref}
        variant="outlined"
        InputLabelProps={{
          shrink: true,
          ...props.InputLabelProps,
        }}
      />
    </div>
  );
});

StyledTextField.displayName = "StyledTextField";

export default StyledTextField;
