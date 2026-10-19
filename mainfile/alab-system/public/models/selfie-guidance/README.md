# Local selfie guidance assets

This directory provides **capture guidance only**: face presence, visible framing,
coarse head pose, and a continuous stable hold. It performs no face recognition,
identity decision, spoof detection, or certified liveness assessment. Camera
frames, landmark arrays, and worker image bitmaps remain in browser memory; frames
are never uploaded by this module. The signup flow owns any subsequent capture.

## Pinned sources and licensing

`mediapipe-1.1.1-face-landmarker-1/` contains:

- `vision_bundle.js` and `wasm/*`: unmodified files from the official npm package
  `@mediapipe/tasks-vision@1.1.1`, licensed Apache-2.0 by the MediaPipe Authors.
  [Official registry tarball](https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-1.1.1.tgz).
  Both SIMD and non-SIMD classic loader pairs are shipped. ES-module WASM loader
  variants are unused: the worker and fallback use `forVisionTasks(path)`.
- `face_landmarker.task`: Google's Face Landmarker float16 **version 1** bundle,
  [versioned download](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task).
  It packages BlazeFace short range, FaceMesh V2, and blendshape models. The model
  cards identify Apache-2.0 licensing:
  [BlazeFace](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf),
  [FaceMesh V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf),
  [Blendshape](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf).
- `LICENSE-2.0.txt`: full Apache-2.0 license from
  [apache.org](https://www.apache.org/licenses/LICENSE-2.0.txt).
- `worker.js`: ALAB's local worker adapter, not an upstream MediaPipe file.
- `assets-manifest.json`: exact byte sizes, SHA-256 hashes, and package/model
  provenance. The npm lockfile additionally pins the upstream tarball integrity.

Downloaded and verified 2026-10-19. No `latest` URLs or runtime CDNs are used.

Reproduce/check from the app root:

```sh
npm ci
node public/models/selfie-guidance/download-assets.mjs
node public/models/selfie-guidance/download-assets.mjs --check
node --test tests/resident-selfie-guidance.test.mjs tests/resident-selfie-guidance-runtime.test.mjs
```

When installing in an environment that should skip the existing native ONNX
download, set `ONNXRUNTIME_NODE_INSTALL=skip` before `npm ci`.

## Pose convention and geometry

The [official web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
documents local inference and that synchronous detection can block the UI. This
adapter prefers a private CPU worker with one transferred bitmap in flight,
longest image edge at most 640 pixels, and a 120 ms start-to-start cadence
(at most 8.3 fps). Inference time is included in that budget, so slow inference
does not incur an additional fixed wait. Unsupported workers use a conservative
240 ms budget for small-frame CPU inference on the main thread, with at least
50 ms idle time after each inference so slow fallback devices can repaint.

`createSelfieGuidanceSession()` lazily owns one task/worker for an open camera
dialog. Its `start(options)` replaces the active view and returns `{stop()}`;
per-view stop/abort/completion cancels callbacks and clears its canvas while
retaining the model for the next view. New views wait for an old in-flight frame
to finish and discard that result before sending another frame. The dialog must
call `close()` on cancel, unmount, navigation, error, or final capture; close
aborts initialization and terminates the worker/closes the CPU task. No global
model or camera-frame cache is kept. The standalone `startSelfieGuidance` API
still releases everything when that one view stops or completes.
Worker startup and any explicit worker-failure CPU fallback share one 90-second
initialization budget. A slow healthy worker keeps loading within that budget;
expiry fails with a retry message instead of restarting the model on the main
thread. Owner cancellation rejects immediately, and any CPU task finishing after
cancellation or expiry is closed. Per-view abort retains the owner's pending
initialization and its original deadline for the next view.

The [FaceMesh source documentation](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/face_mesh.md#multi_face_landmarks)
specifies x/y image normalization, z increasing away from the camera, and z's
roughly x-like scale. The [canonical mesh](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj)
and [eye connections](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py)
identify symmetric eye pairs: outer corners 33/263, inner corners 133/362, and
upper lids 159/386 (right/left from the subject's perspective).
The helper takes the median of each pair's
`atan2(z[right] - z[left], eye span)` on the **unmirrored source**:
positive yaw means anatomical right, negative means anatomical left. This is a
size-independent heuristic for modest turns, not a calibrated angle measurement.
Front accepts roughly +/-10 degrees, right/left require roughly 15-35 degrees.
Eye roll above 8 degrees and extreme vertical nose placement are rejected.
All three pairs must contain valid geometry; one noisy depth estimate cannot
change the pose when the other two pairs agree. No temporal smoothing can conceal
a missing face, extra face, or wrong anatomical turn.

Framing maps normalized landmarks into the actual video/oval DOM rectangles,
accounting for centered `object-fit: cover` crop and video `scaleX(-1)`. The oval
and video must be unbordered and use centered `object-position`, as in signup.
All oval landmarks must remain within the visible frame and oval; the face must
fill a useful portion and stay near the oval center. No face, a second face,
wrong pose, movement, hidden video, or a detection gap over 1000 ms resets the
900 ms hold. At least four stable detections are also required, allowing slower
CPU inference without accepting two widely spaced frames. In-flight results are
discarded after backgrounding, pausing, or camera dimension changes. A stalled
worker inference times out after 10 seconds and releases its worker.
Completion calls `onUpdate` with `ready: true, progress: 1` before
`onReady`, then stops. Explicit stop or AbortSignal prevents further callbacks.
Centering permits a face-center offset of 24% of an oval radius while retaining
the whole-face oval containment requirement. Stability allows center noise of
11% of a radius (11 pixels for a 200-pixel-wide oval); greater motion still
restarts the hold. Optional `state.direction` values are preview movement cues
(`left`, `right`, `up`, `down`, `closer`, `farther`, `center`, `hold`), while view
names remain the subject's anatomical right/left.

Synthetic geometry and lifecycle tests cover direction signs, cover/mirror
mapping, framing rejection, interrupted holds, one-shot completion, no queued
frames, initialization abort, worker termination, and CPU fallback cleanup.
