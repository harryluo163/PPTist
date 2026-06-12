import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 test.json
const inputPath = path.join(__dirname, 'test.json');

const rawData = fs.readFileSync(inputPath, 'utf-8');
const data = JSON.parse(rawData);

let removedCount = 0;
let colorConvertedCount = 0;

// 完整 CSS 命名颜色映射（148 种）
const NAMED_COLORS = {
  aliceblue:'#F0F8FF',antiquewhite:'#FAEBD7',aqua:'#00FFFF',aquamarine:'#7FFFD4',
  azure:'#F0FFFF',beige:'#F5F5DC',bisque:'#FFE4C4',black:'#000000',
  blanchedalmond:'#FFEBCD',blue:'#0000FF',blueviolet:'#8A2BE2',brown:'#A52A2A',
  burlywood:'#DEB887',cadetblue:'#5F9EA0',chartreuse:'#7FFF00',chocolate:'#D2691E',
  coral:'#FF7F50',cornflowerblue:'#6495ED',cornsilk:'#FFF8DC',crimson:'#DC143C',
  cyan:'#00FFFF',darkblue:'#00008B',darkcyan:'#008B8B',darkgoldenrod:'#B8860B',
  darkgray:'#A9A9A9',darkgreen:'#006400',darkgrey:'#A9A9A9',darkkhaki:'#BDB76B',
  darkmagenta:'#8B008B',darkolivegreen:'#556B2F',darkorange:'#FF8C00',
  darkorchid:'#9932CC',darkred:'#8B0000',darksalmon:'#E9967A',darkseagreen:'#8FBC8F',
  darkslateblue:'#483D8B',darkslategray:'#2F4F4F',darkslategrey:'#2F4F4F',
  darkturquoise:'#00CED1',darkviolet:'#9400D3',deeppink:'#FF1493',
  deepskyblue:'#00BFFF',dimgray:'#696969',dimgrey:'#696969',dodgerblue:'#1E90FF',
  firebrick:'#B22222',floralwhite:'#FFFAF0',forestgreen:'#228B22',fuchsia:'#FF00FF',
  gainsboro:'#DCDCDC',ghostwhite:'#F8F8FF',gold:'#FFD700',goldenrod:'#DAA520',
  gray:'#808080',green:'#008000',greenyellow:'#ADFF2F',grey:'#808080',
  honeydew:'#F0FFF0',hotpink:'#FF69B4',indianred:'#CD5C5C',indigo:'#4B0082',
  ivory:'#FFFFF0',khaki:'#F0E68C',lavender:'#E6E6FA',lavenderblush:'#FFF0F5',
  lawngreen:'#7CFC00',lemonchiffon:'#FFFACD',lightblue:'#ADD8E6',
  lightcoral:'#F08080',lightcyan:'#E0FFFF',lightgoldenrodyellow:'#FAFAD2',
  lightgray:'#D3D3D3',lightgreen:'#90EE90',lightgrey:'#D3D3D3',lightpink:'#FFB6C1',
  lightsalmon:'#FFA07A',lightseagreen:'#20B2AA',lightskyblue:'#87CEFA',
  lightslategray:'#778899',lightslategrey:'#778899',lightsteelblue:'#B0C4DE',
  lightyellow:'#FFFFE0',lime:'#00FF00',limegreen:'#32CD32',linen:'#FAF0E6',
  magenta:'#FF00FF',maroon:'#800000',mediumaquamarine:'#66CDAA',
  mediumblue:'#0000CD',mediumorchid:'#BA55D3',mediumpurple:'#9370DB',
  mediumseagreen:'#3CB371',mediumslateblue:'#7B68EE',mediumspringgreen:'#00FA9A',
  mediumturquoise:'#48D1CC',mediumvioletred:'#C71585',midnightblue:'#191970',
  mintcream:'#F5FFFA',mistyrose:'#FFE4E1',moccasin:'#FFE4B5',navajowhite:'#FFDEAD',
  navy:'#000080',oldlace:'#FDF5E6',olive:'#808000',olivedrab:'#6B8E23',
  orange:'#FFA500',orangered:'#FF4500',orchid:'#DA70D6',palegoldenrod:'#EEE8AA',
  palegreen:'#98FB98',paleturquoise:'#AFEEEE',palevioletred:'#DB7093',
  papayawhip:'#FFEFD5',peachpuff:'#FFDAB9',peru:'#CD853F',pink:'#FFC0CB',
  plum:'#DDA0DD',powderblue:'#B0E0E6',purple:'#800080',rebeccapurple:'#663399',
  red:'#FF0000',rosybrown:'#BC8F8F',royalblue:'#4169E1',saddlebrown:'#8B4513',
  salmon:'#FA8072',sandybrown:'#F4A460',seagreen:'#2E8B57',seashell:'#FFF5EE',
  sienna:'#A0522D',silver:'#C0C0C0',skyblue:'#87CEEB',slateblue:'#6A5ACD',
  slategray:'#708090',slategrey:'#708090',snow:'#FFFAFA',springgreen:'#00FF7F',
  steelblue:'#4682B4',tan:'#D2B48C',teal:'#008080',thistle:'#D8BFD8',
  tomato:'#FF6347',turquoise:'#40E0D0',violet:'#EE82EE',wheat:'#F5DEB3',
  white:'#FFFFFF',whitesmoke:'#F5F5F5',yellow:'#FFFF00',yellowgreen:'#9ACD32',
};

/**
 * 将各种颜色格式转换为标准 6 位 HEX（#RRGGBB）
 * 支持: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), 命名颜色
 */
function normalizeColor(color) {
  if (typeof color !== 'string') return color;
  const trimmed = color.trim().toLowerCase();

  // 已经是标准 6 位 hex，直接返回（大写）
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();

  // 3 位 hex: #rgb -> #rrggbb
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    const r = trimmed[1], g = trimmed[2], b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  // 4 位 hex: #rgba -> 忽略 alpha，取 rgb
  if (/^#[0-9a-f]{4}$/.test(trimmed)) {
    const r = trimmed[1], g = trimmed[2], b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  // 8 位 hex: #rrggbbaa -> 取前 6 位
  if (/^#[0-9a-f]{8}$/.test(trimmed)) {
    return trimmed.substring(0, 7).toUpperCase();
  }

  // rgb(r, g, b) / rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1])).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2])).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3])).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  // 命名颜色
  if (NAMED_COLORS[trimmed]) {
    return NAMED_COLORS[trimmed].toUpperCase();
  }

  return color; // 无法识别则保持原样
}

/**
 * 判断一个 SVG 字符串的 viewBox 是否为 [0,0]
 * 匹配 viewBox="0 0" 形式（只有两个0，没有宽高）
 */
function svgHasZeroViewBox(svgStr) {
  if (typeof svgStr !== 'string') return false;
  // viewBox="0 0" 后面紧跟引号，说明只有两个值
  return /viewBox\s*=\s*["']\s*0[\s,]+0\s*["']/i.test(svgStr);
}

/**
 * 判断 viewBox 属性是否为 [0, 0]（JSON 数组形式）
 */
function isZeroViewBoxArray(val) {
  return Array.isArray(val) && val.length === 2 && val[0] === 0 && val[1] === 0;
}

/**
 * 判断一个对象是否是 SVG 相关元素且 viewBox 为 [0,0]
 */
function isSvgWithZeroViewBox(obj) {
  if (typeof obj !== 'object' || obj === null) return false;

  // 情况1: 对象有 viewBox 属性且值为 [0, 0]
  if (isZeroViewBoxArray(obj.viewBox)) return true;

  // 情况2: 对象有 path/content 属性是 SVG 字符串且 viewBox 为 "0 0"
  for (const key of ['path', 'content', 'svg', 'd']) {
    if (typeof obj[key] === 'string' && obj[key].includes('<svg') && svgHasZeroViewBox(obj[key])) {
      return true;
    }
  }

  return false;
}

/**
 * 递归遍历对象/数组：
 * 1. 剔除 viewBox 为 [0,0] 的 SVG
 * 2. fill 颜色转换为标准 6 位 HEX
 */
function processNode(node) {
  if (Array.isArray(node)) {
    const filtered = [];
    for (const item of node) {
      // 字符串类型的 SVG
      if (typeof item === 'string' && item.trim().startsWith('<svg') && svgHasZeroViewBox(item)) {
        removedCount++;
        console.log('  剔除 SVG 字符串 (viewBox="0 0"):', item.substring(0, 80) + '...');
        continue;
      }
      // 对象类型的 SVG 元素
      if (isSvgWithZeroViewBox(item)) {
        removedCount++;
        console.log('  剔除元素 (viewBox=[0,0]):', JSON.stringify(item).substring(0, 100) + '...');
        continue;
      }
      if (typeof item === 'object' && item !== null) {
        filtered.push(processNode(item));
      } else {
        filtered.push(item);
      }
    }
    return filtered;
  } else if (typeof node === 'object' && node !== null) {
    const result = {};
    for (const [key, value] of Object.entries(node)) {
      // 值为 SVG 字符串且 viewBox 为 [0,0]
      if (typeof value === 'string' && value.trim().startsWith('<svg') && svgHasZeroViewBox(value)) {
        removedCount++;
        console.log(`  剔除字段 "${key}" (SVG viewBox="0 0")`);
        continue;
      }
      // 值为 viewBox: [0, 0] 的数组
      if (key === 'viewBox' && isZeroViewBoxArray(value)) {
        // 不单独剔除 viewBox 字段，由父级对象整体判断
        result[key] = value;
        continue;
      }
      // fill 颜色转换为标准 6 位 HEX
      if (key === 'fill' && typeof value === 'string') {
        const converted = normalizeColor(value);
        if (converted !== value) {
          colorConvertedCount++;
          console.log(`  颜色转换 fill: "${value}" -> "${converted}"`);
        }
        result[key] = converted;
        continue;
      }
      result[key] = processNode(value);
    }
    return result;
  }
  return node;
}

console.log('开始处理 test.json ...');
const processed = processNode(data);
console.log(`\n共剔除 ${removedCount} 个 viewBox=[0,0] 的 SVG`);
console.log(`共转换 ${colorConvertedCount} 个 fill 颜色`);

// 写回文件（覆盖原文件）
fs.writeFileSync(inputPath, JSON.stringify(processed, null, 2), 'utf-8');
console.log(`结果已写入: ${inputPath}`);
