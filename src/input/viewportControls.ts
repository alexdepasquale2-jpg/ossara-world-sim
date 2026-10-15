export interface ViewportControlState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface ViewportControlsOptions {
  canvas: HTMLCanvasElement;
  minZoom?: number;
  maxZoom?: number;
  onChange: (state: ViewportControlState) => void;
  onTap: (clientX: number, clientY: number) => void;
}

export class ViewportControls {
  private canvas: HTMLCanvasElement;
  private minZoom: number;
  private maxZoom: number;
  private onChange: (state: ViewportControlState) => void;
  private onTap: (clientX: number, clientY: number) => void;

  panX = 0;
  panY = 0;
  zoom = 1;

  private pointers = new Map<number, { x: number; y: number }>();
  private panAnchor: { x: number; y: number; panX: number; panY: number } | null =
    null;
  private pinchStart: { dist: number; zoom: number } | null = null;
  private tapStart: { x: number; y: number; t: number } | null = null;
  private moved = false;

  constructor(options: ViewportControlsOptions) {
    this.canvas = options.canvas;
    this.minZoom = options.minZoom ?? 0.35;
    this.maxZoom = options.maxZoom ?? 3.5;
    this.onChange = options.onChange;
    this.onTap = options.onTap;

    this.canvas.style.touchAction = "none";
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.setZoom(this.zoom * factor);
      },
      { passive: false },
    );
  }

  setZoom(next: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, next));
    this.emit();
  }

  adjustZoom(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  private emit(): void {
    this.onChange({ panX: this.panX, panY: this.panY, zoom: this.zoom });
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.classList.add("dragging");

    if (this.pointers.size === 1) {
      this.tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.moved = false;
      this.panAnchor = {
        x: e.clientX,
        y: e.clientY,
        panX: this.panX,
        panY: this.panY,
      };
      this.pinchStart = null;
    } else if (this.pointers.size === 2) {
      this.panAnchor = null;
      this.tapStart = null;
      this.pinchStart = {
        dist: this.pointerDistance(),
        zoom: this.zoom,
      };
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.tapStart) {
      const dx = e.clientX - this.tapStart.x;
      const dy = e.clientY - this.tapStart.y;
      if (Math.hypot(dx, dy) > 10) this.moved = true;
    }

    if (this.pointers.size >= 2 && this.pinchStart) {
      const dist = this.pointerDistance();
      if (dist > 0 && this.pinchStart.dist > 0) {
        const ratio = dist / this.pinchStart.dist;
        this.setZoom(this.pinchStart.zoom * ratio);
      }
      return;
    }

    if (this.pointers.size === 1 && this.panAnchor) {
      const dx = e.clientX - this.panAnchor.x;
      const dy = e.clientY - this.panAnchor.y;
      this.panX = this.panAnchor.panX - dx / this.zoom;
      this.panY = this.panAnchor.panY + dy / this.zoom;
      this.emit();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (
      this.pointers.size === 1 &&
      this.tapStart &&
      !this.moved &&
      performance.now() - this.tapStart.t < 350
    ) {
      this.onTap(e.clientX, e.clientY);
    }

    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.canvas.classList.remove("dragging");
      this.panAnchor = null;
      this.pinchStart = null;
      this.tapStart = null;
    } else if (this.pointers.size === 1) {
      const remaining = [...this.pointers.values()][0]!;
      this.panAnchor = {
        x: remaining.x,
        y: remaining.y,
        panX: this.panX,
        panY: this.panY,
      };
      this.pinchStart = null;
    }
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  private pointerDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
  }
}
