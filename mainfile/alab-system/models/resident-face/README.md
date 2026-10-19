# Resident photo comparison models

Model assets are pinned by the SHA-256 digest in `manifest.json`; they are loaded locally and never downloaded during a request.

Source revision: `opencv/opencv_zoo@47534e27c9851bb1128ccc0102f1145e27f23f98`. Run `node models/resident-face/download-models.mjs` from the application directory to reproduce the downloads. The maintenance script refuses bytes that differ from the published Git LFS SHA-256 and length.

YuNet is distributed under its accompanying MIT license. SFace is distributed under its accompanying Apache-2.0 license. The OpenCV C++ preprocessing/decoding reference is Apache-2.0; its license is also included.

No resident photographs or embeddings belong in this directory.

The implementation follows the OpenCV 4.13.0 `FaceDetectorYN` and `FaceRecognizerSF` sources linked in the manifest. YuNet receives raw BGR float NCHW pixels in its fixed 640×640 input, with the bounded image placed at the top left and black padding on the bottom/right. Its named stride-8/16/32 tensors are shape-checked, decoded, and suppressed using IoU 0.3. Detections need confidence 0.9, matching the OpenCV tutorial default. Every remaining face counts toward the single-face rule; there is no exception based on relative face size. A sole face below 16 pixels on either side or with landmarks outside the actual image is refused as unclear.

All five YuNet landmarks are fitted to the published 112×112 SFace template using an orientation-preserving least-squares similarity transform. The aligned RGB image is passed as raw RGB float NCHW pixels without external mean subtraction or division by 255; those operations must not be added based on a different face model's preprocessing. The final comparison normalizes both 128-element embeddings and computes cosine similarity.

The initial cosine threshold is **0.363**, the OpenCV SFace LFW reference operating point. It is not an identity probability, certified liveness check, document-authenticity result, or a substitute for evaluating deployment-specific photo quality and error rates with consenting participants.

Deployment must retain both `.onnx` files and trace the CPU native library/binding for its target platform. For Vercel Linux x64, those are `onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1` and `onnxruntime_binding.node`. Externalize `onnxruntime-node` and exclude other platforms, architectures and GPU provider binaries from the function. Set `ONNXRUNTIME_NODE_INSTALL=skip` (the deprecated `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` is also supported by the pinned version) during dependency installation so the installer does not fetch CUDA libraries.

Sessions are cached per server instance with CPU execution, two intra-op threads and one inter-op thread. At most two comparisons are admitted at once; excess requests receive `FACE_SERVICE_BUSY` immediately. Request images, aligned crops and embeddings are never cached, persisted or logged.
