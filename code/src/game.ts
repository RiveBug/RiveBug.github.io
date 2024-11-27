import Rive, { RiveCanvas, File, WrappedRenderer, StateMachineInstance, Artboard } from '@rive-app/canvas-advanced';

const VERSION = '2.21.6'; //In case you want to test with a different version. Remember to change package.json as well.
const HIGH_PERFORMANCE_MACHINE = false; // Use this on an M3 or M4, otherwise you won't see any difference. DO NOT use it on lower end machines!

let rive : RiveCanvas;
let canvas : HTMLCanvasElement;
let lastTime = 0;
let renderer : WrappedRenderer;
let artboard : Artboard;
let stateMachine : StateMachineInstance;
let mouseMovedThisFrame : boolean = false;

// Performance tracking
let performanceData: {ms: number, mouseMoved: boolean}[] = [];

async function main() {
  console.log("Attempting to Load Rive WASM FROM: ", `https://unpkg.com/@rive-app/canvas-advanced@${VERSION}/rive.wasm`);
  rive = await Rive({
    locateFile: (_: string) => `https://unpkg.com/@rive-app/canvas-advanced@${VERSION}/rive.wasm`
  });

  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  renderer = rive.makeRenderer(canvas);

  /* FROM https://rive.app/community/files/12995-24869-pokey-pokey/ */
  const bytes = await (
    await fetch(new Request('/pokey_pokey.riv'))
  ).arrayBuffer();
  
  // import File as a named import from the Rive dependency
  const file = (await rive.load(new Uint8Array(bytes))) as File;

  artboard = file.artboardByIndex(0);

  stateMachine = new rive.StateMachineInstance(
    artboard.stateMachineByIndex(0),
    artboard
  );

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  window.addEventListener('resize', onResizeWindow);
  onResizeWindow();

  rive.requestAnimationFrame(renderLoop);
}

function onResizeWindow() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function calculateStatistics(data: {ms: number, mouseMoved: boolean}[]) {
  // Split data into two groups
  const mouseMovedTimes = data.filter(d => d.mouseMoved).map(d => d.ms);
  const mouseNotMovedTimes = data.filter(d => !d.mouseMoved).map(d => d.ms);

  // Calculate means
  const mouseMovedMean = mouseMovedTimes.reduce((a, b) => a + b, 0) / mouseMovedTimes.length;
  const mouseNotMovedMean = mouseNotMovedTimes.reduce((a, b) => a + b, 0) / mouseNotMovedTimes.length;

  // Calculate standard deviations
  const mouseMovedStdDev = Math.sqrt(mouseMovedTimes.reduce((a, b) => a + Math.pow(b - mouseMovedMean, 2), 0) / mouseMovedTimes.length);
  const mouseNotMovedStdDev = Math.sqrt(mouseNotMovedTimes.reduce((a, b) => a + Math.pow(b - mouseNotMovedMean, 2), 0) / mouseNotMovedTimes.length);

  return {
    mouseMovedStats: {
      count: mouseMovedTimes.length,
      mean: mouseMovedMean,
      stdDev: mouseMovedStdDev
    },
    mouseNotMovedStats: {
      count: mouseNotMovedTimes.length,
      mean: mouseNotMovedMean,
      stdDev: mouseNotMovedStdDev
    },
    difference: mouseMovedMean - mouseNotMovedMean
  };
}

function onClick(event : MouseEvent) {
  const stats = calculateStatistics(performanceData);
  console.log('Performance Statistics:', stats);
  console.log(`Performance impact of mouse movement: ${stats.difference.toFixed(2)}ms`);
  console.log(`Mouse moved frames: ${stats.mouseMovedStats.count} (mean: ${stats.mouseMovedStats.mean.toFixed(2)}ms ±${stats.mouseMovedStats.stdDev.toFixed(2)})`);
  console.log(`Static frames: ${stats.mouseNotMovedStats.count} (mean: ${stats.mouseNotMovedStats.mean.toFixed(2)}ms ±${stats.mouseNotMovedStats.stdDev.toFixed(2)})`);
  
  downloadCSV(performanceData);
  performanceData = [];
}

function onMouseMove(event : MouseEvent) {
  mouseMovedThisFrame = true;
}

function downloadCSV(data: {ms: number, mouseMoved: boolean}[]) {
  const csvContent = "data:text/csv;charset=utf-8," + 
    "DrawTime(ms),MouseMoved\n" +
    data.map(row => `${row.ms},${row.mouseMoved}`).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "performance_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderLoop(time : number) {
  if (!lastTime) {
    lastTime = time;
  }
  const elapsedTimeMs = time - lastTime;
  const elapsedTimeSec = elapsedTimeMs / 1000;
  lastTime = time;

  renderer.clear();
  stateMachine.advance(elapsedTimeSec);
  artboard.advance(elapsedTimeSec);
  renderer.save();
  renderer.align(
    rive.Fit.contain,
    rive.Alignment.center,
    {	
      minX: 0,	
      minY: 0,
      maxX: canvas.width,
      maxY: canvas.height
    },
    artboard.bounds,
  );

  let start = performance.now();
  if (HIGH_PERFORMANCE_MACHINE) {
    for (let i = 0; i < 2000; i++) {
      artboard.draw(renderer);
    }
  } else {
    artboard.draw(renderer);
  }
  let end = performance.now();
  const drawTime = end - start;
  
  // Store performance data
  performanceData.push({
    ms: drawTime,
    mouseMoved: mouseMovedThisFrame
  });

  console.log(`Draw time: ${drawTime}ms + Mouse Moved: ${mouseMovedThisFrame}`);

  renderer.restore();
  // Optionally make the below call if using WebGL
  // renderer.flush()
  rive.requestAnimationFrame(renderLoop);

  mouseMovedThisFrame = false;
}

main();