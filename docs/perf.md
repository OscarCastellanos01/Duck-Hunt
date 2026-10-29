# Performance measurements

Targets: at least 30 stable inference fps on a mid-range Android device, p95 input-to-shot latency below 150 ms on desktop.

Numbers come from the debug overlay (`Debug overlay` toggle in Settings or the `D` key). Use a 640x480 camera stream and keep the hand in view for at least 30 seconds before reading the values.

| Device             | Browser | Delegate | Inference fps | Inference ms (mean / p95) | Capture to inference ms (mean / p95) | Capture to shoot ms (mean / p95) |
| ------------------ | ------- | -------- | ------------- | ------------------------- | ------------------------------------ | -------------------------------- |
| Windows 11 desktop | Chrome  | GPU      | 30.0          | 9.0 / 11.4                | 18.6 / 26.4                          | 21.2 / 26.7                      |
| Mid-range Android  | Chrome  | -        | _pending_     | _pending_                 | _pending_                            | _pending_                        |

## Reading the desktop numbers

- Inference takes about 9 ms per frame, so the 30 fps comes from the camera and not from the model. There is plenty of headroom, which means moving inference to a Web Worker is not needed on desktop.
- The p95 capture-to-shoot latency is 26.7 ms, far below the 150 ms budget.
- The Android row is still pending: the 30 fps target on a mid-range device has not been verified.

## Notes

- Capture to shoot is measured from the camera capture timestamp of the frame that triggered the shot until the `shoot` event is emitted. It excludes rendering time and the one or two frames the thumb detector waits to confirm a drop (up to about 66 ms at 30 fps).
- The `recoil` gesture adds up to its detection window (see `RECOIL_THRESHOLDS.windowMs`) on top of this value by design.
