import { toast } from "react-toastify";

export const mostrarToast = (mensaje: string, onClose?: () => void) => {
    toast.success(
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo-bomberos.png" alt = "logo" style = {{ width: 32, height: 32 }} />
                < div >
                <div style={ { fontWeight: 'bold', fontSize: '1rem' } }> Bomberos Villa María </div>
                    < div style = {{ fontSize: '0.95rem' }}> { mensaje } </div>
                        </div>
                        </div>,
{
    position: "top-center",
        autoClose: 1000,
            hideProgressBar: false,
                closeOnClick: true,
                    pauseOnHover: false,
                        draggable: false,
                            onClose,
                            className: "toast-personalizado",
                                icon: false,
    }
  );
};
