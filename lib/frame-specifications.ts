type FrameSpecifications = {
  frameWidth?: number | null;
  lensWidth?: number | null;
  bridgeWidth?: number | null;
  templeLength?: number | null;
  measurements?: string | null;
  size?: string | null;
};

const positive = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/** Read standard lens/bridge/temple markings; never invent total frame width. */
export function resolveFrameSpecifications(product: FrameSpecifications) {
  let marking: number[] | null = null;
  for (const value of [product.measurements, product.size]) {
    if (!value) continue;
    const match = value.match(/(?:^|[^\d])(\d{2})\s*(?:[-–—□▢]|\[\]|\s)\s*(\d{2})\s*(?:[-–—]|\s)\s*(\d{3})(?!\d)/u);
    if (!match) continue;
    const [lens, bridge, temple] = match.slice(1).map(Number);
    if (lens >= 25 && lens <= 80 && bridge >= 10 && bridge <= 35 && temple >= 100 && temple <= 180) {
      marking = [lens, bridge, temple];
      break;
    }
  }
  return {
    frameWidth: positive(product.frameWidth),
    lensWidth: positive(product.lensWidth) ?? marking?.[0] ?? null,
    bridgeWidth: positive(product.bridgeWidth) ?? marking?.[1] ?? null,
    templeLength: positive(product.templeLength) ?? marking?.[2] ?? null
  };
}

export function hasFrameSizing(product: FrameSpecifications) {
  const specs = resolveFrameSpecifications(product);
  return specs.frameWidth != null || specs.lensWidth != null;
}
