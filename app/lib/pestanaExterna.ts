import { Linking, Platform } from 'react-native';

// Abre un enlace externo (t.me, wa.me, etc.) apenas está listo. En web hay
// un `await` (llamada a Supabase) entre el tap del botón y la apertura del
// enlace -- eso rompe el "gesto de usuario" y el navegador bloquea el popup
// si recién ahí se llama a `window.open`. Por eso, en web, se reserva la
// pestaña en blanco de forma síncrona ANTES del await, y se le asigna la
// URL cuando ya está lista (o se cierra si al final no hay enlace).
export function reservarPestanaExterna(): { asignar: (url: string | null) => void } {
  if (Platform.OS !== 'web') {
    return { asignar: (url) => { if (url) Linking.openURL(url); } };
  }
  const tab = window.open('', '_blank');
  return {
    asignar: (url) => {
      if (!tab) return;
      if (url) tab.location.href = url;
      else tab.close();
    },
  };
}
