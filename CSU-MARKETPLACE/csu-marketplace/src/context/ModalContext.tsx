import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AlertConfig {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
}

interface ModalContextType {
  loginModalOpen: boolean;
  registerModalOpen: boolean;
  alertModalOpen: boolean;
  alertConfig: AlertConfig;
  setLoginModalOpen: (open: boolean) => void;
  setRegisterModalOpen: (open: boolean) => void;
  setAlertModalOpen: (open: boolean) => void;
  showAlert: (config: AlertConfig) => void;
  showModal: (title: string, message: string, onConfirm?: () => void) => void;
  showSuccess: (title: string, message: string, onConfirm?: () => void) => void;
  showError: (title: string, message: string, onConfirm?: () => void) => void;
  showWarning: (title: string, message: string, onConfirm?: () => void) => void;
  showInfo: (title: string, message: string, onConfirm?: () => void) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK'
  });

  const showAlert = (config: AlertConfig) => {
    setAlertConfig({
      confirmText: 'OK',
      ...config
    });
    setAlertModalOpen(true);
  };

  // Generic showModal function for compatibility
  const showModal = (title: string, message: string, onConfirm?: () => void) => {
    showInfo(title, message, onConfirm);
  };

  const showSuccess = (title: string, message: string, onConfirm?: () => void) => {
    showAlert({ title, message, type: 'success', onConfirm });
  };

  const showError = (title: string, message: string, onConfirm?: () => void) => {
    showAlert({ title, message, type: 'error', onConfirm });
  };

  const showWarning = (title: string, message: string, onConfirm?: () => void) => {
    showAlert({ title, message, type: 'warning', onConfirm });
  };

  const showInfo = (title: string, message: string, onConfirm?: () => void) => {
    showAlert({ title, message, type: 'info', onConfirm });
  };

  return (
    <ModalContext.Provider
      value={{
        loginModalOpen,
        registerModalOpen,
        alertModalOpen,
        alertConfig,
        setLoginModalOpen,
        setRegisterModalOpen,
        setAlertModalOpen,
        showAlert,
        showModal,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};