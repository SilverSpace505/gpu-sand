const canvas = document.getElementById('canvas') as HTMLCanvasElement;

import computeShader from './compute.wgsl?raw';
import { mouse } from './input';
import renderShaders from './render.wgsl?raw';

const uniformData = new Float32Array(8);
const workgroupSize = 8;

const multistep = 4;

let fpsc = 0;
let bufferSize = 0;
let bindGroupC = 0;

let device: GPUDevice | undefined;
let uniformBuffer: GPUBuffer | undefined;
let context: GPUCanvasContext | undefined;

let input: GPUBuffer | undefined;
let output: GPUBuffer | undefined;
let stagingBuffer: GPUBuffer | undefined;

let pipeline: GPUComputePipeline | undefined;
let bindGroups: [GPUBindGroup, GPUBindGroup] | undefined;

let renderPipeline: GPURenderPipeline | undefined;
let renderBindGroups: [GPUBindGroup, GPUBindGroup] | undefined;

function tick(commandEncoder: GPUCommandEncoder) {
  if (
    !device ||
    !pipeline ||
    !bindGroups ||
    !output ||
    !input ||
    !stagingBuffer
  )
    return;

  if (uniformBuffer) {
    uniformData[0] = canvas.width;
    uniformData[1] = canvas.height;
    uniformData[2] = Math.floor(Math.random() * 10000);

    uniformData[4] = mouse.x;
    uniformData[5] = mouse.y;
    uniformData[6] = mouse.down;
    uniformData[7] = mouse.type;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
  }

  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroups[bindGroupC]);
  passEncoder.dispatchWorkgroups(
    Math.ceil(canvas.width / workgroupSize),
    Math.ceil(canvas.height / workgroupSize),
  );
  passEncoder.end();
  // commandEncoder.copyBufferToBuffer(
  //   [output, input][bindGroupC],
  //   0,
  //   stagingBuffer,
  //   0,
  //   bufferSize,
  // );

  bindGroupC = (bindGroupC + 1) % 2;
}

function render(context: GPUCanvasContext, commandEncoder: GPUCommandEncoder) {
  if (!renderPipeline || !renderBindGroups) return;

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 0],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(renderPipeline);
  passEncoder.setBindGroup(0, renderBindGroups[(bindGroupC + 1) % 2]);
  passEncoder.draw(4);
  passEncoder.end();
}

async function readBuffers() {
  // if (!stagingBuffer || stagingBuffer.mapState != 'mapped') return;
  // await stagingBuffer.mapAsync(GPUMapMode.READ, 0, bufferSize);
  // const copyArrayBuffer = stagingBuffer.getMappedRange(0, bufferSize);
  // const data = copyArrayBuffer.slice();
  // stagingBuffer.unmap();
  // console.log(new Uint32Array(data));
}

(async () => {
  const adapter = await navigator.gpu.requestAdapter({
    featureLevel: 'compatibility',
  });

  if (!adapter) return;

  device = await adapter.requestDevice();
  context = canvas.getContext('webgpu') ?? undefined;

  if (!context) return;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device, format: presentationFormat });

  //

  uniformBuffer = device.createBuffer({
    size: 8 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  //

  const module = device.createShaderModule({
    code: computeShader,
  });

  pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'main',
    },
  });

  const renderModule = device.createShaderModule({ code: renderShaders });

  renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: renderModule,
      entryPoint: 'vertex',
    },
    fragment: {
      module: renderModule,
      entryPoint: 'fragment',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-strip',
    },
  });

  resizeCanvas();
})();

function resizeCanvas() {
  // const devicePixelRatio = window.devicePixelRatio;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (!device || !pipeline || !renderPipeline || !uniformBuffer) return;

  bufferSize = canvas.width * canvas.height * 4;

  input = device.createBuffer({
    size: bufferSize,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  output = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  stagingBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const data = new Uint32Array(bufferSize / 4);
  for (let i = 0; i < bufferSize / 4; i++) {
    const x = Math.floor(i / canvas.height);
    const y = i % canvas.height;
    if (y < canvas.height / 2 && x < 100) {
      data[i] = Math.floor(Math.random() * 2);
    } else {
      data[i] = 0;
    }
  }

  device.queue.writeBuffer(
    input,
    0,
    data.buffer,
    data.byteOffset,
    data.byteLength,
  );

  bindGroups = [
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: input,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: output,
          },
        },
      ],
    }),
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: output,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: input,
          },
        },
      ],
    }),
  ];

  renderBindGroups = [
    device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: output,
          },
        },
      ],
    }),
    device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: input,
          },
        },
      ],
    }),
  ];
}

function update() {
  requestAnimationFrame(update);
  if (!device || !context) return;

  const commandEncoder = device.createCommandEncoder();

  for (let i = 0; i < multistep; i++) {
    tick(commandEncoder);
  }

  render(context, commandEncoder);

  const commands = commandEncoder.finish();
  device.queue.submit([commands]);

  readBuffers();

  fpsc++;
}

requestAnimationFrame(update);

setInterval(() => {
  console.log(fpsc);
  fpsc = 0;
}, 1000);
