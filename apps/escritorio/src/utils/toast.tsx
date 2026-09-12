import { toast } from 'sonner';

export const mostrarToast = (mensaje: string, onClose?: () => void) => {
  toast.success(mensaje, {
    onDismiss: onClose,
    onAutoClose: onClose,
  });
};
