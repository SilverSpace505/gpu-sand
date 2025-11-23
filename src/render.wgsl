
struct Uniforms {
    size: vec2<f32>,
    time: f32,
    mouse: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage, read> input: array<u32>;

fn getI(x: f32, y: f32) -> u32 {
    return u32(x) * u32(uniforms.size.y) + u32(y);
}

@vertex
fn vertex(
    @builtin(vertex_index) VertexIndex : u32,
) -> @builtin(position) vec4f {
    var pos = array<vec2f, 4>(
        vec2(1.0, 1.0),
        vec2(-1.0, 1.0),    
        vec2(1.0, -1.0),
        vec2(-1.0, -1.0),
    );

    return vec4f(pos[VertexIndex], 0.0, 1.0);
}

@fragment 
fn fragment(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4f {
    let i = getI(fragCoord.x, fragCoord.y);
    let v = f32(input[i]);
    var c = vec4(0.0, 0.0, 0.0, 0.0);
    if (v == 1) {
        c = vec4(1.0, 1.0, 0.0, 0.0);
    }
    if (v == 2) {
        c = vec4(0.0, 0.0, 1.0, 0.0);
    }
    if (v == 3) {
        c = vec4(0.5, 0.5, 0.5, 0.0);
    }
    return c;
}