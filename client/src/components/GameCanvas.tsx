import { useEffect, useRef } from 'react';
import { ThreeScene } from '../game/ThreeScene';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
    sceneRef.current = new ThreeScene(containerRef.current);
    return () => {
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
