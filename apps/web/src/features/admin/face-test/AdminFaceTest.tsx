import { useEffect, useRef, useState } from "react";
import "./AdminFaceTest.css";

type DetResult = { faceCount: number; gazeOk: boolean | null; backend: string; fps: number };

export function AdminFaceTest() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef    = useRef<any>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsRef    = useRef<number[]>([]);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [status,   setStatus]   = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result,   setResult]   = useState<DetResult | null>(null);
  const [errMsg,   setErrMsg]   = useState<string | null>(null);
  const [running,  setRunning]  = useState(false);
  const [log,      setLog]      = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function loadModels() {
    setStatus("loading");
    setErrMsg(null);
    addLog("Importing face-api.js…");
    try {
      const faceapi = await import("face-api.js");

      // Set WebGL backend and wait for it to be ready
      let backend = "cpu";
      try {
        const tf = (faceapi as any).tf;
        if (tf) {
          await tf.setBackend("webgl");
          await tf.ready();
          backend = tf.getBackend() ?? "webgl";
          addLog(`TF backend: ${backend}`);
        }
      } catch (e: any) {
        addLog(`WebGL unavailable, falling back to CPU: ${e?.message}`);
      }

      addLog("Loading TinyFaceDetector…");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/face-api-weights");
      addLog("Loading FaceLandmark68Net…");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/face-api-weights");

      apiRef.current = { faceapi, backend };
      setStatus("ready");
      addLog("Models ready ✓");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setErrMsg(msg);
      setStatus("error");
      addLog(`Error: ${msg}`);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setResult(null);
    stopDetection();
    addLog(`Video loaded: ${file.name}`);
    if (status === "idle") loadModels();
  }

  function startDetection() {
    const vid = videoRef.current;
    const cvs = canvasRef.current;
    const api = apiRef.current;
    if (!vid || !cvs || !api) return;

    const { faceapi, backend } = api;
    setRunning(true);
    fpsRef.current = [];
    addLog("Detection started");

    timerRef.current = setInterval(async () => {
      if (vid.paused || vid.ended || vid.readyState < 2) return;
      const t0 = performance.now();
      try {
        const detections = await faceapi
          .detectAllFaces(vid, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceLandmarks();

        const count = detections.length;
        let gazeOk: boolean | null = count === 1 ? true : null;

        // --- Canvas overlay with objectFit:contain letterbox math ---
        const elW  = vid.clientWidth;
        const elH  = vid.clientHeight;
        const natW = vid.videoWidth  || elW;
        const natH = vid.videoHeight || elH;

        const scale   = Math.min(elW / natW, elH / natH);
        const renderW = natW * scale;
        const renderH = natH * scale;
        const ox      = (elW - renderW) / 2;  // horizontal letterbox offset
        const oy      = (elH - renderH) / 2;  // vertical letterbox offset

        cvs.width  = elW;
        cvs.height = elH;
        const ctx  = cvs.getContext("2d")!;
        ctx.clearRect(0, 0, elW, elH);

        for (const det of detections) {
          const { x, y, width, height } = det.detection.box;
          const dx = x * scale + ox;
          const dy = y * scale + oy;
          const dw = width  * scale;
          const dh = height * scale;

          // Face bounding box
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(dx, dy, dw, dh);

          // Confidence label
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 11px monospace";
          ctx.fillText(`${Math.round(det.detection.score * 100)}%`, dx + 4, dy - 5);

          // Eye landmark polygons
          const lms = det.landmarks;
          for (const pts of [lms.getLeftEye(), lms.getRightEye()]) {
            ctx.beginPath();
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1.5;
            pts.forEach((p: any, i: number) => {
              const px = p.x * scale + ox;
              const py = p.y * scale + oy;
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.stroke();
          }

          // Gaze check using eye-center normalized within face box
          const allEye = [...lms.getLeftEye(), ...lms.getRightEye()];
          const eCX = allEye.reduce((s: number, p: any) => s + p.x, 0) / allEye.length;
          const eCY = allEye.reduce((s: number, p: any) => s + p.y, 0) / allEye.length;
          const nx  = (eCX - x) / width;
          const ny  = (eCY - y) / height;
          if (nx < 0.2 || nx > 0.8 || ny < 0.15 || ny > 0.6) gazeOk = false;
        }

        // FPS: sliding window of last 10 frame times
        const elapsed = performance.now() - t0;
        fpsRef.current.push(elapsed);
        if (fpsRef.current.length > 10) fpsRef.current.shift();
        const avgMs = fpsRef.current.reduce((s, v) => s + v, 0) / fpsRef.current.length;
        const fps   = Math.round(1000 / avgMs);

        setResult({ faceCount: count, gazeOk, backend, fps });
      } catch (e: any) {
        addLog(`Detection error: ${e?.message ?? e}`);
      }
    }, 300);
  }

  function stopDetection() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRunning(false);
    const cvs = canvasRef.current;
    if (cvs) cvs.getContext("2d")?.clearRect(0, 0, cvs.width, cvs.height);
    if (running) addLog("Detection stopped");
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const statusColor = { idle: "var(--ink-3)", loading: "oklch(0.6 0.12 65)", ready: "oklch(0.6 0.14 158)", error: "oklch(0.55 0.12 25)" }[status];

  return (
    <div className="container adm-page" style={{ paddingTop: 28, maxWidth: 960 }}>
      <header style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin · Dev Tools</p>
        <h1 className="serif" style={{ fontSize: 34, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Face Detection Test</h1>
        <p style={{ color: "var(--ink-2)", margin: 0, fontSize: 14 }}>
          Load a local video file to verify real-time face detection, eye-landmark gaze tracking, and GPU inference.
        </p>
      </header>

      {/* Controls bar */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink-2)", background: "var(--bg-2)", transition: "all 0.15s" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "var(--ink)")}
          onMouseOut={(e) => (e.currentTarget.style.color = "var(--ink-2)")}>
          Choose video file
          <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleFile} />
        </label>

        {status !== "idle" && (
          <span className="mono" style={{ fontSize: 11, color: statusColor, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0,
              animation: status === "loading" ? "pulse 1.2s infinite" : "none" }} />
            {status === "loading" ? "Loading models…" : status === "ready" ? "Models ready" : "Error"}
          </span>
        )}

        {apiRef.current?.backend && (
          <span className="mono" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)", border: "1px solid var(--accent-soft)", fontWeight: 600 }}>
            {apiRef.current.backend.toUpperCase()}
          </span>
        )}

        {errMsg && (
          <span style={{ fontSize: 12, color: "oklch(0.5 0.12 25)", fontFamily: "var(--font-mono)", background: "oklch(0.97 0.03 25)", padding: "4px 10px", borderRadius: "var(--r-sm)", border: "1px solid oklch(0.88 0.06 25)" }}>
            {errMsg}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {status === "idle" && (
            <button className="btn ghost sm" onClick={loadModels}>Load models</button>
          )}
          {videoSrc && status === "ready" && (
            running
              ? <button className="btn ghost sm" onClick={stopDetection}>Stop</button>
              : <button className="btn accent sm" onClick={startDetection}>▶ Start detection</button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: videoSrc ? "1fr 260px" : "1fr", gap: 16, alignItems: "start" }}>
        {/* Video */}
        {videoSrc ? (
          <div style={{ position: "relative", background: "#000", borderRadius: "var(--r-xl)", overflow: "hidden" }}>
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              style={{ width: "100%", display: "block", maxHeight: 520, objectFit: "contain" }}
              onPlay={() => { if (status === "ready" && !running) startDetection(); }}
              onPause={stopDetection}
              onEnded={stopDetection}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            />
          </div>
        ) : (
          <div className="card" style={{ padding: "72px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎥</div>
            <p className="serif" style={{ fontSize: 22, margin: "0 0 8px" }}>No video loaded</p>
            <p style={{ color: "var(--ink-3)", margin: 0, fontSize: 14 }}>
              Choose a local MP4 or WebM file to begin face detection testing.
            </p>
          </div>
        )}

        {videoSrc && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Live results */}
            <div className="card" style={{ padding: "18px 20px" }}>
              <p className="eyebrow" style={{ margin: "0 0 14px" }}>Live results</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <MetricRow label="Faces" value={result ? String(result.faceCount) : "—"}
                  ok={result ? result.faceCount === 1 : null}
                  bad={result ? result.faceCount !== 1 : null} />
                <MetricRow label="Gaze"
                  value={result?.gazeOk == null ? "—" : result.gazeOk ? "On screen" : "Away"}
                  ok={result?.gazeOk ?? null}
                  bad={result?.gazeOk === false} />
                <MetricRow label="FPS" value={result ? `~${result.fps}` : "—"} ok={null} bad={null} />
                <MetricRow label="Backend"
                  value={result?.backend ?? apiRef.current?.backend ?? "—"}
                  ok={result?.backend === "webgl"}
                  bad={result?.backend != null && result.backend !== "webgl"} />
              </div>

              {result && result.faceCount !== 1 && running && (
                <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: "var(--r-sm)", background: "oklch(0.95 0.05 25)", color: "oklch(0.45 0.1 25)", fontSize: 12, fontWeight: 600 }}>
                  ⚠ {result.faceCount === 0 ? "No face detected" : `${result.faceCount} faces — expected 1`}
                </div>
              )}
              {result && result.faceCount === 1 && result.gazeOk === false && running && (
                <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: "var(--r-sm)", background: "oklch(0.97 0.04 65)", color: "oklch(0.45 0.1 65)", fontSize: 12, fontWeight: 600 }}>
                  ⚠ Gaze anomaly detected
                </div>
              )}
            </div>

            {/* Debug log */}
            <div className="card" style={{ padding: "14px 16px" }}>
              <p className="eyebrow" style={{ margin: "0 0 8px" }}>Log</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {log.length === 0 && <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>No events yet</span>}
                {log.map((l, i) => (
                  <span key={i} style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-3)", wordBreak: "break-all" }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function MetricRow({ label, value, ok, bad }: { label: string; value: string; ok: boolean | null; bad: boolean | null }) {
  const color = ok ? "#22c55e" : bad ? "#f87171" : "var(--ink-3)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
      <span style={{ color: "var(--ink-3)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: ok || bad ? color : "var(--ink)" }}>
        {(ok || bad) && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />}
        {value}
      </span>
    </div>
  );
}
