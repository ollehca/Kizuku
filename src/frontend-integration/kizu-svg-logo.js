/**
 * Kizu Logo SVG
 * Built programmatically to avoid line length issues
 */

// Helper: Build SVG opening tags
function buildSVGOpen() {
  const svgStart = '<svg width="32" height="32" viewBox="0 0 1220 1044" ';
  const svgAttrs = 'fill="none" xmlns="http://www.w3.org/2000/svg" ';
  const svgStyle = 'preserveAspectRatio="xMidYMid meet" ';
  const svgStyleFull = 'style="display: block; max-width: 32px; ';
  const svgStyleEnd = 'max-height: 32px; width: 32px; height: 32px;">';
  return svgStart + svgAttrs + svgStyle + svgStyleFull + svgStyleEnd;
}

// Helper: Build mask paths
function buildMaskPaths() {
  const gStart = '<g filter="url(#f0)"><mask id="m0" fill="white">';
  const path1 = '<path d="M610 28L619 36L759 275L902 521L1045 763L1113 883';
  const path1b = 'L1149 943L1178 992L1189 1018L606 693L610 28Z"/>';
  const path2 = '<path d="M610 28L597 36L461 272L318 518L175 760L107 879';
  const path2b = 'L71 939L42 988L38 1013L331 851L606 693L610 28Z"/>';
  const path3 = '<path d="M606 693L1188 1017L1175 1016L612 1023L53 1020';
  const path3b = 'L38 1013L324 855L606 693Z"/>';
  return gStart + path1 + path1b + path2 + path2b + path3 + path3b;
}

// Helper: Build main and fill paths
function buildMainPaths() {
  const mainPath = '<path fill-rule="evenodd" clip-rule="evenodd" ';
  const mainPathD = 'd="M610 10C614 10 618 12 620 15L1209 1018C1210 1021';
  const mainPathD2 = '1210 1025 1209 1029C1207 1032 1203 1034 1199 1034H21';
  const mainPathD3 = 'C17 1034 13 1032 11 1029C10 1025 10 1021 11 1018L600 15';
  const mainPathD4 = 'C602 12 606 10 610 10ZM39 1013H1181L610 40L39 1013Z"/>';
  const fullPath = mainPath + mainPathD + mainPathD2 + mainPathD3 + mainPathD4;
  return fullPath.replace('/>', '"/>') + '</mask>' + fullPath.replace('/>', ' fill="#35F6E6"/>');
}

// Helper: Build stroke and filter definitions
function buildDefsAndClose() {
  const strokePath = '<path d="M610 28L617 20L600 4L600 28L610 28Z" ';
  const strokeEnd = 'fill="#FCFCFC" mask="url(#m0)"/></g>';
  const defs = '<defs><filter id="f0" x="0" y="0" width="1220" ';
  const defsFilt = 'height="1044" filterUnits="userSpaceOnUse" ';
  const defsColor = 'color-interpolation-filters="sRGB">';
  const feFlood = '<feFlood flood-opacity="0" result="BackgroundImageFix"/>';
  const feMatrix = '<feColorMatrix in="SourceAlpha" type="matrix" ';
  const matrixVals = 'values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" ';
  const matrixEnd = 'result="hardAlpha"/><feOffset/>';
  const feBlur = '<feGaussianBlur stdDeviation="5"/>';
  const feComp = '<feComposite in2="hardAlpha" operator="out"/>';
  const feColor = '<feColorMatrix type="matrix" values="0 0 0 0 0.21 0 ';
  const feColorV = '0 0 0 0.96 0 0 0 0 0.90 0 0 0 0.55 0"/>';
  const feBlend1 = '<feBlend mode="normal" in2="BackgroundImageFix" ';
  const feBlend1E = 'result="effect1_dropShadow"/>';
  const feBlend2 = '<feBlend mode="normal" in="SourceGraphic" ';
  const feBlend2E = 'in2="effect1_dropShadow" result="shape"/>';
  const defsEnd = '</filter></defs></svg>';
  return (
    strokePath +
    strokeEnd +
    defs +
    defsFilt +
    defsColor +
    feFlood +
    feMatrix +
    matrixVals +
    matrixEnd +
    feBlur +
    feComp +
    feColor +
    feColorV +
    feBlend1 +
    feBlend1E +
    feBlend2 +
    feBlend2E +
    defsEnd
  );
}

// Build complete SVG
function createKizuLogoSVG() {
  return buildSVGOpen() + buildMaskPaths() + buildMainPaths() + buildDefsAndClose();
}

const KIZU_LOGO_SVG = createKizuLogoSVG();

module.exports = { KIZU_LOGO_SVG };
