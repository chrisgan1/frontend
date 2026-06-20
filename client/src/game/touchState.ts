// Shared mutable state written by TouchControls, read by ThreeScene each frame.
export const touchState = {
  moveDx: 0,  // -1..1 left/right
  moveDz: 0,  // -1..1 forward/back
  lookYaw: 0,   // accumulated yaw delta (reset after each frame)
  lookPitch: 0, // accumulated pitch delta (reset after each frame)
  shoot: false, // set true by tap; ThreeScene resets after processing
  taunt: false, // set true by taunt button
  useMove: false, // set true by "RUSH" button for props
};
