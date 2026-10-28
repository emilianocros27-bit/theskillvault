import { select, pointer } from 'd3-selection';
import 'd3-transition';
import { scalePoint, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, curveMonotoneX } from 'd3-shape';
import { easeCubicOut } from 'd3-ease';
window.d3 = { select, pointer, scalePoint, scaleLinear, axisBottom, axisLeft, line, curveMonotoneX, easeCubicOut };
