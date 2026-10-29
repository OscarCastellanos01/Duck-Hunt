# Performance measurements

Targets: at least 30 stable inference fps on a mid-range Android device, p95 input-to-shot latency below 150 ms on desktop.

Numbers come from the debug overlay (`Debug overlay` toggle in the prototype). Use a 640x480 camera stream and keep the hand in view for at least 30 seconds before reading the values.

| Device    | Browser | Delegate | Inference fps | Inference ms (mean / p95) | Capture to inference ms (mean / p95) | Capture to shoot ms (mean / p95) |
| --------- | ------- | -------- | ------------- | ------------------------- | ------------------------------------ | -------------------------------- |
| _pending_ |         |          |               |                           |                                      |                                  |

## Notes

- Capture to shoot is measured from the camera capture timestamp of the frame that triggered the shot until the `shoot` event is emitted. It excludes rendering time.
- The `recoil` gesture adds up to its detection window (see `RECOIL_THRESHOLDS.windowMs`) on top of this value by design.
