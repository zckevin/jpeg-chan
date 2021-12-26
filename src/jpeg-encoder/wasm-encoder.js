import wasm_mozjpeg from '@saschazar/wasm-mozjpeg';

const options = {
  quality: 100,
  baseline: true,
  arithmetic: false,
  progressive: false,
  optimize_coding: true,
  smoothing: 0,
  in_color_space: 2, // J_COLOR_SPACE.JCS_RGB
  out_color_space: 3, // J_COLOR_SPACE.JCS_YCbCr
  quant_table: 3,
  trellis_multipass: false,
  trellis_opt_zero: false,
  trellis_opt_table: false,
  trellis_loops: 1,
  auto_subsample: true,
  chroma_subsample: 2,
  separate_chroma_quality: false,
  chroma_quality: 100,
};

async function loadWasm() {
  return new Promise((resolve) => {
    const mozjpegModule = wasm_mozjpeg({
      onRuntimeInitialized() {
        resolve(mozjpegModule);
      },
    });
  });
}

export async function encodeImageData(targetImageData, imageQuality) {
  const m = await loadWasm();
  const channels = 3;
  options.chroma_quality = imageQuality;
  return m.encode(
    targetImageData.data,
    targetImageData.width, 
    targetImageData.height,
    channels,
    options
  );
  // m.free(); // clean up memory after encoding is done
}
