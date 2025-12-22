import { useState, useEffect, useRef, useCallback } from 'react';
import ShikiHighlighter from 'react-shiki';

const SAMPLE_CODE = `import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}`;

type PlaybackState = 'idle' | 'playing' | 'paused' | 'complete';

export function StreamingDemo() {
  const [displayedCode, setDisplayedCode] = useState('');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [speed, setSpeed] = useState(30); // characters per interval
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStreamInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const streamCode = useCallback(() => {
    clearStreamInterval();

    intervalRef.current = setInterval(() => {
      if (indexRef.current >= SAMPLE_CODE.length) {
        clearStreamInterval();
        setPlaybackState('complete');
        return;
      }

      // Add characters in chunks for more realistic streaming
      const chunkSize = Math.max(1, Math.floor(speed / 10));
      const nextIndex = Math.min(indexRef.current + chunkSize, SAMPLE_CODE.length);
      setDisplayedCode(SAMPLE_CODE.slice(0, nextIndex));
      indexRef.current = nextIndex;
    }, 50);
  }, [speed, clearStreamInterval]);

  const handlePlay = useCallback(() => {
    if (playbackState === 'idle' || playbackState === 'complete') {
      indexRef.current = 0;
      setDisplayedCode('');
    }
    setPlaybackState('playing');
    streamCode();
  }, [playbackState, streamCode]);

  const handlePause = useCallback(() => {
    clearStreamInterval();
    setPlaybackState('paused');
  }, [clearStreamInterval]);

  const handleReset = useCallback(() => {
    clearStreamInterval();
    indexRef.current = 0;
    setDisplayedCode('');
    setPlaybackState('idle');
  }, [clearStreamInterval]);

  useEffect(() => {
    return () => clearStreamInterval();
  }, [clearStreamInterval]);

  // Restart streaming when speed changes if currently playing
  useEffect(() => {
    if (playbackState === 'playing') {
      streamCode();
    }
  }, [speed, playbackState, streamCode]);

  const isPlaying = playbackState === 'playing';
  const canPlay = playbackState !== 'playing';
  const canPause = playbackState === 'playing';
  const canReset = playbackState !== 'idle';

  return (
    <div className="streaming-demo">
      <div className="demo-header">
        <h3>Streaming Code Demo</h3>
        <p className="demo-description">
          Simulates AI-generated code streaming with real-time syntax highlighting
        </p>
      </div>

      <div className="demo-controls">
        <div className="playback-controls">
          {canPlay ? (
            <button onClick={handlePlay} className="control-btn play-btn">
              <PlayIcon />
              <span>{playbackState === 'complete' ? 'Replay' : 'Play'}</span>
            </button>
          ) : (
            <button onClick={handlePause} className="control-btn pause-btn">
              <PauseIcon />
              <span>Pause</span>
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={!canReset}
            className="control-btn reset-btn"
          >
            <ResetIcon />
            <span>Reset</span>
          </button>
        </div>

        <div className="speed-control">
          <label htmlFor="speed-slider">Speed</label>
          <input
            id="speed-slider"
            type="range"
            min="5"
            max="100"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          <span className="speed-value">{speed}</span>
        </div>
      </div>

      <div className="code-container">
        {displayedCode ? (
          <ShikiHighlighter language="tsx" theme="github-dark" delay={100}>
            {displayedCode}
          </ShikiHighlighter>
        ) : (
          <div className="placeholder">
            <span>Click Play to start streaming</span>
          </div>
        )}
      </div>

      <div className="demo-status">
        <span className={`status-indicator ${playbackState}`} />
        <span className="status-text">
          {playbackState === 'idle' && 'Ready'}
          {playbackState === 'playing' && 'Streaming...'}
          {playbackState === 'paused' && 'Paused'}
          {playbackState === 'complete' && 'Complete'}
        </span>
        <span className="char-count">
          {displayedCode.length} / {SAMPLE_CODE.length} chars
        </span>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
    </svg>
  );
}

export default StreamingDemo;
