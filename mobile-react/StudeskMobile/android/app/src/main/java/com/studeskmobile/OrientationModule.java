package com.studeskmobile;

import android.app.Activity;
import android.content.pm.ActivityInfo;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class OrientationModule extends ReactContextBaseJavaModule {
    OrientationModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "OrientationModule";
    }

    @ReactMethod
    public void setLandscape() {
        final Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.runOnUiThread(() ->
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
            );
        }
    }

    @ReactMethod
    public void setPortrait() {
        final Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.runOnUiThread(() ->
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
            );
        }
    }

    @ReactMethod
    public void setAuto() {
        final Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.runOnUiThread(() ->
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
            );
        }
    }
}
