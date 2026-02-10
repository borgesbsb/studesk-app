package com.studeskmobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class TTSServiceModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TTSServiceModule";
    private static ReactApplicationContext reactContext;

    private final BroadcastReceiver eventReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            Log.d(TAG, "Evento recebido: " + action);

            if ("TTS_PLAY_PAUSE".equals(action)) {
                boolean value = intent.getBooleanExtra("value", false);
                sendEvent("TTS_PLAY_PAUSE", value);
            } else if ("TTS_STOP".equals(action)) {
                sendEvent("TTS_STOP", false);
            }
        }
    };

    TTSServiceModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;

        // Registrar receiver para eventos do serviço
        IntentFilter filter = new IntentFilter();
        filter.addAction("TTS_PLAY_PAUSE");
        filter.addAction("TTS_STOP");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(eventReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            context.registerReceiver(eventReceiver, filter);
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "TTSServiceModule";
    }

    private void sendEvent(String eventName, boolean value) {
        WritableMap params = Arguments.createMap();
        params.putBoolean("value", value);

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);

        Log.d(TAG, "Evento enviado para JS: " + eventName + " = " + value);
    }

    @ReactMethod
    public void startService() {
        try {
            Intent serviceIntent = new Intent(reactContext, TTSForegroundService.class);

            // Android 8.0 (Oreo) e superior requer startForegroundService
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
                Log.d(TAG, "Foreground service started (Android 8+)");
            } else {
                reactContext.startService(serviceIntent);
                Log.d(TAG, "Service started (Android < 8)");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting TTS foreground service", e);
        }
    }

    @ReactMethod
    public void stopService() {
        try {
            Intent serviceIntent = new Intent(reactContext, TTSForegroundService.class);
            reactContext.stopService(serviceIntent);
            Log.d(TAG, "Service stopped");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping TTS foreground service", e);
        }
    }

    @ReactMethod
    public void updatePlayingState(boolean isPlaying) {
        try {
            Intent intent = new Intent(TTSForegroundService.ACTION_UPDATE_STATE);
            intent.putExtra("isPlaying", isPlaying);
            reactContext.sendBroadcast(intent);
            Log.d(TAG, "Estado atualizado para: " + (isPlaying ? "Playing" : "Paused"));
        } catch (Exception e) {
            Log.e(TAG, "Error updating playing state", e);
        }
    }

    @ReactMethod
    public void checkBatteryOptimization(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                String packageName = reactContext.getPackageName();
                boolean isIgnoring = pm.isIgnoringBatteryOptimizations(packageName);
                promise.resolve(isIgnoring);
                Log.d(TAG, "Battery optimization ignored: " + isIgnoring);
            } else {
                promise.resolve(true); // Versões antigas não têm otimização de bateria
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking battery optimization", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                Log.d(TAG, "Requesting battery optimization exemption");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization exemption", e);
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        try {
            reactContext.unregisterReceiver(eventReceiver);
            Log.d(TAG, "Receiver unregistered");
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receiver", e);
        }
    }
}
