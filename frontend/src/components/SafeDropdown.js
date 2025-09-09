import React from 'react';
import PropTypes from 'prop-types';

const SafeDropdown = ({ 
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  required = false,
  disabled = false,
  emptyMessage = "No options available",
  className = "",
  convertToNumber = true // Add this flag to control ID conversion
}) => {
  // Handler to ensure IDs are properly converted to numbers when needed
  const handleChange = (e) => {
    if (convertToNumber && e.target.value && /^\d+$/.test(e.target.value)) {
      // Create a new synthetic event with the number value
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: parseInt(e.target.value, 10)
        }
      };
      onChange(newEvent);
    } else {
      onChange(e);
    }
  };

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      required={required}
      disabled={disabled}
      className={className}
      data-testid="safe-dropdown"
    >
      <option value="">{placeholder}</option>
      
      {options && options.length > 0 ? (
        options.map((option) => {
          const id = option.id || option.value || '';
          const name = option.name || option.label || option.text || '';
          
          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })
      ) : (
        <option value="" disabled>
          {emptyMessage}
        </option>
      )}
    </select>
  );
};

SafeDropdown.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string
    })
  ),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  emptyMessage: PropTypes.string,
  className: PropTypes.string,
  convertToNumber: PropTypes.bool
};

export default SafeDropdown;
