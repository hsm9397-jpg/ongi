"use client";
import { useRef, useState } from "react";

// 근막이완 소개 영상 (홈페이지 안에서 바로 재생)
export default function MethodVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="method-media method-video">
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls={playing}
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        aria-label="온기 근막이완 영상"
      />
      {!playing && (
        <button type="button" className="play" onClick={() => ref.current?.play()}>
          ▶ 영상 보기
        </button>
      )}
    </div>
  );
}
