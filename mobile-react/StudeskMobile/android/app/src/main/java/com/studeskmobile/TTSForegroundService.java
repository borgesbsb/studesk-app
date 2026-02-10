package com.studeskmobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.media.session.MediaButtonReceiver;

public class TTSForegroundService extends Service {
    private static final String TAG = "TTSForegroundService";
    private static final String CHANNEL_ID = "TTSServiceChannel";
    private static final int NOTIFICATION_ID = 1;

    // Actions para controles
    public static final String ACTION_PLAY_PAUSE = "com.studeskmobile.PLAY_PAUSE";
    public static final String ACTION_STOP = "com.studeskmobile.STOP";
    public static final String ACTION_UPDATE_STATE = "com.studeskmobile.UPDATE_STATE";

    private PowerManager.WakeLock wakeLock;
    private MediaSessionCompat mediaSession;
    private boolean isPlaying = true;

    private final BroadcastReceiver controlReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            Log.d(TAG, "Controle recebido: " + action);

            if (ACTION_PLAY_PAUSE.equals(action)) {
                isPlaying = !isPlaying;
                Log.d(TAG, "Estado alterado para: " + (isPlaying ? "Playing" : "Paused"));
                updateNotification();
                // Enviar evento para React Native
                sendEventToReactNative("TTS_PLAY_PAUSE", isPlaying);
            } else if (ACTION_STOP.equals(action)) {
                isPlaying = false;
                Log.d(TAG, "Stop solicitado");
                // Enviar evento para React Native
                sendEventToReactNative("TTS_STOP", false);
                stopSelf();
            } else if (ACTION_UPDATE_STATE.equals(action)) {
                // Atualizar estado sem toggle
                boolean newState = intent.getBooleanExtra("isPlaying", isPlaying);
                if (isPlaying != newState) {
                    isPlaying = newState;
                    Log.d(TAG, "Estado atualizado externamente para: " + (isPlaying ? "Playing" : "Paused"));
                    updateNotification();
                }
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service criado");
        createNotificationChannel();
        setupMediaSession();

        // Registrar broadcast receiver para controles
        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PLAY_PAUSE);
        filter.addAction(ACTION_STOP);
        filter.addAction(ACTION_UPDATE_STATE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(controlReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(controlReceiver, filter);
        }

        // Adquirir wake lock para manter a CPU ativa mesmo com tela bloqueada
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "StudeskMobile::TTSWakeLock"
            );
            // Timeout de 10 minutos (600000 ms) por segurança
            wakeLock.acquire(10*60*1000L /*10 minutes*/);
        }
    }

    private void setupMediaSession() {
        mediaSession = new MediaSessionCompat(this, TAG);
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_STOP
            )
            .setState(PlaybackStateCompat.STATE_PLAYING, 0, 1.0f);

        mediaSession.setPlaybackState(stateBuilder.build());
        mediaSession.setActive(true);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                isPlaying = true;
                updateNotification();
                sendEventToReactNative("TTS_PLAY_PAUSE", true);
            }

            @Override
            public void onPause() {
                isPlaying = false;
                updateNotification();
                sendEventToReactNative("TTS_PLAY_PAUSE", false);
            }

            @Override
            public void onStop() {
                isPlaying = false;
                sendEventToReactNative("TTS_STOP", false);
                stopSelf();
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        MediaButtonReceiver.handleIntent(mediaSession, intent);
        startForeground(NOTIFICATION_ID, createNotification());
        return START_STICKY;
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Botão Play/Pause
        Intent playPauseIntent = new Intent(ACTION_PLAY_PAUSE);
        PendingIntent playPausePendingIntent = PendingIntent.getBroadcast(
            this,
            0,
            playPauseIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Botão Stop
        Intent stopIntent = new Intent(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Studesk - Leitura em Voz")
            .setContentText(isPlaying ? "Lendo material..." : "Pausado")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSound(null)
            .setVibrate(null)
            .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1))
            // Adicionar botões de controle
            .addAction(
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                isPlaying ? "Pausar" : "Reproduzir",
                playPausePendingIntent
            )
            .addAction(
                android.R.drawable.ic_delete,
                "Parar",
                stopPendingIntent
            );

        return builder.build();
    }

    private void updateNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification());
        }

        // Atualizar estado da media session
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_STOP
            )
            .setState(
                isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                0,
                1.0f
            );
        mediaSession.setPlaybackState(stateBuilder.build());
    }

    private void sendEventToReactNative(String eventName, boolean value) {
        Intent intent = new Intent(eventName);
        intent.putExtra("value", value);
        sendBroadcast(intent);
        Log.d(TAG, "Evento enviado: " + eventName + " = " + value);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service destruído");

        try {
            unregisterReceiver(controlReceiver);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao desregistrar receiver", e);
        }

        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Leitura de Material",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Mantém a leitura de texto em voz ativa");
            serviceChannel.setShowBadge(false);
            serviceChannel.setSound(null, null);
            serviceChannel.enableVibration(false);
            serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}
