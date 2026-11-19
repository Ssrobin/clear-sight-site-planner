import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useCart } from "@/lib/cart";
import { formatPrice, productImageUrl, type Product } from "@/lib/catalog";
import { GlassesSvg } from "./GlassesSvg";

type Fit = { x: number; y: number; w: number; angle: number }; // x,y,w as fraction of media size; angle in degrees
type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: { x: number; y: number }[][] };
  detect: (i: HTMLImageElement) => { faceLandmarks: { x: number; y: number }[][] };
  setOptions: (o: { runningMode: "VIDEO" | "IMAGE" }) => Promise<void>;
  close: () => void;
};

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const DEFAULT_FIT: Fit = { x: 0.5, y: 0.42, w: 0.5, angle: 0 };

function fitFromLandmarks(pts: { x: number; y: number }[], aspect: number): Fit {
  const a = pts[33];
  const b = pts[263];
  const dx = (b.x - a.x) * aspect;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) / aspect;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + dist * 0.04, w: dist * 1.55, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

export function TryOnStudio({ frames, initialId }: { frames: Product[]; initialId?: string }) {
  const [selected, setSelected] = useState<Product | undefined>(frames.find((f) => f.id === initialId) ?? frames[0]);
  const [mode, setMode] = useState<"idle" | "camera" | "photo">("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [aspect, setAspect] = useState(4 / 3);
  const [fit, setFit] = useState<Fit>(DEFAULT_FIT);
  const [tracking, setTracking] = useState<"loading" | "on" | "off">("loading");
  const [scale, setScale] = useState(1);
  const [lift, setLift] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lmRef = useRef<Landmarker | null>(null);
  const rafRef = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { add } = useCart();

  // Load face tracking once (browser only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM);
        const lm = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (cancelled) return lm.close();
        lmRef.current = lm as unknown as Landmarker;
        setTracking("on");
      } catch (e) {
        console.warn("Face tracking unavailable", e);
        if (!cancelled) setTracking("off");
      }
    })();
    return () => {
      cancelled = true;
      lmRef.current?.close();
      lmRef.current = null;
    };
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const loop = useCallback(() => {
    const v = videoRef.current;
    const lm = lmRef.current;
    if (v && lm && v.readyState >= 2) {
      try {
        const r = lm.detectForVideo(v, performance.now());
        const pts = r.faceLandmarks?.[0];
        if (pts) {
          const next = fitFromLandmarks(pts, v.videoWidth / v.videoHeight);
          setFit((prev) => ({
            x: prev.x + (next.x - prev.x) * 0.5,
            y: prev.y + (next.y - prev.y) * 0.5,
            w: prev.w + (next.w - prev.w) * 0.5,
            angle: prev.angle + (next.angle - prev.angle) * 0.5,
          }));
        }
      } catch {
        /* skip frame */
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const startCamera = async () => {
    stopCamera();
    setPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setMode("camera");
      setFit(DEFAULT_FIT);
      requestAnimationFrame(async () => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setAspect(v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 4 / 3);
        if (lmRef.current) {
          await lmRef.current.setOptions({ runningMode: "VIDEO" });
          loop();
        }
      });
    } catch {
      toast.error("Camera not available. Please allow camera access or upload a photo instead.");
    }
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    stopCamera();
    const url = URL.createObjectURL(file);
    setPhoto(url);
    setMode("photo");
    setFit(DEFAULT_FIT);
  };

  const onPhotoLoaded = async () => {
    const img = imgRef.current;
    if (!img) return;
    setAspect(img.naturalWidth / img.naturalHeight);
    const lm = lmRef.current;
    if (!lm) return;
    try {
      await lm.setOptions({ runningMode: "IMAGE" });
      const r = lm.detect(img);
      const pts = r.faceLandmarks?.[0];
      if (pts) setFit(fitFromLandmarks(pts, img.naturalWidth / img.naturalHeight));
      else toast("No face found — use the sliders to place the frame.");
    } catch {
      /* manual */
    }
  };

  const tinted = selected?.category === "sunglasses";
  const overlayStyle = {
    left: `${fit.x * 100}%`,
    top: `${(fit.y + lift / 100) * 100}%`,
    width: `${fit.w * scale * 100}%`,
    transform: `translate(-50%, -50%) rotate(${fit.angle}deg)`,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="relative mx-auto w-full overflow-hidden rounded-3xl bg-ink" style={{ aspectRatio: mode === "idle" ? "4 / 3" : String(aspect) }}>
          {mode === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center text-ink-foreground">
              {selected && <GlassesSvg shape={selected.frame_shape} color={selected.frame_color} tinted={tinted} className="w-56 opacity-90" />}
              <p className="max-w-sm text-sm text-ink-foreground/75">Start your camera or upload a front-facing selfie. Your photo stays on your device.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="highlight" size="xl" onClick={startCamera}><Camera /> Use camera</Button>
                <Button variant="outline" size="xl" className="rounded-full bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground" onClick={() => fileRef.current?.click()}><ImageUp /> Upload photo</Button>
              </div>
            </div>
          )}
          {mode !== "idle" && (
            <div className={`absolute inset-0 ${mode === "camera" ? "-scale-x-100" : ""}`}>
              {mode === "camera" ? (
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              ) : (
                photo && <img ref={imgRef} src={photo} onLoad={onPhotoLoaded} alt="Your photo" className="h-full w-full object-cover" />
              )}
              {selected && (
                <div className="pointer-events-none absolute" style={overlayStyle}>
                  <GlassesSvg shape={selected.frame_shape} color={selected.frame_color} tinted={tinted} className="w-full drop-shadow-lg" />
                </div>
              )}
            </div>
          )}
          {mode !== "idle" && tracking === "loading" && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Loading face tracking…</span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />

        {mode !== "idle" && (
          <div className="mt-4 grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
            <label className="grid gap-2 text-xs font-medium text-muted-foreground">
              Frame size
              <Slider value={[scale]} min={0.7} max={1.4} step={0.01} onValueChange={(v) => setScale(v[0])} />
            </label>
            <label className="grid gap-2 text-xs font-medium text-muted-foreground">
              Move up / down
              <Slider value={[lift]} min={-15} max={15} step={0.5} onValueChange={(v) => setLift(v[0])} />
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={mode === "camera" ? () => fileRef.current?.click() : startCamera}>
                {mode === "camera" ? <><ImageUp /> Photo</> : <><Camera /> Camera</>}
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setScale(1); setLift(0); }}><RefreshCw /> Reset</Button>
            </div>
          </div>
        )}
        {tracking === "off" && mode !== "idle" && (
          <p className="mt-2 text-xs text-muted-foreground">Automatic face tracking isn't supported on this device — use the sliders to place the frame.</p>
        )}
      </div>

      <aside className="space-y-4">
        <h2 className="text-lg font-semibold">Choose a frame</h2>
        <div className="grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-1">
          {frames.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelected(f)}
              className={`rounded-2xl border bg-card p-2 text-left transition-all ${selected?.id === f.id ? "border-primary ring-2 ring-primary/30" : "hover:border-primary"}`}
            >
              <img src={productImageUrl(f)} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <p className="mt-2 truncate px-1 text-sm font-medium">{f.name}</p>
              <p className="px-1 pb-1 text-xs text-primary">{formatPrice(f.price)}</p>
            </button>
          ))}
        </div>
        {selected && (
          <div className="rounded-2xl bg-secondary p-4">
            <p className="font-display font-semibold">{selected.name}</p>
            <p className="text-sm text-primary">{formatPrice(selected.price)}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="hero"
                className="flex-1"
                onClick={() => {
                  add({ productId: selected.id, name: selected.name, price: selected.price, image: productImageUrl(selected) });
                  toast.success(`${selected.name} added to cart`);
                }}
              >
                <ShoppingBag /> Add to cart
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/product/$id" params={{ id: selected.id }}>Details</Link>
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
