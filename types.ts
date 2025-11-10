
export interface VideoFile {
  file: File;
  duration: number;
  url: string;
}

export interface MontageClip {
  video: VideoFile;
  startTime: number;
  duration: number;
}

export interface MontagePlan {
  clips: MontageClip[];
  totalDuration: number;
}
