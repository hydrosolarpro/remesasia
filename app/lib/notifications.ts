import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * F8 — Registra el token de push (FCM en Android, APNs en iOS vía Expo) y lo guarda
 * en usuarios.push_token. El disparo real ocurre en el DB Webhook -> Edge Function (ver supabase/functions/notificar-cambio-estado).
 */
export async function registrarPushToken(usuarioId: string): Promise<string | null> {
  // El push nativo en web requiere una vapidPublicKey configurada en
  // app.json (ver https://docs.expo.dev/versions/latest/guides/using-vapid/),
  // que este proyecto no configura — sin eso, getDevicePushTokenAsync()
  // lanza un error no capturado en web. Como no se usa push en web, se
  // salta directamente en vez de sumar esa complejidad.
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const token = (await Notifications.getDevicePushTokenAsync()).data;
    await supabase.from('usuarios').update({ push_token: token }).eq('id', usuarioId);
    return token;
  } catch {
    return null;
  }
}
