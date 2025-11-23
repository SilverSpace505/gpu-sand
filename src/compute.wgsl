
struct Uniforms {
    size: vec2<f32>,
    time: f32,
    mouse: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage, read> input: array<u32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;

fn isSolid(v: u32) -> bool {
    return v == 1 || v == 100 || v == 3;
}

fn isFallable(v: u32) -> bool {
    return v == 1 || v == 2;
}

fn getI(x: u32, y: u32) -> u32 {
    return x * u32(uniforms.size.y) + y;
}

fn getTile(x: u32, y: u32) -> u32 {
    if (x < 0 || x >= u32(uniforms.size.x)) {
        return 100;
    }
    if (y >= u32(uniforms.size.y)) {
        return 100;
    }
    if (y < 0) {
        return 100;
    }
    return input[getI(x, y)];
}

fn pcg_hash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn getR(x: u32, y: u32) -> u32 {
    // return x * 921 + y * 203 + u32(uniforms.time);
    // return 839 + u32(uniforms.time);
    return pcg_hash(x + y + u32(uniforms.time));
}

fn airToSand(x: u32, y: u32, above: u32, below: u32, left: u32, right: u32, bottomleft: u32, bottomright: u32) -> bool {
    if (above == 1) {
        return true;
    }
    if (below == 0 && left == 1 && isSolid(bottomleft)) {
        return true;
    }
    if (below == 0 && right == 1 && isSolid(bottomright)) {
        return true;
    }
    return false;
}

fn airToWater(x: u32, y: u32, above: u32, left: u32, right: u32, bottomleft: u32, bottomright: u32, topright: u32, topleft: u32) -> bool {
    if (above == 2) {
        return true;
    }

    let dirright = getR(x + 1, y) % 2;
    let dirleft = getR(x - 1, y) % 2;

    if (dirright == 0 && right == 2 && bottomright != 0 && topright != 1 && !(left == 2 && dirleft == 1 && bottomleft != 0)) {
        return true;
    }
    
    if (dirleft == 1 && left == 2 && bottomleft != 0 && topleft != 1 && !(right == 2 && dirright == 0 && bottomright != 0)) {
        return true;
    }
    return false;
}

@compute @workgroup_size(8, 8)
fn main(
  @builtin(global_invocation_id)
  global_id : vec3<u32>,
) {
    if (global_id.x >= u32(uniforms.size.x)) {
        return;
    }
    if (global_id.y >= u32(uniforms.size.y)) {
        return;
    }
    if (global_id.x * u32(uniforms.size.y) + global_id.y >= arrayLength(&output)) {
        return;
    }

    // let x = floor(f32(global_id.x) / uniforms.size.y);
    // let y = f32(global_id.x % u32(uniforms.size.y));

    let x = global_id.x;
    let y = global_id.y;

    let i = getI(x, y);
    
    let v=  input[i];
    var tv = v;

    let below = getTile(x, y + 1);
    let left = getTile(x - 1, y);
    let right = getTile(x + 1, y);

    if (v == 0) {
        let bottomleft = getTile(x - 1, y + 1);
        let bottomright = getTile(x + 1, y + 1);
        let topleft = getTile(x - 1, y - 1);
        let topright = getTile(x + 1, y - 1);
        let above = getTile(x, y - 1);

        if (airToSand(x, y, above, below, left, right, bottomleft, bottomright)) {
            tv = 1;
        } else if (airToWater(x, y, above, left, right, bottomleft, bottomright, topleft, topright)) {
            tv = 2;
        }
    }

    if (v == 1) {
        if (below == 0) {
            tv = 0;
        } else if (below == 2) {
            tv = 2;
        } else {
            let bottomright = getTile(x + 1, y + 1);
            let bottomleft = getTile(x - 1, y + 1);
            if (right == 0 && bottomright == 0) {
                tv = 0;
            }
            if (left == 0 && bottomleft == 0) {
                tv = 0;
            }
        }

        // let belowbelow = getTile(x, y + 2);
        // if (below == 0) {
        //     tv = 0;
        // } else if (below == 2 && belowbelow != 0) {
        //     tv = 2;
        // } else {
        //     let bottomright = getTile(x + 1, y + 1);
        //     let bottomleft = getTile(x - 1, y + 1);
        //     if (right == 0 && bottomright == 0) {
        //         tv = 0;
        //     }
        //     if (left == 0 && bottomleft == 0) {
        //         tv = 0;
        //     }
        // }
    }

    if (v == 2) {
        let above = getTile(x, y - 1);
        if (above == 1) {
            tv = 1;
        } else if (below == 0) {
            tv = 0;
        } else {
            let dir = getR(x, y) % 2;

            let topleft = getTile(x - 1, y - 1);
            let leftleft = getTile(x - 2, y);
            let bottomleftleft = getTile(x - 2, y + 1);
            let dirleftleft = getR(x - 2, y) % 2;
            if (dir == 0 && left == 0 && !isFallable(topleft) && !(leftleft == 2 && dirleftleft == 1 && bottomleftleft != 0)) {
                tv = 0;
            }

            let topright = getTile(x + 1, y - 1);
            let rightright = getTile(x + 2, y);
            let bottomrightright = getTile(x + 2, y + 1);
            let dirrightright = getR(x + 2, y) % 2;
            if (dir == 1 && right == 0 && !isFallable(topright) && !(rightright == 2 && dirrightright == 0 && bottomrightright != 0)) {
                tv = 0;
            }
        }
    }

    if (uniforms.mouse.z != 0) {
        let d  = sqrt(pow(uniforms.mouse.x - f32(x), 2) + pow(uniforms.mouse.y - f32(y), 2));
        
        if (uniforms.mouse.z == 1 && d < 20 && (y % 2 == 0 || uniforms.mouse.w == 3)) {
            tv = u32(uniforms.mouse.w);
        }
        if (uniforms.mouse.z == 2 && d < 20) {
            tv = 0;
        }
    }
    
    output[i] = tv;
    // output[i] = above;
    // output[i] = u32(y);
}
