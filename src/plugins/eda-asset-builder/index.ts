import { registerPlugin } from '../registry';
import { edaAssetBuilderManifest } from './manifest';

export function registerEdaAssetBuilderPlugin() {
  registerPlugin({ manifest: edaAssetBuilderManifest });
}

export { edaAssetBuilderManifest };
