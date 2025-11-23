# GPU Sand
A little simulation of some sand and water done using typescript + webgpu to render lots of pixels!

The movement of the particles is done using 2 ping pong buffers going through a compute shader. Then the rendering is done using a basic vertex and fragment shader each frame.

### Controls:
- 1-3 switch particle (sand, water, metal)
- Left mouse down - place particles
- Right mouse down - remove particles
