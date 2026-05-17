import { useEffect, useRef, useState } from "react";

type DetResult = {
  faceCount: number;
  gazeOk: boolean | null;
  backend: string;
  fps: number;
};

export function AdminFaceTest() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const faceApiRef = useRef<any>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsFrames  = useRef<number[]>([]);

  const [videoSrc, setVideoSrc]     = useState<string | null>(null);
  const [status,   setStatus]       = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result,   setResult]       = useState<DetResult | null>(null);
  const [errMsg,   setErrMsg]       = useState<string | null>(null);
  const [running,  setRunning]      = useState(false);

  async function loadModels() {
    setStatus("loading");
    setErrMsg(null);
    try {
      const faceapi = await import("face-api.js");
      // Force WebGL (GPU) backend
      try { await (faceapi as any).tf.setBackend("webgl"); } catch {}
      const backend: string = (faceapi as any).tf?.getBackend?.() ?? "unknown";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/face-api-weights"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/face-api-weights"),
      ]);
      faceApiRef.current = { faceapi, backend };
      setStatus("ready");
      setResult((r) => r ? { ...r, backend } : null);
    } catch (e: any) {
      setErrMsg(e?.message ?? "Failed to load models");
      setStatus("error");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setResult(null);
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (status === "idle") loadModels();
  }

  function startDetection() {
    const vid = videoRef.current;
    const cvs = canvasRef.current;
    const api = faceApiRef.current;
    if (!vid || !cvs || !api) return;

    const { faceapi, backend } = api;
    setRunning(true);
    fpsFrames.current = [];

    timerRef.current = setInterval(async () => {
      if (vid.paused || vid.ended || vid.readyState < 2) return;
      const t0 = performance.now();
      try {
        const results = await faceapi
          .detectAllFaces(vid, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
          .withFaceLandmarks();

        const count = results.length;
        let gazeOk: boolean | null = count === 1 ? true : null;

        // Draw overlay
        const ctx = cvs.getContext("2d")!;
        cvs.width  = vid.videoWidth  || vid.clientWidth;
        cvs.height = vid.videoHeight || vid.clientHeight;
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        const scaleX = cvs.width  / (vid.videoWidth  || cvs.width);
        const scaleY = cvs.height / (vid.videoHeight || cvs.height);

        for (const r of results) {
          const { x, y, width, height } = r.detection.box;
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2;
          ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

          // Eye landmarks
          const lms    = r.landmarks;
          const leftEye  = lms.getLeftEye();
          const rightEye = lms.getRightEye();
          for (const pts of [leftEye, rightEye]) {
            ctx.beginPath();
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1.5;
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x * scaleX, p.y * scaleY) : ctx.lineTo(p.x * scaleX, p.y * scaleY));
            ctx.closePath();
            ctx.stroke();
          }

          // Gaze check
          const allEye = [...leftEye, ...rightEye];
          const eCX = allEye.reduce((s, p) => s + p.x, 0) / allEye.length;
          const eCY = allEye.reduce((s, p) => s + p.y, 0) / allEye.length;
          const nx = (eCX - x) / width;
          const ny = (eCY - y) / height;
          if (nx < 0.2 || nx > 0.8 || ny < 0.15 || ny > 0.6) gazeOk = false;
        }

        // FPS tracking (sliding window of last 10 frames)
        const elapsed = performance.now() - t0;
        fpsFrames.current.push(elapsed);
        if (fpsFrames.current.length > 10) fpsFrames.current.shift();
        const avgMs  = fpsFrames.current.reduce((s, v) => s + v, 0) / fpsFrames.current.length;
        const fps    = Math.round(1000 / avgMs);

        setResult({ faceCount: count, gazeOk, backend, fps });
      } catch {}
    }, 300);
  }

  function stopDetection() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    const cvs = canvasRef.current;
    if (cvs) cvs.getContext("2d")?.clearRect(0, 0, cvs.width, cvs.height);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const statusColors = { idle: "var(--ink-3)", loading: "oklch(0.55 0.1 65)", ready: "var(--accent-ink)", error: "oklch(0.5 0.1 25)" };

  return (
    <div className="container adm-page" style={{ paddingTop: 28 }}>
      <header style={{ marginBottom: 20 }}>
        <p className="eyebrow">Admin · Dev Tools</p>
        <h1 className="serif" style={{ fontSize: 34, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Face Detection Test</h1>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>
          Verify face landmark + gaze detection on a local video file. All inference runs in-browser on your GPU via WebGL.
        </p>
      </header>

      {/* Controls */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            Choose video file
            <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleFile} />
          </label>

          {status !== "idle" && (
            <span className="mono" style={{ fontSize: 11, color: statusColors[status] }}>
              Models: {status === "loading" ? "Loading…" : status === "ready" ? "Ready ✓" : "Error ✗"}
            </span>
          )}

          {result?.backend && (
            <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)", border: "1px solid var(--accent-soft)" }}>
              Backend: {result.backend}
            </span>
          )}

          {errMsg && <span style={{ color: "oklch(0.5 0.1 25)", fontSize: 13 }}>{errMsg}</span>}

          {videoSrc && status === "ready" && (
            running
              ? <button className="btn ghost sm" onClick={stopDetection}>Stop detection</button>
              : <button className="btn accent sm" onClick={startDetection}>▶ Start detection</button>
          )}
        </div>
      </div>

      {/* Video + overlay */}
      {videoSrc && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
          <div style={{ position: "relative", background: "#000", borderRadius: "var(--r-xl)", overflow: "hidden" }}>
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              style={{ width: "100%", display: "block", maxHeight: 480, objectFit: "contain" }}
              onPlay={() => status === "ready" && !running && startDetection()}
              onPause={stopDetection}
              onEnded={stopDetection}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            />
          </div>

          {/* Live result panel */}
          <div className="card" style={{ padding: "20px", minWidth: 200 }}>
            <p className="eyebrow" style={{ margin: "0 0 14px" }}>Live results</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ResultRow label="Faces" value={result ? String(result.faceCount) : "—"}
                ok={result?.faceCount === 1} />
              <ResultRow label="Gaze"
                value={result?.gazeOk == null ? "—" : result.gazeOk ? "On screen" : "Looking away"}
                ok={result?.gazeOk ?? null} />
              <ResultRow label="FPS" value={result ? `~${result.fps}` : "—"} ok={null} />
              <ResultRow label="Backend" value={result?.backend ?? "—"} ok={result?.backend === "webgl" ? true : null} />
            </div>

            {result && result.faceCount !== 1 && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: "var(--r-sm)", background: "oklch(0.95 0.06 25)", color: "oklch(0.45 0.1 25)", fontSize: 13, fontWeight: 600 }}>
                ⚠ {result.faceCount === 0 ? "No face detected" : `${result.faceCount} faces detected`}
              </div>
            )}
            {result && result.faceCount === 1 && result.gazeOk === false && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: "var(--r-sm)", background: "oklch(0.97 0.04 65)", color: "oklch(0.45 0.1 65)", fontSize: 13, fontWeight: 600 }}>
                ⚠ Gaze anomaly — looking away
              </div>
            )}
          </div>
        </div>
      )}

      {!videoSrc && (
        <div className="card" style={{ padding: "60px 32px", textAlign: "center" }}>
          <p className="serif" style={{ fontSize: 22, margin: "0 0 10px" }}>No video selected</p>
          <p style={{ color: "var(--ink-3)", margin: 0 }}>
            Choose a local MP4 file above to test face detection and gaze tracking in real-time.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  const dot = ok === true ? "#22c55e" : ok === false ? "#f87171" : "var(--ink-3)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
      <span style={{ color: "var(--ink-3)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
        {ok !== null && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, display: "inline-block" }} />}
        {value}
      </span>
    </div>
  );
}
