export const formatShutterSpeed = (speed) => {
  if (speed >= 1) {
    return `${speed}秒`;
  } else {
    const denominator = Math.round(1/speed);
    return `1/${denominator}`;
  }
};