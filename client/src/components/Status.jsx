"use client";

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

const Status = ({ message, type, autoDismiss, onDismiss, dismissTime, customIcon }) => {
  const [visible, setVisible] = useState(true);

  const statusStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    default: "bg-[#112436] text-[#C4A661]",
  };

  const statusIcons = {
    success: <CheckCircle className="w-6 h-6 mr-2" />,
    error: <XCircle className="w-6 h-6 mr-2" />,
    info: <Info className="w-6 h-6 mr-2" />,
    default: <AlertCircle className="w-6 h-6 mr-2" />,
  };

  useEffect(() => {
    if (autoDismiss && (type === 'success' || type === 'info')) {
      const timer = setTimeout(() => {
        setVisible(false); // Start fading out
        setTimeout(() => onDismiss && onDismiss(), 300); // Wait for fade-out
      }, dismissTime - 300);
      return () => clearTimeout(timer);
    }
  }, [type, autoDismiss, dismissTime, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`p-4 rounded-lg shadow-md flex items-center transition-opacity duration-300 ${
        statusStyles[type] || statusStyles.default
      }`}
    >
      {customIcon || statusIcons[type] || statusIcons.default}
      <p className="text-lg font-bold">{message}</p>
    </div>
  );
};

Status.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info', 'default']),
  autoDismiss: PropTypes.bool,
  onDismiss: PropTypes.func,
  dismissTime: PropTypes.number,
  customIcon: PropTypes.node,
};

Status.defaultProps = {
  type: 'default',
  autoDismiss: false,
  dismissTime: 5000,
  onDismiss: null,
  customIcon: null,
};

export default Status;
