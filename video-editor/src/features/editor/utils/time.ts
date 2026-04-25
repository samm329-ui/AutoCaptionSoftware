export const frameToTimeString = (
  { frame }: { frame: number },
  { fps }: { fps: number }
): string => {
  // Calculate the total time in seconds
  const totalSeconds = frame / fps;

  // Calculate hours, minutes, seconds, and milliseconds
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);

  // Format the time string based on whether hours are zero or not
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const timeToString = ({ time }: { time: number }): string => {
  // Calculate the total time in seconds
  const totalSeconds = time / 1000;

  // Calculate hours, minutes, seconds, and milliseconds
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);

  // Format the time string based on whether hours are zero or not
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const getCurrentTime = () => {
  const currentTimeElement = document.getElementById("video-current-time");
  const currentTimeSeconds = currentTimeElement
    ? Number.parseFloat(
        currentTimeElement.getAttribute("data-current-time") ?? "0"
      )
    : 0;
  const currentTimeMiliseconds = currentTimeSeconds * 1000;
  return currentTimeMiliseconds;
};

/**
 * Safely gets the current frame from a player reference
 * @param playerRef - The player reference (either direct PlayerRef or React.RefObject)
 * @returns The current frame as a finite number, or 0 if invalid
 */
export const getSafeCurrentFrame = (playerRef: PlayerRef | React.RefObject<PlayerRef> | null | undefined): number => {
  try {
    // Get the actual PlayerRef from either format
    let player: PlayerRef | null = null;
    
    if (!playerRef) {
      return 0;
    }
    
    // Direct PlayerRef
    if ('addEventListener' in playerRef) {
      player = playerRef;
    }
    // React.RefObject format
    else if (playerRef.current) {
      player = playerRef.current;
    }
    
    if (!player) {
      return 0;
    }

    const frame = player.getCurrentFrame();

    // Check if frame is a valid finite number
    if (typeof frame !== "number" || !Number.isFinite(frame)) {
      console.warn("getCurrentFrame returned non-finite value:", frame);
      return 0;
    }

    // Ensure frame is non-negative
    return Math.max(0, frame);
  } catch (error) {
    // Silently return 0 for errors (happens when player isn't ready)
    return 0;
  }
};
