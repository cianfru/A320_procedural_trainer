import { useEffect } from 'react';
import { useSimStore } from './store/useSimStore';
import { PFD } from './displays/PFD';
import { ND } from './displays/ND';
import { EWD } from './displays/EWD';
import { SD } from './displays/SD';
import { FCU } from './displays/FCU';
import { ControlPanel } from './ui/ControlPanel';
import './App.css';

export default function App() {
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);

  // Run the clock from mount — invariant #1: tick-based from day one, even at
  // steady state. Stop the rAF loop on unmount.
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>A320 Procedural Trainer</h1>
        <p className="disclaimer">
          Not an approved or certified training device. Familiarisation and
          procedural rehearsal only.
        </p>
      </header>

      <div className="app-body">
        <ControlPanel />
        <main className="flight-deck">
          <FCU />
          <div className="displays-grid">
            <PFD />
            <ND />
            <EWD />
            <SD />
          </div>
        </main>
      </div>
    </div>
  );
}
