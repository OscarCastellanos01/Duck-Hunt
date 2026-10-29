export type ImageKey =
  | 'background'
  | 'duckCommon'
  | 'duckFast'
  | 'duckGolden'
  | 'crosshair'
  | 'bulletIcon'
  | 'bulletEmptyIcon'
  | 'duckIcon'

export interface AssetManifest {
  images: Record<ImageKey, string | null>
}

const baseManifest: AssetManifest = {
  images: {
    background: null,
    duckCommon: null,
    duckFast: null,
    duckGolden: null,
    crosshair: null,
    bulletIcon: null,
    bulletEmptyIcon: null,
    duckIcon: null,
  },
}

const localOverrides = import.meta.glob<{ default: Partial<AssetManifest['images']> }>(
  './manifest.local.ts',
  { eager: true },
)

const merged = Object.values(localOverrides).reduce<AssetManifest['images']>(
  (images, module) => ({ ...images, ...module.default }),
  baseManifest.images,
)

export const ASSET_MANIFEST: AssetManifest = { images: merged }

export const IMAGE_KEYS = Object.keys(ASSET_MANIFEST.images) as ImageKey[]
